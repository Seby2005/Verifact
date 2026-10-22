import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { getClientIp } from '@/lib/utils/client-ip';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A short single-line string, or undefined: log fields can't carry newlines or essays. */
function shortField(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
  return clean || undefined;
}

export async function POST(request: Request) {
  // The inquiry is recorded in the log, so an unthrottled endpoint would let
  // anyone flood it with junk lines.
  const rate = await checkRateLimit(`waitlist:${getClientIp(request)}`, 5, 60 * 60 * 1000);
  if (!rate.success) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 });
  }

  let body: { email?: unknown; name?: unknown; role?: unknown; source?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const email = shortField(body.email, 254)?.toLowerCase() ?? '';
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 422 });
  }

  logger.info('Inquiry submission received', {
    service: 'waitlist',
    email,
    name: shortField(body.name, 100),
    role: shortField(body.role, 60),
    source: shortField(body.source, 60),
  });

  return NextResponse.json({ ok: true });
}
