import { NextResponse } from 'next/server';

/**
 * Lightweight health/readiness probe.
 *
 * Reports whether the credentials each verification layer and the AI provider
 * need are present. It does NOT call the external services — this is a cheap
 * config check meant to be hit frequently by an uptime monitor, not a full
 * end-to-end synthetic run.
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
    // Press and official search run on keyless RSS engines and the social
    // layer is optional, so none of them has a key to be missing.
    { name: 'ai-provider', ok: has(process.env.OPENROUTER_API_KEY) || has(process.env.GEMINI_API_KEY) },
  ];
}

export async function GET() {
  const checks = runChecks();
  const failed = checks.filter((c) => !c.ok);
  const status = failed.length === 0 ? 'ok' : 'degraded';

  return NextResponse.json(
    { status, checks },
    { status: status === 'ok' ? 200 : 503 }
  );
}
