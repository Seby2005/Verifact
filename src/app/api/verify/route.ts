import { createClient } from '@/lib/supabase/server';
import { verifyContent } from '@/lib/verification/orchestrator';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { saveVerification, reserveUsageSlot, releaseUsageSlot } from '@/lib/verification/db-operations';
import { checkAnonymousLimit } from '@/lib/usage/anonymous-limit';
import type { Language, InputType, VerifyAPIError } from '@/types/verification';
import { extractArticleText, isValidHttpUrl, UrlExtractionError } from '@/lib/verification/url-extract';

const MAX_TEXT_LENGTH = 2000;

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

  // URL input is validated as a URL; its article text is fetched separately
  // before this point, so the length rules below do not apply to it.
  if (b.inputType === 'url') {
    if (typeof b.text !== 'string' || !isValidHttpUrl(b.text)) {
      return { success: false, error: 'Link-ul introdus nu este valid.' };
    }
    return {
      success: true,
      data: { text: b.text.trim(), language: 'ro', isPublic: Boolean(b.isPublic), inputType: 'url' },
    };
  }

  if (typeof b.text !== 'string' || b.text.trim().length < 10) {
    return { success: false, error: 'Textul trebuie sa aiba minim 10 caractere' };
  }

  // Long input is truncated rather than rejected: pasting a whole article is a
  // normal thing to do, and the first 2000 characters carry the claim in
  // practice. Rejecting it outright just made the tool look broken.
  const text = b.text.length > MAX_TEXT_LENGTH ? b.text.slice(0, MAX_TEXT_LENGTH) : b.text;

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
      text: text.trim(),
      language,
      isPublic: Boolean(b.isPublic),
      inputType,
    },
  };
}

export const dynamic = 'force-dynamic';

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

  // 3. Auth check and usage limits.
  // Authenticated: atomically reserve a monthly usage slot (see
  // db-operations.ts) — this checks the limit and consumes the slot in one
  // Postgres statement, closing the race where two concurrent requests could
  // both read "under limit" before either write landed. The slot is released
  // below if the request doesn't end up producing a saved report.
  // Anonymous: best-effort cap by IP+User-Agent hash. Not fully atomic (see
  // anonymous-limit.ts for its documented limitations), but the anonymous
  // cap is low (3 / 30 days) and isn't the billing-relevant limit, so the
  // remaining race window is an accepted tradeoff rather than one worth a
  // second RPC.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let usageReserved = false;
  let anonymousHash: string | undefined;

  if (user) {
    const reservation = await reserveUsageSlot(supabase);
    if (!reservation.allowed) {
      const err: VerifyAPIError = {
        success: false,
        error: `Ai atins limita de ${reservation.limit} verificari pentru aceasta luna. Upgradeaza la Pro pentru mai multe.`,
        code: 'USAGE_LIMIT',
      };
      return Response.json(err, { status: 403 });
    }
    usageReserved = true;
  } else {
    const userAgent = request.headers.get('user-agent') ?? 'unknown';
    const anonymousCheck = await checkAnonymousLimit(ip, userAgent);
    anonymousHash = anonymousCheck.hash;
    if (!anonymousCheck.allowed) {
      const err: VerifyAPIError = {
        success: false,
        error: `Ai atins limita de ${anonymousCheck.limit} verificari gratuite. Creeaza un cont pentru mai multe.`,
        code: 'USAGE_LIMIT',
      };
      return Response.json(err, { status: 403 });
    }
  }

  // 3b. For URL input, fetch the article and verify its text rather than the
  //     bare link, which the search layers could do nothing with.
  let claimText = validatedInput.text;
  if (validatedInput.inputType === 'url') {
    try {
      claimText = await extractArticleText(validatedInput.text);
    } catch (error) {
      const err: VerifyAPIError = {
        success: false,
        error:
          error instanceof UrlExtractionError
            ? error.message
            : 'Nu am putut citi conținutul de la acest link.',
        code: 'URL_UNREADABLE',
      };
      return Response.json(err, { status: 422 });
    }
  }

  // 4. Run verification algorithm
  try {
    const report = await verifyContent({
      text: claimText,
      language: validatedInput.language,
      type: validatedInput.inputType,
      inputType: validatedInput.inputType,
      isPublic: validatedInput.isPublic,
      userId: user?.id ?? undefined,
    });

    // 5. Save to Supabase. A cache hit did no new work, so any reserved slot
    //    is released instead of charging the user's monthly quota.
    if (report.fromCache) {
      if (usageReserved) await releaseUsageSlot(supabase);
      return Response.json({ success: true, report }, { status: 200 });
    }

    const saved = await saveVerification(report, supabase, anonymousHash);
    if (!saved && usageReserved) {
      // The verification ran (and cost real API calls) but the record
      // didn't persist — release the reservation so the user isn't charged
      // for a report that won't show up in their history.
      await releaseUsageSlot(supabase);
    }

    return Response.json({ success: true, report }, { status: 200 });

  } catch (error) {
    // The reservation was consumed for a verification that never completed
    // — release it rather than charging the user's quota for nothing.
    if (usageReserved) {
      await releaseUsageSlot(supabase);
    }

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
