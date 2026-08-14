import { NextResponse } from 'next/server';
import { aggregateDailyOpportunities, saveOpportunities } from '@/lib/opportunities/trends-service';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution time for Vercel Cron serverless function

/**
 * Validates whether the incoming request is authorized to trigger the cron job.
 * Supports:
 * - Authorization: Bearer <CRON_SECRET> (Vercel Cron standard)
 * - x-cron-secret: <CRON_SECRET>
 * - Query parameter: ?secret=<CRON_SECRET>
 */
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, only allow in local development
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('CRON_SECRET is not configured; allowing in development mode', {
        service: 'CronContentOpportunities',
      });
      return true;
    }
    return false;
  }

  // 1. Authorization header: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === cronSecret) {
      return true;
    }
  }

  // 2. Custom header: x-cron-secret
  const customHeader = request.headers.get('x-cron-secret');
  if (customHeader && customHeader === cronSecret) {
    return true;
  }

  // 3. URL search parameter: ?secret=<token>
  try {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    if (querySecret && querySecret === cronSecret) {
      return true;
    }
  } catch {
    // Malformed URL
  }

  return false;
}

async function handleCronRequest(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Valid CRON_SECRET required.' },
      { status: 401 }
    );
  }

  try {
    logger.info('Starting daily content opportunities aggregation', {
      service: 'CronContentOpportunities',
    });

    const candidates = await aggregateDailyOpportunities();
    const result = await saveOpportunities(candidates);

    return NextResponse.json({
      success: result.success,
      totalFetched: result.totalFetched,
      inserted: result.inserted,
      skippedDuplicates: result.skippedDuplicates,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown aggregation error';
    logger.error('Unexpected error in content opportunities cron', {
      service: 'CronContentOpportunities',
      error: errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleCronRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleCronRequest(request);
}
