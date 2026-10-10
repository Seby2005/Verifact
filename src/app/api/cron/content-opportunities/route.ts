import { NextResponse } from 'next/server';
import { aggregateDailyOpportunities, saveOpportunities } from '@/lib/opportunities/trends-service';
import { logger } from '@/lib/utils/logger';
import { isCronAuthorized } from '@/lib/security/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution time for Vercel Cron serverless function

async function handleCronRequest(request: Request): Promise<Response> {
  if (!isCronAuthorized(request, 'CronContentOpportunities')) {
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
