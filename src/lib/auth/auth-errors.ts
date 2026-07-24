/**
 * Turns Supabase auth errors into messages a user can act on.
 *
 * supabase-js does not throw on network failures — it returns an
 * `AuthRetryableFetchError` whose `message` is the raw browser string
 * `"Failed to fetch"`. Rendering that verbatim (as the register and login
 * forms used to) tells the user nothing and hides the cause, which is almost
 * always one of:
 *
 *   - NEXT_PUBLIC_SUPABASE_URL points at an origin that is not allowed by the
 *     Content-Security-Policy `connect-src` directive (a local `supabase start`
 *     stack or a custom domain);
 *   - the URL is wrong, or still the placeholder from .env.example;
 *   - the Supabase project is paused (free projects pause after inactivity) or
 *     otherwise unreachable;
 *   - the request was blocked by an ad blocker or browser extension.
 *
 * See docs/TROUBLESHOOTING.md.
 */

const NETWORK_ERROR_PATTERNS = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'load failed',
  'fetch failed',
  'err_connection',
  'err_name_not_resolved',
];

export function isNetworkAuthError(error: { message?: string; name?: string } | null): boolean {
  if (!error) return false;
  if (error.name === 'AuthRetryableFetchError') return true;
  const message = (error.message ?? '').toLowerCase();
  return NETWORK_ERROR_PATTERNS.some(pattern => message.includes(pattern));
}

const NETWORK_MESSAGE_RO =
  'Nu am putut contacta serverul de autentificare. Verifică conexiunea la internet și, ' +
  'dacă rulezi aplicația local, verifică NEXT_PUBLIC_SUPABASE_URL din .env.local.';

/**
 * Maps a Supabase auth error to a message shown to the user. Anything that is
 * not recognised falls back to the provider message, which for real auth
 * failures (wrong password, duplicate account) is already meaningful.
 */
export function toUserFacingAuthMessage(
  error: { message?: string; name?: string } | null,
  fallback = 'A apărut o eroare. Încearcă din nou.'
): string {
  if (!error) return fallback;

  if (isNetworkAuthError(error)) {
    // The raw error is kept in the console so the cause stays diagnosable.
    console.error(
      '[auth] Network-level failure talking to Supabase.',
      'Configured URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ?? '<unset>',
      'Original error:', error
    );
    return NETWORK_MESSAGE_RO;
  }

  const message = error.message ?? '';

  if (message.includes('User already registered')) {
    return 'Există deja un cont înregistrat cu acest email.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'Email sau parolă incorecte.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Trebuie să confirmi adresa de email înainte de a te autentifica. Verifică-ți inbox-ul.';
  }
  if (message.includes('Password should be at least')) {
    return 'Parola este prea scurtă. Folosește minim 8 caractere.';
  }
  if (message.toLowerCase().includes('rate limit') || message.includes('For security purposes')) {
    return 'Prea multe încercări. Așteaptă un minut și încearcă din nou.';
  }

  return message || fallback;
}
