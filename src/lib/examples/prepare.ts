import { verifyContent } from '@/lib/verification/orchestrator';
import { createContentHash } from '@/lib/utils/hash';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { logger } from '@/lib/utils/logger';
import { getCandidates, type ExamplesLocale } from './trending';

const LOCALES: readonly ExamplesLocale[] = ['ro', 'en', 'fr'];

/** How many claims the homepage row shows; the job stops once that many are ready. */
const ROW_SIZE = 3;

/**
 * How many verifications one run starts per language. They run side by side
 * and each takes up to ~50s, so this keeps a run inside the 60s function limit
 * and bounds what one run can spend. The job runs hourly; a row fills over a
 * run or two.
 */
const PER_RUN = 2;

/**
 * How often the same claim may be tried in a day. A verification that ends
 * degraded (a source layer down) is not cached, so without this the job would
 * retry it every hour.
 */
const ATTEMPTS_PER_DAY = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PrepareReport {
  /** Per language: claims verified this run, and how many of the row are ready. */
  [locale: string]: { verified: number; failed: number; ready: number };
}

/**
 * Verifies the homepage suggestions ahead of the reader, so clicking one opens
 * a finished report instead of starting a 30-second verification.
 *
 * Walks each language's lined-up claims in the order they will be shown and
 * verifies the first ones not done yet, stopping once a full row has a
 * verdict. The result lands in the ordinary verification cache, where both the
 * suggestions row and /api/verify find it. Nothing is saved to anyone's
 * history: the reader who clicks gets their own copy, as with any cache hit.
 */
export async function prepareSuggestions(): Promise<PrepareReport> {
  const report: PrepareReport = {};
  await Promise.all(
    LOCALES.map(async (locale) => {
      report[locale] = await prepareLocale(locale);
    })
  );
  return report;
}

async function prepareLocale(locale: ExamplesLocale): Promise<PrepareReport[string]> {
  const candidates = await getCandidates(locale);

  let ready = 0;
  const toVerify: string[] = [];
  for (const candidate of candidates) {
    if (ready + toVerify.length >= ROW_SIZE || toVerify.length >= PER_RUN) break;
    if (candidate.status === 'clear') ready++;
    if (candidate.status !== 'unchecked') continue;

    const attempt = await checkRateLimit(
      `suggestion:${createContentHash(candidate.text, locale)}`,
      ATTEMPTS_PER_DAY,
      DAY_MS
    );
    if (attempt.success) toVerify.push(candidate.text);
  }

  const results = await Promise.allSettled(
    toVerify.map((text) =>
      verifyContent({ text, language: locale, type: 'text', inputType: 'text', isPublic: false })
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');
  for (const failure of failed) {
    logger.warn('Suggestion pre-verification failed', {
      service: 'examples/prepare',
      locale,
      error: String((failure as PromiseRejectedResult).reason),
    });
  }

  const verdicts = results.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof verifyContent>>> => r.status === 'fulfilled'
  );
  return {
    verified: verdicts.length,
    failed: failed.length,
    ready: ready + verdicts.filter((r) => r.value.verdict !== 'unclear').length,
  };
}
