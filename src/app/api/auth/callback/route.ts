import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext) return '/cont';
  const trimmed = rawNext.trim();
  // Must be a relative path starting with single '/'
  // Reject protocol-relative ('//...'), backslashes ('/\...'), and userinfo ('@...')
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes('@')
  ) {
    return trimmed;
  }
  return '/cont';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const redirectBase = !isLocalEnv && process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL
        : origin;

      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  // Return the user to /cont with error parameter on failure
  const fallbackBase = process.env.NEXT_PUBLIC_APP_URL || origin;
  return NextResponse.redirect(`${fallbackBase}/cont?error=oauth_failed`);
}
