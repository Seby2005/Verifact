import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: string; name?: string; role?: string; interests?: string[]; message?: string; source?: string };
  try {
    body = (await request.json()) as { email?: string; name?: string; role?: string; interests?: string[]; message?: string; source?: string };
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 422 });
  }

  logger.info('Inquiry submission received', {
    service: 'waitlist',
    email,
    name: body.name?.trim(),
    role: body.role,
    source: body.source,
  });

  return NextResponse.json({ ok: true });
}
