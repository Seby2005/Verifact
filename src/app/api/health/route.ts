import { NextResponse } from 'next/server';
import { sendNtfyAlert } from '@/lib/alerts/ntfy';

/**
 * Lightweight health/readiness probe.
 *
 * Reports whether the credentials each verification layer and the AI provider
 * need are present. It does NOT call the external services — this is a cheap
 * config check meant to be hit frequently by an uptime monitor, not a full
 * end-to-end synthetic run.
 *
 * Hit `/api/health?notify=1` to also push a ntfy alert when degraded — that is
 * the wiring between health-checks and ntfy (the other path, GlitchTip errors
 * -> ntfy, is a webhook configured inside GlitchTip, no code here).
 */
export const dynamic = 'force-dynamic';

interface Check {
  name: string;
  ok: boolean;
}

function runChecks(): Check[] {
  const has = (v: string | undefined) => Boolean(v && v.trim());
  return [
    { name: 'layer1-factcheck', ok: has(process.env.GOOGLE_FACT_CHECK_API_KEY) },
    { name: 'layer2-news', ok: has(process.env.NEWS_API_KEY) || has(process.env.TAVILY_API_KEY) },
    { name: 'layer3-official', ok: has(process.env.GOOGLE_CUSTOM_SEARCH_API_KEY) },
    { name: 'layer4-social', ok: has(process.env.TAVILY_API_KEY) },
    { name: 'ai-provider', ok: has(process.env.OPENROUTER_API_KEY) || has(process.env.GEMINI_API_KEY) },
  ];
}

export async function GET(request: Request) {
  const checks = runChecks();
  const failed = checks.filter((c) => !c.ok);
  const status = failed.length === 0 ? 'ok' : 'degraded';

  const notify = new URL(request.url).searchParams.get('notify') === '1';
  if (notify && failed.length > 0) {
    await sendNtfyAlert({
      title: 'Verifact health check degraded',
      message: `Missing config for: ${failed.map((c) => c.name).join(', ')}`,
      priority: 4,
      tags: ['warning'],
    });
  }

  return NextResponse.json(
    { status, checks },
    { status: status === 'ok' ? 200 : 503 }
  );
}
