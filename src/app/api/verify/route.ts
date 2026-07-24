import { createClient } from '@/lib/supabase/server';
import { verifyContent } from '@/lib/verification/orchestrator';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { saveVerification, checkUsageLimit, incrementUsageCount } from '@/lib/verification/db-operations';
import type { Language, InputType, VerifyAPIError } from '@/types/verification';

// Input validation
interface ValidatedInput {
  text: string;
  language: Language;
  isPublic: boolean;
  inputType: InputType;
}

function validateVerifyInput(body: unknown): { success: true; data: ValidatedInput } | { success: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { success: false, error: 'Corp cerere invalid' };
  }

  const b = body as Record<string, unknown>;

  // The client (and the VerifyRequest type) sends `inputText`. `text` is kept
  // as an accepted alias so direct API consumers written against the older
  // field name keep working.
  const rawText = typeof b.inputText === 'string' ? b.inputText
    : typeof b.text === 'string' ? b.text
    : null;

  if (rawText === null || rawText.trim().length < 10) {
    return { success: false, error: 'Textul trebuie sa aiba minim 10 caractere' };
  }

  if (rawText.length > 2000) {
    return { success: false, error: 'Textul nu poate depasi 2000 de caractere' };
  }

  const validLanguages: Language[] = ['ro', 'en', 'unknown'];
  const language: Language = validLanguages.includes(b.language as Language)
    ? (b.language as Language)
    : 'unknown';

  const validInputTypes: InputType[] = ['text', 'screenshot', 'url'];
  const inputType: InputType = validInputTypes.includes(b.inputType as InputType)
    ? (b.inputType as InputType)
    : 'text';

  return {
    success: true,
    data: {
      text: rawText.trim(),
      language,
      isPublic: Boolean(b.isPublic),
      inputType,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const err: VerifyAPIError = {
      success: false,
      error: 'Corp cerere JSON invalid',
      code: 'INPUT_INVALID',
    };
    return Response.json(err, { status: 400 });
  }

  const validation = validateVerifyInput(body);
  if (!validation.success) {
    const err: VerifyAPIError = {
      success: false,
      error: validation.error,
      code: 'INPUT_INVALID',
    };
    return Response.json(err, { status: 400 });
  }

  const { data: validatedInput } = validation;

  // 2. Rate limiting per IP (10 req/min)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const rateLimitResult = checkRateLimit(`verify:${ip}`, 10, 60 * 1000);
  if (!rateLimitResult.success) {
    const err: VerifyAPIError = {
      success: false,
      error: 'Prea multe cereri. Incearca din nou in cateva minute.',
      code: 'RATE_LIMIT',
    };
    return Response.json(err, { status: 429 });
  }

  // 3. Auth check and usage limits
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const limitCheck = await checkUsageLimit(user.id, supabase);
    if (!limitCheck.allowed) {
      const err: VerifyAPIError = {
        success: false,
        error: `Ai atins limita de ${limitCheck.limit} verificari pentru aceasta luna. Upgradeaza la Pro pentru mai multe.`,
        code: 'USAGE_LIMIT',
      };
      return Response.json(err, { status: 403 });
    }
  }

  // 4. Run verification algorithm
  try {
    const report = await verifyContent({
      text: validatedInput.text,
      language: validatedInput.language,
      type: validatedInput.inputType,
      inputType: validatedInput.inputType,
      isPublic: validatedInput.isPublic,
      userId: user?.id ?? undefined,
    });

    // 5. Save to Supabase (non-blocking for cache hits)
    if (!report.fromCache) {
      await saveVerification(report, supabase);
      if (user) {
        await incrementUsageCount(user.id, supabase);
      }
    }

    // Shape must match VerifyAPIResponse — the client reads `reportId` to hand
    // over to the progress tracker.
    return Response.json(
      {
        success: true,
        reportId: report.id,
        verdict: report.verdict,
        score: report.score,
        report,
      },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof Error && error.message === 'ALL_LAYERS_FAILED') {
      const err: VerifyAPIError = {
        success: false,
        error: 'Nu am putut accesa sursele de verificare. Te rugam sa incerci din nou.',
        code: 'ALL_LAYERS_FAILED',
      };
      return Response.json(err, { status: 503 });
    }

    console.error('[/api/verify] Unexpected error:', error);
    const err: VerifyAPIError = {
      success: false,
      error: 'A aparut o eroare interna. Te rugam sa incerci din nou.',
      code: 'SERVER_ERROR',
    };
    return Response.json(err, { status: 500 });
  }
}
