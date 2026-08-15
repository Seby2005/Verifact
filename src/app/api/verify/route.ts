import { createClient } from '@/lib/supabase/server';
import { verifyContent } from '@/lib/verification/orchestrator';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { validateTurnstileToken } from '@/lib/security/turnstile';
import { saveVerification, reserveUsageSlot, releaseUsageSlot } from '@/lib/verification/db-operations';
import { checkAnonymousLimit } from '@/lib/usage/anonymous-limit';
import { hasUnlimitedUsage } from '@/lib/usage/limits';
import type { Language, InputType, VerifyAPIError, VerifyStreamEvent } from '@/types/verification';
import { extractArticleText, isValidHttpUrl, UrlExtractionError } from '@/lib/verification/url-extract';
import { logger } from '@/lib/utils/logger';

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
    const urlLang: Language = b.language === 'fr' ? 'fr' : b.language === 'en' ? 'en' : 'ro';
    return {
      success: true,
      data: { text: b.text.trim(), language: urlLang, isPublic: Boolean(b.isPublic), inputType: 'url' },
    };
  }

  if (typeof b.text !== 'string' || b.text.trim().length < 10) {
    return { success: false, error: 'Textul trebuie sa aiba minim 10 caractere' };
  }

  // Long input is truncated rather than rejected: pasting a whole article is a
  // normal thing to do, and the first 2000 characters carry the claim in
  // practice. Rejecting it outright just made the tool look broken.
  const text = b.text.length > MAX_TEXT_LENGTH ? b.text.slice(0, MAX_TEXT_LENGTH) : b.text;

  const validLanguages: Language[] = ['ro', 'en', 'fr', 'unknown'];
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

  const rateLimitResult = await checkRateLimit(`verify:${ip}`, 10, 60 * 1000);
  if (!rateLimitResult.success) {
    const err: VerifyAPIError = {
      success: false,
      error: 'Prea multe cereri. Incearca din nou in cateva minute.',
      code: 'RATE_LIMIT',
    };
    return Response.json(err, { status: 429 });
  }

  // 2b. Bot protection via Cloudflare Turnstile
  const rawBody = body as Record<string, unknown>;
  const turnstileToken =
    (typeof rawBody.turnstileToken === 'string' ? rawBody.turnstileToken : undefined) ??
    (typeof rawBody['cf-turnstile-response'] === 'string' ? rawBody['cf-turnstile-response'] : undefined);

  const turnstileResult = await validateTurnstileToken(turnstileToken, ip);
  if (!turnstileResult.success) {
    const err: VerifyAPIError = {
      success: false,
      error: turnstileResult.error ?? 'Verificarea de securitate a eșuat.',
      code: 'INPUT_INVALID',
    };
    return Response.json(err, { status: 403 });
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let usageReserved = false;
  let anonymousHash: string | undefined;

  if (user) {
    // Admins are uncapped: skip the reservation entirely so their count never
    // increments and they can test without limit. Any read hiccup falls through
    // to the normal metered path, so this can only ever grant, never deny.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tier')
      .eq('id', user.id)
      .single();
    const typedProfile = profile as { role?: string | null; tier?: string | null } | null;
    const isAdmin = hasUnlimitedUsage(typedProfile?.role, user.email);

    if (!isAdmin) {
      const reservation = await reserveUsageSlot(supabase);
      if (!reservation.allowed) {
        // The free cap (3) is advertised, so naming it here is fine and drives
        // the upsell. The Pro cap is deliberately never printed anywhere, so
        // paid tiers get a number-free message.
        const isFree = (typedProfile?.tier ?? 'free') === 'free';
        const err: VerifyAPIError = {
          success: false,
          error: isFree
            ? 'Ai atins limita de 3 verificări gratuite pentru luna aceasta. Treci la Pro pentru mult mai multe.'
            : 'Ai atins limita de verificări pentru luna aceasta. Se resetează la începutul lunii viitoare.',
          code: 'USAGE_LIMIT',
        };
        return Response.json(err, { status: 403 });
      }
      usageReserved = true;
    }
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

  // 4. Run the verification, streaming per-layer progress to the client as
  //    newline-delimited JSON: many `progress` events (one per layer as it
  //    settles, plus the AI analysis), then a single terminal `report` or
  //    `error`. The pre-flight failures above already returned plain JSON with
  //    a real status code; once work starts the response is a 200 stream, so
  //    any failure from here on travels as an in-band `error` event.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: VerifyStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client went away mid-stream — stop enqueuing.
          open = false;
        }
      };

      try {
        const report = await verifyContent(
          {
            text: claimText,
            language: validatedInput.language,
            type: validatedInput.inputType,
            inputType: validatedInput.inputType,
            isPublic: validatedInput.isPublic,
            userId: user?.id ?? undefined,
          },
          (ev) =>
            send({ type: 'progress', step: ev.step, status: ev.status, count: ev.count, error: ev.error })
        );

        // 5. Save to Supabase. A cache hit did no new work, so any reserved slot
        //    is released instead of charging the user's monthly quota; a save
        //    failure means the report won't appear in history, so release then
        //    too — but still hand the reader the report they waited for.
        if (report.fromCache) {
          if (usageReserved) await releaseUsageSlot(supabase);
        } else {
          const saved = await saveVerification(report, supabase, anonymousHash);
          if (!saved && usageReserved) await releaseUsageSlot(supabase);
        }

        send({ type: 'report', report });
      } catch (error) {
        // The reservation was consumed for a verification that never completed
        // — release it rather than charging the user's quota for nothing.
        if (usageReserved) await releaseUsageSlot(supabase);

        if (error instanceof Error && error.message === 'ALL_LAYERS_FAILED') {
          send({
            type: 'error',
            code: 'ALL_LAYERS_FAILED',
            error: 'Nu am putut accesa sursele de verificare. Te rugam sa incerci din nou.',
          });
        } else {
          logger.error('Unexpected error in /api/verify', { service: 'api/verify', error });
          send({
            type: 'error',
            code: 'SERVER_ERROR',
            error: 'A aparut o eroare interna. Te rugam sa incerci din nou.',
          });
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
