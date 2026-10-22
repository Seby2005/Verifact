import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { accountKey, checkRateLimit } from '@/lib/utils/rate-limit';
import { getClientIp } from '@/lib/utils/client-ip';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/database';

interface LoginStartBody {
  email?: unknown;
  password?: unknown;
}

export const dynamic = 'force-dynamic';

/**
 * Step 1 of email-based 2FA login: checks the password against Supabase
 * Auth without ever establishing a browser session, then sends a one-time
 * code by email. Password alone never signs the browser in — the only
 * place a session is created is POST /api/auth/login/verify, after the
 * emailed code is confirmed.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Corp cerere JSON invalid' }, { status: 400 });
  }

  const b = body as LoginStartBody;
  if (typeof b.email !== 'string' || typeof b.password !== 'string' || !b.password) {
    return Response.json({ success: false, error: 'Email și parolă sunt obligatorii.' }, { status: 400 });
  }
  const email = b.email.trim();
  const password = b.password;

  const ip = getClientIp(request);

  // Per IP and per account: the account bucket stops a password guess spread
  // across many addresses from ever reaching more than a handful of tries.
  const rateLimitResult = await checkRateLimit(`auth-login:${ip}`, 5, 60 * 1000);
  const accountLimit = rateLimitResult.success
    ? await checkRateLimit(`auth-login-account:${accountKey(email)}`, 10, 15 * 60 * 1000)
    : rateLimitResult;
  if (!rateLimitResult.success || !accountLimit.success) {
    return Response.json(
      { success: false, error: 'Prea multe încercări. Așteaptă un minut.' },
      { status: 429 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    logger.error('Missing Supabase env vars', { service: 'api/auth/login' });
    return Response.json({ success: false, error: 'A apărut o eroare internă.' }, { status: 500 });
  }

  // persistSession/autoRefreshToken: false — this client exists only to
  // check the password against Supabase Auth. Nothing it returns is ever
  // written to a cookie.
  const anon = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: passwordError } = await anon.auth.signInWithPassword({ email, password });
  if (passwordError) {
    // One message for every failure. Supabase only says "Email not confirmed"
    // once the password is right, so a distinct reply would confirm a guessed
    // password; the shared text still points a real user at the confirmation.
    return Response.json(
      {
        success: false,
        error: 'Email sau parolă incorectă. Dacă abia ți-ai creat contul, confirmă-l mai întâi din linkul primit pe email.',
      },
      { status: 401 }
    );
  }

  // The password check above issued a real (if unpersisted) session on the
  // Supabase side — revoke it immediately rather than letting it sit valid
  // until natural expiry.
  await anon.auth.signOut();

  const { error: otpError } = await anon.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (otpError) {
    logger.error('Failed to send 2FA code', { service: 'api/auth/login', error: otpError.message });
    return Response.json(
      { success: false, error: 'Nu am putut trimite codul pe email. Încearcă din nou.' },
      { status: 500 }
    );
  }

  return Response.json({ success: true }, { status: 200 });
}
