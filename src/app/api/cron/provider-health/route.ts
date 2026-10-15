import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/security/cron-auth';
import { checkSearchProviders, type ProviderCheck } from '@/lib/health/search-providers';
import { getAdminEmails } from '@/lib/auth/admin-emails';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function alertEmail(failed: ProviderCheck[]): { subject: string; html: string; text: string } {
  const lines = failed.map((c) => `${c.provider} (afectează: ${c.affects}) — ${c.detail}`);
  return {
    subject: `Verifact: ${failed.length} furnizor(i) de căutare/AI nu funcționează`,
    text: `Verificarea zilnică a găsit probleme:\n\n${lines.join('\n')}\n\nCât timp durează, rapoartele afișează „Căutare incompletă”.`,
    html: `<p>Verificarea zilnică a găsit probleme:</p><ul>${lines
      .map((l) => `<li>${escapeHtml(l)}</li>`)
      .join('')}</ul><p>Cât timp durează, rapoartele afișează „Căutare incompletă”.</p>`,
  };
}

/**
 * Daily live check of every search/AI provider; emails the admins when one is
 * down. Also callable by hand with the CRON_SECRET to see the current state.
 */
async function handle(request: Request): Promise<Response> {
  if (!isCronAuthorized(request, 'CronProviderHealth')) {
    return NextResponse.json({ error: 'Unauthorized. Valid CRON_SECRET required.' }, { status: 401 });
  }

  const checks = await checkSearchProviders();
  const failed = checks.filter((c) => !c.ok);

  let alerted = false;
  if (failed.length > 0) {
    logger.error('Provider health check found failures', { service: 'CronProviderHealth', failed });
    try {
      await sendEmail({ to: getAdminEmails(), ...alertEmail(failed) });
      alerted = true;
    } catch (error) {
      logger.error('Provider health alert email failed', { service: 'CronProviderHealth', error });
    }
  }

  return NextResponse.json(
    { status: failed.length === 0 ? 'ok' : 'degraded', checks, alerted, timestamp: new Date().toISOString() },
    { status: failed.length === 0 ? 200 : 503 }
  );
}

export const GET = handle;
export const POST = handle;
