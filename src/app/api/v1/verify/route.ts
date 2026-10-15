import { verifyContent } from '@/lib/verification/orchestrator';
import { saveVerification } from '@/lib/verification/db-operations';
import { validateVerifyInput } from '@/lib/verification/validate-input';
import { extractArticleText, UrlExtractionError } from '@/lib/verification/url-extract';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { corsHeaders, handlePreflight } from '@/lib/api/cors';
import { authenticateCaller, reserveSlot, releaseSlot, type Caller } from './authenticate';
import type { VerifyAPIError } from '@/types/verification';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

// Non-streaming programmatic sibling of /api/verify. Same verification engine,
// but the whole result comes back as one JSON body (see docs/api/CONTRACT_v1.md)
// because API clients and the Chrome extension want a single response, not the
// website's per-layer progress stream.

function jsonError(
  request: Request,
  status: number,
  code: VerifyAPIError['code'],
  error: string
): Response {
  const body: VerifyAPIError = { success: false, error, code };
  return Response.json(body, { status, headers: corsHeaders(request) });
}

function nextMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handlePreflight(request);
}

export async function POST(request: Request): Promise<Response> {
  // 1. Parse + validate input (shared with /api/verify so the rules can't drift).
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(request, 400, 'INPUT_INVALID', 'Corp cerere JSON invalid');
  }

  const validation = validateVerifyInput(body);
  if (!validation.success) {
    return jsonError(request, 400, 'INPUT_INVALID', validation.error);
  }
  const input = validation.data;

  // 2. Cheap per-IP throttle before any auth/DB work, to bound abuse and the
  //    cost of the token lookups below.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const ipLimit = await checkRateLimit(`v1:ip:${ip}`, 30, 60 * 1000);
  if (!ipLimit.success) {
    return jsonError(request, 429, 'RATE_LIMIT', 'Prea multe cereri. Incearca din nou in cateva minute.');
  }

  // 3. Resolve the caller (API key / JWT / anonymous).
  const caller: Caller = await authenticateCaller(request);
  if (caller.kind === 'invalid') {
    return jsonError(request, 401, 'AUTH_INVALID', 'Token de autentificare invalid sau expirat.');
  }
  if (caller.kind === 'forbidden') {
    return jsonError(request, 403, 'FORBIDDEN', 'Cheia API nu are acces la aceasta resursa.');
  }

  // 3b. A generous per-key throttle for business keys (higher than the shared
  //     per-IP one, since a server calls from a single IP).
  if (caller.kind === 'apikey') {
    const keyLimit = await checkRateLimit(`v1:key:${caller.userId}`, 60, 60 * 1000);
    if (!keyLimit.success) {
      return jsonError(request, 429, 'RATE_LIMIT', 'Prea multe cereri. Incearca din nou in cateva minute.');
    }
  }

  // 4. Reserve a monthly slot (atomic where metered). Released below if the run
  //    produces no saved report.
  const slot = await reserveSlot(caller);
  if (!slot.allowed) {
    const msg =
      caller.kind === 'anonymous'
        ? `Ai atins limita de ${slot.freeLimit ?? 3} verificari gratuite. Creeaza un cont pentru mai multe.`
        : slot.tier === 'free'
          ? `Ai atins limita de ${slot.freeLimit ?? 3} verificări gratuite pentru luna aceasta. Treci la Pro pentru mult mai multe.`
          : 'Ai atins limita de verificări pentru luna aceasta. Se resetează la începutul lunii viitoare.';
    return jsonError(request, 403, 'USAGE_LIMIT', msg);
  }

  const userId = caller.kind === 'user' || caller.kind === 'apikey' ? caller.userId : undefined;

  // 5. For URL input, fetch the article; the search layers can't use a bare link.
  let claimText = input.text;
  if (input.inputType === 'url') {
    try {
      claimText = await extractArticleText(input.text);
    } catch (error) {
      await releaseSlot(caller);
      return jsonError(
        request,
        422,
        'URL_UNREADABLE',
        error instanceof UrlExtractionError ? error.message : 'Nu am putut citi conținutul de la acest link.'
      );
    }
  }

  // 6. Run the verification to completion, then respond once.
  try {
    const report = await verifyContent({
      text: claimText,
      language: input.language,
      type: input.inputType,
      inputType: input.inputType,
      isPublic: input.isPublic,
      userId,
    });

    // 7. Save. A cache hit did no new work, so refund the reserved slot rather
    //    than charging the quota; a save failure means no history row, so refund
    //    then too — but still return the report the caller waited for.
    if (report.fromCache) {
      await releaseSlot(caller);
    } else {
      const saved = await saveVerification(report, undefined, slot.anonymousHash);
      if (!saved) await releaseSlot(caller);
    }

    return Response.json(
      {
        success: true,
        report,
        usage: { tier: slot.tier, remaining: slot.remaining, resetsAt: nextMonthIso() },
      },
      { status: 200, headers: corsHeaders(request) }
    );
  } catch (error) {
    await releaseSlot(caller);

    if (error instanceof Error && error.message === 'ALL_LAYERS_FAILED') {
      return jsonError(
        request,
        502,
        'ALL_LAYERS_FAILED',
        'Nu am putut accesa sursele de verificare. Te rugam sa incerci din nou.'
      );
    }
    logger.error('Unexpected error in /api/v1/verify', { service: 'api/v1/verify', error });
    return jsonError(request, 500, 'SERVER_ERROR', 'A aparut o eroare interna. Te rugam sa incerci din nou.');
  }
}
