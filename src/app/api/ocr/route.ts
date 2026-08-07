import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { sniffImageType } from '@/lib/utils/image-type';
import { processOCR } from '@/lib/ocr';
import { CircuitOpenError } from '@/lib/utils/circuit-breaker';
import { logger } from '@/lib/utils/logger';
import type { OcrRequest } from '@/types/verification';

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
    const body: OcrRequest = await req.json();
    const { imageBase64, mimeType } = body;

    // 3. Input validation
    if (!imageBase64 || typeof imageBase64 !== 'string') {
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
    const imageBuffer = Buffer.from(imageBase64, 'base64');
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

    // The mimeType checked above is only the sender's claim. Confirm the actual
    // bytes are one of the formats we accept before spending an OCR call on
    // them — an attacker can label anything (an SVG, HTML, a random blob)
    // 'image/png', but the magic bytes give it away.
    if (sniffImageType(imageBuffer) === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fișierul transmis nu este o imagine validă (JPEG, PNG sau WEBP).',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // 4. Process OCR
    const ocrResult = await processOCR(imageBase64);

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

    logger.error('Unexpected error in /api/ocr', { service: 'api/ocr', error });

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
