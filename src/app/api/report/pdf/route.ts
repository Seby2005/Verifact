import { createClient } from '@/lib/supabase/server';
import { hasUnlimitedUsage } from '@/lib/usage/limits';
import { synthesisFromReport } from '@/lib/ai/report-synthesis';
import { renderReportPdf } from '@/lib/pdf/ReportDocument';
import { logger } from '@/lib/utils/logger';
import type { VerificationReport } from '@/types/verification';

// @react-pdf needs the Node runtime (it is not Edge-compatible).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generates the downloadable PDF report. The download is a Pro/Business feature,
 * so premium is enforced here server-side (the client also gates it, but the
 * paywall must not be bypassable by calling the API directly). The report to
 * render is posted in the body — it is the reader's own verification, which the
 * client already holds — and the AI synthesis + PDF are produced on the fly.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Corp cerere invalid.' }, { status: 400 });
  }

  const report = (body as { report?: VerificationReport })?.report;
  if (!report || typeof report !== 'object' || !report.verdict || !Array.isArray(report.sources)) {
    return Response.json({ error: 'Raport invalid.' }, { status: 400 });
  }

  // Premium gate.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Autentificare necesară.' }, { status: 401 });
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
    return Response.json({ error: 'Raportul PDF este disponibil pentru planul Pro.' }, { status: 403 });
  }

  try {
    const locale: 'ro' | 'en' = report.language === 'en' ? 'en' : 'ro';
    // Instant: reuse what the verification already computed, no fresh AI call.
    const synthesis = synthesisFromReport(report, locale);
    const pdf = await renderReportPdf({ report, synthesis, locale });

    const safeId = String(report.id ?? 'raport').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'raport';
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="raport-verifact-${safeId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('PDF report generation failed', { service: 'api/report/pdf', error });
    return Response.json({ error: 'Nu am putut genera raportul PDF.' }, { status: 500 });
  }
}
