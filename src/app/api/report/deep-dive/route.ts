import { createClient } from '@/lib/supabase/server';
import { getPublicReportById } from '@/lib/verification/public-reports-query';
import { hasUnlimitedUsage } from '@/lib/usage/limits';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { logger } from '@/lib/utils/logger';
import {
  generateDeepDiveAnswer,
  isDeepDiveAction,
  type DeepDiveAction,
} from '@/lib/ai/deep-dive';
import type { VerificationReport } from '@/types/verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CUSTOM_QUESTION_LENGTH = 300;

interface DeepDiveBody {
  reportId?: unknown;
  actionType?: unknown;
  customQuestion?: unknown;
}

/**
 * Pro-only interactive Q&A on top of a finished verification report.
 *
 * The premium gate is enforced here server-side (the client also gates it, but
 * the paywall must not be bypassable by calling the API directly). The report
 * is loaded from the database — the caller's own private report first, then
 * any public report — so a caller can only deep-dive what they may read.
 */
export async function POST(request: Request): Promise<Response> {
  let body: DeepDiveBody;
  try {
    body = (await request.json()) as DeepDiveBody;
  } catch {
    return Response.json({ error: 'Corp cerere invalid.' }, { status: 400 });
  }

  const reportId = typeof body.reportId === 'string' ? body.reportId.trim() : '';
  const actionType = body.actionType;
  const customQuestion = typeof body.customQuestion === 'string' ? body.customQuestion.trim() : '';

  if (!reportId) {
    return Response.json({ error: 'ID raport lipsă.' }, { status: 400 });
  }
  if (!isDeepDiveAction(actionType)) {
    return Response.json({ error: 'Tip de analiză necunoscut.' }, { status: 400 });
  }
  if (actionType === 'custom_question') {
    if (customQuestion.length < 5) {
      return Response.json({ error: 'Întrebarea este prea scurtă.' }, { status: 400 });
    }
    if (customQuestion.length > MAX_CUSTOM_QUESTION_LENGTH) {
      return Response.json({ error: 'Întrebarea este prea lungă.' }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Autentificare necesară.' }, { status: 401 });
  }

  // Generous per-user bucket: deep-dive hits the paid LLM, so it must be
  // protected from loops, but a Pro user asking follow-ups is normal usage.
  const rateLimit = await checkRateLimit(`deep-dive:${user.id}`, 30, 10 * 60 * 1000);
  if (!rateLimit.success) {
    return Response.json({ error: 'Prea multe cereri. Încearcă din nou mai târziu.' }, { status: 429 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, role')
    .eq('id', user.id)
    .single();
  const typed = profile as { tier?: string | null; role?: string | null } | null;
  const isPremium =
    hasUnlimitedUsage(typed?.role, user.email) || typed?.tier === 'pro' || typed?.tier === 'business';
  if (!isPremium) {
    return Response.json({ requiresUpgrade: true, error: 'Deep Dive este disponibil pentru planul Pro.' }, { status: 403 });
  }

  // The caller's own report first (RLS restricts the read to their own rows);
  // public reports are readable by anyone and use the single authorized helper.
  // Cast for the same reason as db-operations.ts: this Database type is
  // hand-maintained, and supabase-js's select inference collapses a
  // single-column read of report_json to never without it.
  const { data: ownRow } = await (supabase
    .from('verifications')
    .select('report_json')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .single() as unknown as Promise<{
    data: { report_json: Record<string, unknown> | null } | null;
    error: { message: string } | null;
  }>);

  let report: VerificationReport | null =
    (ownRow?.report_json as VerificationReport | null) ?? null;

  if (!report) {
    const publicDetail = await getPublicReportById(reportId);
    report = publicDetail?.reportJson ?? null;
  }

  if (!report) {
    return Response.json({ error: 'Raportul nu a fost găsit.' }, { status: 404 });
  }

  const locale: 'ro' | 'en' | 'fr' =
    report.language === 'fr' ? 'fr' : report.language === 'en' ? 'en' : 'ro';

  try {
    const { answer } = await generateDeepDiveAnswer({
      report,
      actionType: actionType as DeepDiveAction,
      customQuestion: actionType === 'custom_question' ? customQuestion : undefined,
      locale,
    });
    return Response.json({ success: true, answer, actionType });
  } catch (error) {
    logger.error('Deep dive analysis failed', {
      service: 'api/report/deep-dive',
      reportId,
      actionType,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: 'Nu am putut genera analiza. Încearcă din nou.' }, { status: 500 });
  }
}
