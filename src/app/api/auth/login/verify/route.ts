import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/utils/rate-limit';

interface LoginVerifyBody {
  email?: unknown;
  token?: unknown;
}

export const dynamic = 'force-dynamic';

/**
 * Step 2 of email-based 2FA login: confirms the one-time code sent by
 * POST /api/auth/login. This is the cookie-bound server client, so a
 * successful verifyOtp here is the single place a browser session for
 * password-based login actually gets created.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Corp cerere JSON invalid' }, { status: 400 });
  }

  const b = body as LoginVerifyBody;
  if (typeof b.email !== 'string' || typeof b.token !== 'string' || !b.token.trim()) {
    return Response.json({ success: false, error: 'Cod invalid.' }, { status: 400 });
  }
  const email = b.email.trim();
  const token = b.token.trim();

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  // Tighter than login-start: a 6-digit code is only ~1M combinations, so
  // this endpoint is the actual brute-force surface.
  const rateLimitResult = await checkRateLimit(`auth-login-verify:${ip}`, 5, 60 * 1000);
  if (!rateLimitResult.success) {
    return Response.json(
      { success: false, error: 'Prea multe încercări. Așteaptă un minut.' },
      { status: 429 }
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

  if (error) {
    return Response.json({ success: false, error: 'Cod invalid sau expirat.' }, { status: 401 });
  }

  return Response.json({ success: true }, { status: 200 });
}
