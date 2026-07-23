import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { ensureProfileExists } from '@/lib/supabase/auth-helpers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('redirect') ?? '/dashboard';

  if (code) {
    const supabase = createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      await ensureProfileExists(data.user.id, data.user.email ?? '');
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page or login with an error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
