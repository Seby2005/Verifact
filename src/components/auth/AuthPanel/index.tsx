'use client';

import React, { useEffect, useState } from 'react';
import { Button, Input, Tabs, Callout, Modal, useToast, type TabItem } from '@/components/ui';
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
  const { notify } = useToast();
  // Signup is the primary action for a first-time visitor, so it leads and is
  // selected by default; returning users switch to the login tab.
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [code, setCode] = useState('');
  // Password reset runs its own request, so it gets its own status — reusing the
  // shared `status` above would spin the main submit button while sending.
  const [resetStatus, setResetStatus] = useState<Status>({ state: 'idle' });

  const [session, setSession] = useState<Session>(undefined);
  const [usage, setUsage] = useState<UsageLimitCheck | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<Status>({ state: 'idle' });

  const modes: ReadonlyArray<TabItem<Mode>> = [
    { id: 'signup', label: t('auth.tabs.signup') },
    { id: 'login', label: t('auth.tabs.login') },
  ];

  // Live check so the confirm field can flag a mismatch as the user types,
  // rather than only failing on submit.
  const passwordMismatch =
    mode === 'signup' && confirmPassword.length > 0 && password !== confirmPassword;

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
    setResetStatus({ state: 'idle' });
    setLoginStep('credentials');
    setCode('');
    setConfirmPassword('');
  };

  const handleOAuthSignIn = async (provider: 'google') => {
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
        if (password !== confirmPassword) {
          throw new Error(t('auth.form.passwordMismatch'));
        }
        const supabase = createClient();
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        // A visible toast on top of the inline confirmation: the callout alone
        // sits low in the form and was easy to miss.
        notify(t('auth.form.successSignupToast'), 'success');
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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setResetStatus({ state: 'error', message: t('auth.form.resetNeedsEmail') });
      return;
    }
    setResetStatus({ state: 'loading' });
    try {
      const supabase = createClient();
      // The recovery link carries a PKCE `?code=`; send it through the callback
      // route that exchanges it for a session (same route the OAuth flow uses),
      // then on to /reseteaza-parola where the new password is actually set.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/reseteaza-parola')}`,
      });
      if (error) throw error;
      setResetStatus({ state: 'success', message: t('auth.form.resetSent') });
    } catch {
      setResetStatus({ state: 'error', message: t('auth.form.resetError') });
    }
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
    const tierLabel = usage?.unlimited
      ? t('auth.session.adminPlan')
      : usage
        ? t(`auth.tiers.${usage.tier}`) ?? usage.tier
        : null;
    // Pro/Business never show a denominator — the cap is intentionally unnamed
    // (see TIER_CONFIG). Free shows "used / 3" since 3 is advertised openly.
    const usageValue = !usage
      ? '—'
      : usage.unlimited
        ? t('auth.session.verificationsUnlimited')
        : usage.tier === 'free'
          ? t('auth.session.verificationsValue', { current: usage.current, limit: usage.limit })
          : String(usage.current);
    // Warn a Pro user once they pass the soft limit, ahead of the silent hard
    // cap — the account is the one place they're told they're running low.
    const showProLimitWarning =
      !!usage &&
      !usage.unlimited &&
      usage.tier === 'pro' &&
      usage.current >= TIER_CONFIG.pro.softLimit;

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
            <span className={styles.accountValue}>{usageValue}</span>
          </div>
        </div>

        {showProLimitWarning ? (
          <div className={styles.status}>
            <Callout label={t('auth.session.proLimitWarningLabel')} tone="plain">
              {t('auth.session.proLimitWarningText')}
            </Callout>
          </div>
        ) : null}

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

      <p className={styles.modeIntro}>
        {mode === 'signup' ? t('auth.form.signupSubtitle') : t('auth.form.loginSubtitle')}
      </p>

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

        {mode === 'signup' ? (
          <Input
            label={t('auth.form.confirmPasswordLabel')}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t('auth.form.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordMismatch ? t('auth.form.passwordMismatch') : undefined}
            fullWidth
          />
        ) : (
          <div className={styles.forgotBlock}>
            <div className={styles.forgotRow}>
              <button
                type="button"
                className={`${styles.linkButton} ${styles.textLink}`}
                onClick={handleForgotPassword}
                disabled={resetStatus.state === 'loading'}
              >
                {resetStatus.state === 'loading'
                  ? t('auth.form.resetSending')
                  : t('auth.form.forgotPassword')}
              </button>
            </div>
            <div aria-live="polite">
              {resetStatus.state === 'error' ? (
                <p className={styles.forgotStatus}>{resetStatus.message}</p>
              ) : null}
              {resetStatus.state === 'success' ? (
                <p className={styles.forgotStatus}>{resetStatus.message}</p>
              ) : null}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={status.state === 'loading'}
            disabled={passwordMismatch}
          >
            {mode === 'signup' ? t('auth.form.submitSignup') : t('auth.form.submitLogin')}
          </Button>
        </div>

        {mode === 'signup' ? (
          <p className={styles.termsNote}>
            {t('auth.form.termsPrefix')}
            <a href="/termeni" className={styles.textLink}>
              {t('auth.form.termsLink')}
            </a>
            {t('auth.form.termsMid')}
            <a href="/confidentialitate" className={styles.textLink}>
              {t('auth.form.privacyLink')}
            </a>
            {t('auth.form.termsSuffix')}
          </p>
        ) : (
          <p className={styles.privacyNote}>{t('auth.form.privacyNote')}</p>
        )}

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
