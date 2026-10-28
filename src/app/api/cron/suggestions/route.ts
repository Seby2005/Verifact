import { NextResponse } from 'next/server';
import { cronRunAllowed, isCronAuthorized } from '@/lib/security/cron-auth';
import { prepareSuggestions } from '@/lib/examples/prepare';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Verifies the homepage suggestions ahead of the reader (see
 * src/lib/examples/prepare.ts). Triggered hourly by
 * .github/workflows/suggestions.yml, and callable by hand with the CRON_SECRET.
 */
async function handle(request: Request): Promise<Response> {
  if (!isCronAuthorized(request, 'CronSuggestions')) {
    return NextResponse.json({ error: 'Unauthorized. Valid CRON_SECRET required.' }, { status: 401 });
  }
  // Scheduled hourly; each run spends paid verification calls.
  if (!(await cronRunAllowed('suggestions', 4))) {
    return NextResponse.json({ error: 'Too many runs this hour.' }, { status: 429 });
  }

  try {
    const report = await prepareSuggestions();
    return NextResponse.json({ success: true, ...report, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Preparing the homepage suggestions failed', { service: 'CronSuggestions', error: message });
    return NextResponse.json({ success: false, error: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
