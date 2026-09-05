'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/i18n';

/**
 * "Sign in with Google" via Google Identity Services (GSI) instead of the
 * classic OAuth redirect. The user stays in Google's own trusted popup — which
 * shows the configured "Verifact" app — and never sees the intermediary
 * `<project>.supabase.co` consent screen. Google returns an ID token, which we
 * hand to Supabase's signInWithIdToken to establish the session.
 *
 * Security: a random nonce is generated per mount; its SHA-256 hash goes to
 * Google (embedded in the returned token) and the raw value goes to Supabase,
 * which re-hashes and compares — binding the token to this exact attempt.
 */

interface GoogleCredentialResponse {
  credential: string;
}

interface GsiId {
  initialize: (config: Record<string, unknown>) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  prompt: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { raw, hashed };
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById('gsi-client-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GSI load failed')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GSI load failed'));
    document.head.appendChild(script);
  });
}

export const GoogleSignInButton: React.FC<{ onError?: (message: string) => void }> = ({
  onError,
}) => {
  const { t } = useLanguage();
  const buttonRef = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef<string>('');

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
          nonce: rawNonceRef.current,
        });
        if (error) throw error;
        // Session cookie is set — reload so every client picks it up.
        window.location.assign('/cont');
      } catch (err) {
        onError?.(err instanceof Error ? err.message : t('auth.googleAuthFailed'));
      }
    },
    [onError, t]
  );

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      try {
        await loadGsiScript();
        const { raw, hashed } = await makeNonce();
        if (cancelled) return;
        rawNonceRef.current = raw;

        const id = window.google?.accounts?.id;
        if (!id) return;

        id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
          nonce: hashed,
          use_fedcm_for_prompt: true,
          cancel_on_tap_outside: true,
        });

        if (buttonRef.current) {
          id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'center',
            width: 300,
          });
        }
        // One Tap prompt, in addition to the button.
        id.prompt();
      } catch (err) {
        onError?.(err instanceof Error ? err.message : t('auth.googleLoadFailed'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handleCredential, onError, t]);

  if (!CLIENT_ID) return null;

  return <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />;
};
