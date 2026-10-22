import { createClient as createBrowserClient } from '@/lib/supabase/client';

// Password sign-in, sign-up and password reset deliberately have no helpers
// here. A browser-side signInWithPassword creates a full session from the
// password alone, skipping the emailed 2FA code, so the only password login is
// the server pair /api/auth/login -> /api/auth/login/verify. AuthPanel owns
// sign-up and the reset email.

export async function signInWithOAuth(provider: 'google' | 'github'): Promise<void> {
  const supabase = createBrowserClient();
  // Prefer window.location.origin on client — it reflects the real domain
  // (verifact.ro in production, localhost in dev). NEXT_PUBLIC_APP_URL is only
  // a server-side fallback for SSR contexts where window is unavailable.
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || '');

  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${baseUrl}/api/auth/callback`,
    },
  });
}

export async function signOut(): Promise<void> {
  const supabase = createBrowserClient();
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    // Full reload (not router navigation) so every bit of client state and the
    // Supabase client are torn down after sign-out, not just the current route.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/';
  }
}
