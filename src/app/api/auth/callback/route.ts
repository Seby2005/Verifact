import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/cont';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      let redirectBase = origin;
      if (!isLocalEnv && forwardedHost) {
        redirectBase = `https://${forwardedHost}`;
      } else if (!isLocalEnv && process.env.NEXT_PUBLIC_APP_URL) {
        redirectBase = process.env.NEXT_PUBLIC_APP_URL;
      }

      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  // Return the user to /cont with error parameter on failure
  const fallbackBase = process.env.NEXT_PUBLIC_APP_URL || origin;
  return NextResponse.redirect(`${fallbackBase}/cont?error=oauth_failed`);
}
