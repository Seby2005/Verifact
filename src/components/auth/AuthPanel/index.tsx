'use client';

import React, { useEffect, useState } from 'react';
import { Button, Input, Tabs, Callout, Modal, type TabItem } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { TIER_CONFIG, type UsageLimitCheck } from '@/types/user';
import { useLanguage } from '@/i18n';
import styles from './AuthPanel.module.css';

type Mode = 'login' | 'signup';
type LoginStep = 'credentials' | 'code';

const DELETE_CONFIRM_PHRASE = 'ȘTERGE';

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'success'; message: string };

type Session = { email: string | null } | null | undefined; // undefined = still checking

export const AuthPanel: React.FC = () => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [code, setCode] = useState('');

  const [session, setSession] = useState<Session>(undefined);
  const [usage, setUsage] = useState<UsageLimitCheck | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<Status>({ state: 'idle' });

  const modes: ReadonlyArray<TabItem<Mode>> = [
    { id: 'login', label: t('auth.tabs.login') },
    { id: 'signup', label: t('auth.tabs.signup') },
  ];

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setSession(data.user ? { email: data.user.email ?? null } : null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession?.user ? { email: newSession.user.email ?? null } : null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setUsage(null);
      return;
    }
    fetch('/api/user/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUsage(data?.usage ?? null))
      .catch(() => setUsage(null));
  }, [session]);

  const handleModeChange = (next: Mode) => {
    setMode(next);
    setStatus({ state: 'idle' });
    setLoginStep('credentials');
    setCode('');
  };

  const handleOAuthSignIn = async (provider: 'google' | 'facebook' | 'github') => {
    setStatus({ state: 'loading' });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.form.errorGeneric');
      setStatus({ state: 'error', message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setStatus({ state: 'loading' });

    try {
      if (mode === 'signup') {
        const supabase = createClient();
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setStatus({
          state: 'success',
          message: t('auth.form.successSignup'),
        });
        return;
      }

      // Login: the password is checked server-side without creating a
      // session. A real session is only established in handleVerifyCode,
      // once the emailed code is confirmed.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error || t('auth.form.errorGeneric'));
      }

      setLoginStep('code');
      setStatus({ state: 'idle' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('auth.form.errorGeneric');
      setStatus({ state: 'error', message });
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setStatus({ state: 'loading' });

    try {
      const res = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token: code.trim() }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error || t('auth.twoFactor.errorGeneric'));
      }

      // The session cookie was just set by the server response above —
      // reload so every client on the page, including this component's own
      // Supabase client, picks it up.
      window.location.reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('auth.twoFactor.errorGeneric');
      setStatus({ state: 'error', message });
    }
  };

  const handleResendCode = async () => {
    setStatus({ state: 'loading' });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error || t('auth.form.errorGeneric'));
      }
      setStatus({ state: 'success', message: t('auth.twoFactor.resendSuccess') });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('auth.form.errorGeneric');
      setStatus({ state: 'error', message });
    }
  };

  const handleBackToCredentials = () => {
    setLoginStep('credentials');
    setCode('');
    setStatus({ state: 'idle' });
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteConfirmText('');
    setDeleteStatus({ state: 'idle' });
  };

  const handleDeleteAccount = async () => {
    setDeleteStatus({ state: 'loading' });
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t('auth.deleteModal.errorGeneric'));
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      // Full reload after account deletion so no stale client state survives.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.deleteModal.errorGeneric');
      setDeleteStatus({ state: 'error', message });
    }
  };

  if (session === undefined) {
    return <section className={styles.panel} aria-labelledby="auth-heading" />;
  }

  if (session) {
    const tierLabel = usage ? t(`auth.tiers.${usage.tier}`) ?? usage.tier : null;
    const limit = usage ? usage.limit : TIER_CONFIG.free.monthlyLimit;

    return (
      <section className={styles.panel} aria-labelledby="auth-heading">
        <h2 id="auth-heading" className={styles.srOnly}>
          {t('auth.session.heading')}
        </h2>

        <div className={styles.account}>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>{t('auth.session.email')}</span>
            <span className={styles.accountValue}>{session.email}</span>
          </div>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>{t('auth.session.plan')}</span>
            <span className={styles.accountValue}>{tierLabel ?? '—'}</span>
          </div>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>{t('auth.session.verificationsThisMonth')}</span>
            <span className={styles.accountValue}>
              {usage ? t('auth.session.verificationsValue', { current: usage.current, limit }) : '—'}
            </span>
          </div>
        </div>

        <div className={styles.accountActions}>
          <Button type="button" variant="secondary" size="md" onClick={handleSignOut}>
            {t('auth.session.signOut')}
          </Button>
        </div>

        <div className={styles.dangerZone}>
          <p className={styles.dangerLead}>
            {t('auth.session.dangerLead')}{' '}
            <a href="/confidentialitate" className={styles.textLink}>
              {t('footer.sections.legal.privacy')}
            </a>
            .
          </p>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
          >
            {t('auth.session.deleteBtn')}
          </Button>
        </div>

        <Modal isOpen={isDeleteOpen} onClose={closeDeleteModal} title={t('auth.deleteModal.title')}>
          <p className={styles.modalLead}>{t('auth.deleteModal.lead')}</p>
          <Input
            label={t('auth.deleteModal.confirmLabel', { phrase: DELETE_CONFIRM_PHRASE })}
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoComplete="off"
            fullWidth
          />
          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" size="md" onClick={closeDeleteModal}>
              {t('auth.deleteModal.cancelBtn')}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              disabled={deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE}
              isLoading={deleteStatus.state === 'loading'}
              onClick={handleDeleteAccount}
            >
              {t('auth.deleteModal.confirmBtn')}
            </Button>
          </div>
          <div aria-live="polite">
            {deleteStatus.state === 'error' ? (
              <div className={styles.status}>
                <Callout label={t('auth.deleteModal.errorLabel')} tone="plain">
                  {deleteStatus.message}
                </Callout>
              </div>
            ) : null}
          </div>
        </Modal>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="auth-heading">
      <h2 id="auth-heading" className={styles.srOnly}>
        {t('auth.form.ariaLabel')}
      </h2>

      {mode === 'login' && loginStep === 'code' ? (
        <form className={styles.form} onSubmit={handleVerifyCode}>
          <p className={styles.modalLead}>{t('auth.twoFactor.hint', { email: email.trim() })}</p>

          <Input
            label={t('auth.twoFactor.codeLabel')}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder={t('auth.twoFactor.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
              {t('auth.twoFactor.submitBtn')}
            </Button>
          </div>

          <div className={styles.twoFactorActions}>
            <button
              type="button"
              className={`${styles.linkButton} ${styles.textLink}`}
              onClick={handleResendCode}
            >
              {t('auth.twoFactor.resendBtn')}
            </button>
            <button
              type="button"
              className={`${styles.linkButton} ${styles.textLink}`}
              onClick={handleBackToCredentials}
            >
              {t('auth.twoFactor.backBtn')}
            </button>
          </div>

          <div aria-live="polite">
            {status.state === 'error' ? (
              <div className={styles.status}>
                <Callout label={t('auth.form.errorLabel')} tone="plain">
                  {status.message}
                </Callout>
              </div>
            ) : null}

            {status.state === 'success' ? (
              <div className={styles.status}>
                <Callout label={t('auth.form.successLabel')} tone="plain">
                  {status.message}
                </Callout>
              </div>
            ) : null}
          </div>
        </form>
      ) : (
        <>
      <Tabs items={modes} value={mode} onChange={handleModeChange} ariaLabel={t('auth.tabs.ariaLabel')} />

      {/* Social Logins */}
      <div className={styles.socialButtons}>
        <button
          type="button"
          className={styles.socialButton}
          onClick={() => handleOAuthSignIn('google')}
          aria-label={t('auth.form.socialGoogle')}
        >
          <svg className={styles.socialIcon} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{t('auth.form.socialGoogle')}</span>
        </button>

        <button
          type="button"
          className={styles.socialButton}
          onClick={() => handleOAuthSignIn('facebook')}
          aria-label={t('auth.form.socialFacebook')}
        >
          <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>{t('auth.form.socialFacebook')}</span>
        </button>

        <button
          type="button"
          className={styles.socialButton}
          onClick={() => handleOAuthSignIn('github')}
          aria-label={t('auth.form.socialGithub')}
        >
          <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span>{t('auth.form.socialGithub')}</span>
        </button>
      </div>

      <div className={styles.socialDivider}>
        <span>{t('auth.form.orDivider')}</span>
      </div>

      <form
        className={styles.form}
        onSubmit={handleSubmit}
        id={`tabpanel-${mode}`}
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
      >
        <Input
          label={t('auth.form.emailLabel')}
          type="email"
          autoComplete="email"
          required
          placeholder={t('auth.form.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />

        <Input
          label={t('auth.form.passwordLabel')}
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          placeholder={t('auth.form.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText={
            mode === 'signup' ? t('auth.form.passwordHelperSignup') : undefined
          }
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
            {mode === 'signup' ? t('auth.form.submitSignup') : t('auth.form.submitLogin')}
          </Button>
        </div>

        <p className={styles.privacyNote}>{t('auth.form.privacyNote')}</p>

        <div aria-live="polite">
          {status.state === 'error' ? (
            <div className={styles.status}>
              <Callout label={t('auth.form.errorLabel')} tone="plain">
                {status.message}
              </Callout>
            </div>
          ) : null}

          {status.state === 'success' ? (
            <div className={styles.status}>
              <Callout label={t('auth.form.successLabel')} tone="plain">
                {status.message}
              </Callout>
            </div>
          ) : null}
        </div>
      </form>
        </>
      )}
    </section>
  );
};
