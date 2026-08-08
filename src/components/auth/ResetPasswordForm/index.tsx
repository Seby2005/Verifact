'use client';

import React, { useEffect, useState } from 'react';
import { Button, Input, Callout } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/i18n';
import styles from './ResetPasswordForm.module.css';

// verifying: confirming the recovery session exists before showing the form.
// form: the recovery session is live; the user can set a new password.
// invalid: no recovery session — the link was missing, expired, or already used.
// done: updateUser succeeded.
type Phase = 'verifying' | 'form' | 'invalid' | 'done';

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string };

/**
 * Screen behind a password-recovery link. The recovery `?code=` is exchanged
 * for a session by /api/auth/callback (the same @supabase/ssr PKCE exchange the
 * OAuth flow uses) before the user lands here, so a recovery session is already
 * present; that session is what lets supabase.auth.updateUser change the
 * password. PASSWORD_RECOVERY is handled too, so the form still appears if the
 * client performs the exchange itself.
 */
export const ResetPasswordForm: React.FC = () => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  useEffect(() => {
    // Read the incoming params before creating the client: the SSR client can
    // strip `?code=` from the URL as it exchanges it, so capture it first.
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    const hadCode = params.has('code');
    const hadError = params.has('error') || params.has('error_description');

    const supabase = createClient();
    let settled = false;
    const toForm = () => {
      if (!settled) {
        settled = true;
        setPhase('form');
      }
    };
    const toInvalid = () => {
      if (!settled) {
        settled = true;
        setPhase('invalid');
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) toForm();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) toForm();
      else if (hadError || !hadCode) toInvalid();
      // else: a code is present but not yet exchanged — wait for the listener.
    });

    // Nothing established a session in time: the link is invalid or expired.
    const timer = setTimeout(toInvalid, 8000);

    return () => {
      settled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (password.length < 8) {
      setStatus({ state: 'error', message: t('auth.resetPassword.errorTooShort') });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ state: 'error', message: t('auth.form.passwordMismatch') });
      return;
    }

    setStatus({ state: 'loading' });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPhase('done');
    } catch {
      setStatus({ state: 'error', message: t('auth.resetPassword.errorGeneric') });
    }
  };

  if (phase === 'verifying') {
    return (
      <div className={styles.state} aria-live="polite">
        <p className={styles.stateText}>{t('auth.resetPassword.verifying')}</p>
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <div className={styles.state}>
        <Callout label={t('auth.resetPassword.invalidLabel')} tone="plain">
          {t('auth.resetPassword.invalidText')}
        </Callout>
        <a href="/cont" className={styles.textLink}>
          {t('auth.resetPassword.backToLogin')}
        </a>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className={styles.state}>
        <Callout label={t('auth.resetPassword.successLabel')} tone="plain">
          {t('auth.resetPassword.successText')}
        </Callout>
        <Button href="/cont" variant="primary" size="lg">
          {t('auth.resetPassword.goToAccount')}
        </Button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label={t('auth.resetPassword.newPasswordLabel')}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
      />

      <Input
        label={t('auth.resetPassword.confirmLabel')}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder={t('auth.resetPassword.confirmPlaceholder')}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        fullWidth
      />

      <div className={styles.actions}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={status.state === 'loading'}
        >
          {t('auth.resetPassword.submitBtn')}
        </Button>
      </div>

      <div aria-live="polite">
        {status.state === 'error' ? (
          <div className={styles.status}>
            <Callout label={t('auth.resetPassword.errorLabel')} tone="plain">
              {status.message}
            </Callout>
          </div>
        ) : null}
      </div>
    </form>
  );
};
