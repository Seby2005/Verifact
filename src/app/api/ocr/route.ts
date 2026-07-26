import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { processImageOCR } from '@/lib/ocr/vision';
import { CircuitOpenError } from '@/lib/utils/circuit-breaker';

interface OCRRequest {
  image: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate Limiting per IP
    const clientIp = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const rateCheck = await checkRateLimit(`ocr:${clientIp}`, 10, 60 * 1000);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ai depășit limita de solicitări. Te rugăm să aștepți un minut.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    // 2. Parse request body
    const body: OCRRequest = await req.json();
    const { image, mimeType } = body;

    // 3. Input validation
    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Imaginea transmisă este invalidă.',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Format nepermis. Acceptăm doar JPEG, PNG și WEBP.',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Check size limit (10MB)
    const imageBuffer = Buffer.from(image, 'base64');
    if (imageBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: 'Imaginea este prea mare. Maximul permis este de 10MB.',
          code: 'IMAGE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // 4. Process OCR
    const ocrResult = await processImageOCR(image);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      language: ocrResult.language,
      processingTime,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : '';

    if (errMessage === 'NO_TEXT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          error: 'Nu am detectat text în această imagine. Încearcă un screenshot mai clar sau introdu textul manual.',
          code: 'NO_TEXT_FOUND',
        },
        { status: 200 }
      );
    }

    if (errMessage.includes('abort') || errMessage.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Procesarea a durat prea mult. Încearcă o imagine mai simplă.',
          code: 'API_ERROR',
        },
        { status: 504 }
      );
    }

    if (error instanceof CircuitOpenError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Serviciul de extragere text este temporar indisponibil. Te rugăm să încerci din nou peste câteva minute.',
          code: 'SERVICE_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    console.error('OCR processing error encountered');

    return NextResponse.json(
      {
        success: false,
        error: 'A apărut o eroare la procesarea imaginii. Te rugăm să încerci din nou.',
        code: 'API_ERROR',
      },
      { status: 500 }
    );
  }
}
