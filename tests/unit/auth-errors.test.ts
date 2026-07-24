/**
 * Tests for the auth error mapping.
 *
 * Background: creating an account on localhost surfaced a bare
 * "Failed to fetch". supabase-js does not throw on network failures — it
 * returns an AuthRetryableFetchError whose message is the raw browser string,
 * and RegisterForm rendered `error.message` verbatim. The underlying cause was
 * a Content-Security-Policy `connect-src` that only allowed
 * `https://*.supabase.co`, so any other Supabase origin was blocked with no
 * explanation.
 */

import { isNetworkAuthError, toUserFacingAuthMessage } from '@/lib/auth/auth-errors';

describe('isNetworkAuthError', () => {
  it('recognises the browser fetch failure that a CSP block produces', () => {
    expect(isNetworkAuthError({ message: 'Failed to fetch' })).toBe(true);
  });

  it('recognises the supabase-js retryable error by name', () => {
    expect(isNetworkAuthError({ name: 'AuthRetryableFetchError', message: 'whatever' })).toBe(true);
  });

  it('recognises the Firefox and Safari wordings', () => {
    expect(isNetworkAuthError({ message: 'NetworkError when attempting to fetch resource.' })).toBe(true);
    expect(isNetworkAuthError({ message: 'Load failed' })).toBe(true);
  });

  it('recognises a node-side fetch failure', () => {
    expect(isNetworkAuthError({ message: 'fetch failed' })).toBe(true);
  });

  it('does not treat a real auth failure as a network error', () => {
    expect(isNetworkAuthError({ message: 'Invalid login credentials' })).toBe(false);
    expect(isNetworkAuthError({ message: 'User already registered' })).toBe(false);
  });

  it('handles a null error', () => {
    expect(isNetworkAuthError(null)).toBe(false);
  });
});

describe('toUserFacingAuthMessage', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  afterAll(() => consoleError.mockRestore());

  it('replaces "Failed to fetch" with an actionable message', () => {
    const message = toUserFacingAuthMessage({ message: 'Failed to fetch' });
    expect(message).not.toContain('Failed to fetch');
    expect(message).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('logs the original error so the cause stays diagnosable', () => {
    consoleError.mockClear();
    toUserFacingAuthMessage({ message: 'Failed to fetch' });
    expect(consoleError).toHaveBeenCalled();
  });

  it('translates a duplicate account', () => {
    expect(toUserFacingAuthMessage({ message: 'User already registered' }))
      .toBe('Există deja un cont înregistrat cu acest email.');
  });

  it('translates wrong credentials', () => {
    expect(toUserFacingAuthMessage({ message: 'Invalid login credentials' }))
      .toBe('Email sau parolă incorecte.');
  });

  it('translates an unconfirmed email', () => {
    expect(toUserFacingAuthMessage({ message: 'Email not confirmed' }))
      .toContain('confirmi adresa de email');
  });

  it('translates provider rate limiting', () => {
    expect(toUserFacingAuthMessage({ message: 'For security purposes, you can only request this after 42 seconds' }))
      .toContain('Prea multe încercări');
  });

  it('passes through an unrecognised provider message', () => {
    expect(toUserFacingAuthMessage({ message: 'Signups not allowed for this instance' }))
      .toBe('Signups not allowed for this instance');
  });

  it('uses the fallback when there is no message at all', () => {
    expect(toUserFacingAuthMessage({}, 'fallback text')).toBe('fallback text');
    expect(toUserFacingAuthMessage(null, 'fallback text')).toBe('fallback text');
  });
});
