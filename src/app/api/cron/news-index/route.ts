import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/security/cron-auth';
import { ingestNewsFeeds } from '@/lib/news-index';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Refreshes the own news index from its RSS feeds. Triggered every 30 minutes
 * by .github/workflows/news-index.yml (Vercel's own cron runs daily at most on
 * the current plan), and callable by hand with the CRON_SECRET.
 */
async function handle(request: Request): Promise<Response> {
  if (!isCronAuthorized(request, 'CronNewsIndex')) {
    return NextResponse.json({ error: 'Unauthorized. Valid CRON_SECRET required.' }, { status: 401 });
  }

  try {
    const report = await ingestNewsFeeds();
    if (report.failedFeeds.length > 0) {
      logger.warn('Some news feeds failed during ingestion', { service: 'CronNewsIndex', failed: report.failedFeeds });
    }
    return NextResponse.json({ success: true, ...report, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingestion error';
    logger.error('News index ingestion failed', { service: 'CronNewsIndex', error: message });
    return NextResponse.json({ success: false, error: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
