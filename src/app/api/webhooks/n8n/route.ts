import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Callback endpoint the n8n "4 sources in parallel" workflow POSTs its
 * aggregated result to (see workflows/n8n/verifact-4-sources.json). This is the
 * "endpoint intern" half of item #1: n8n owns the fan-out to the data sources,
 * and hands the combined payload back here for the app to do whatever it wants
 * with (persist, score, forward). Kept deliberately thin — the point is the
 * seam, so sources can be added/removed in n8n without app code changes.
 *
 * Optional shared-secret gate: set N8N_WEBHOOK_SECRET and have the workflow send
 * it as `x-verifact-secret`. When the env var is unset the check is skipped so
 * the local demo works out of the box.
 */
interface AggregatedPayload {
  claim?: string;
  language?: string;
  sources?: {
    factCheck?: unknown[];
    news?: unknown[];
    official?: unknown[];
    social?: unknown[];
  };
}

export async function POST(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret && request.headers.get('x-verifact-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: AggregatedPayload;
  try {
    payload = (await request.json()) as AggregatedPayload;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const counts = {
    factCheck: payload.sources?.factCheck?.length ?? 0,
    news: payload.sources?.news?.length ?? 0,
    official: payload.sources?.official?.length ?? 0,
    social: payload.sources?.social?.length ?? 0,
  };

  logger.info('n8n aggregate received', {
    service: 'n8n-webhook',
    claim: payload.claim?.slice(0, 120),
    counts,
  });

  return NextResponse.json({ received: true, counts });
}
