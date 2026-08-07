import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Server-side proxy that subscribes an email to the Listmonk waitlist list.
 *
 * The Listmonk admin credentials never reach the browser — the form (see
 * src/components/waitlist/WaitlistForm.tsx) POSTs here, and this route talks to
 * Listmonk with a server-only API token. Returns 503 when Listmonk isn't
 * configured so the missing-env case is obvious rather than a silent failure.
 *
 * Env: LISTMONK_URL, LISTMONK_API_USER, LISTMONK_API_TOKEN, LISTMONK_WAITLIST_LIST_ID.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const base = process.env.LISTMONK_URL?.replace(/\/+$/, '');
  const user = process.env.LISTMONK_API_USER;
  const token = process.env.LISTMONK_API_TOKEN;
  const listId = Number(process.env.LISTMONK_WAITLIST_LIST_ID);

  if (!base || !user || !token || !Number.isFinite(listId)) {
    return NextResponse.json({ error: 'waitlist not configured' }, { status: 503 });
  }

  let body: { email?: string; name?: string };
  try {
    body = (await request.json()) as { email?: string; name?: string };
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 422 });
  }

  try {
    const res = await fetch(`${base}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Listmonk v3 API-token auth: "token <user>:<token>".
        Authorization: `token ${user}:${token}`,
      },
      body: JSON.stringify({
        email,
        name: body.name?.trim() || email.split('@')[0],
        status: 'enabled',
        lists: [listId],
        preconfirm_subscriptions: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    // 409 = already a subscriber. Treat as success from the visitor's view —
    // they're on the list either way, and leaking "you already signed up" is
    // needless.
    if (res.ok || res.status === 409) {
      return NextResponse.json({ ok: true });
    }

    const detail = await res.text();
    logger.warn('Listmonk subscribe failed', { service: 'waitlist', status: res.status, detail: detail.slice(0, 200) });
    return NextResponse.json({ error: 'subscribe failed' }, { status: 502 });
  } catch (error) {
    logger.error('Listmonk subscribe error', { service: 'waitlist', error });
    return NextResponse.json({ error: 'subscribe failed' }, { status: 502 });
  }
}
