'use client';

import React, { useEffect, useState } from 'react';
import { Button, Input, Tabs, Callout, Modal, type TabItem } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { TIER_CONFIG, type UsageLimitCheck } from '@/types/user';
import { useLanguage } from '@/i18n';
import styles from './AuthPanel.module.css';

type Mode = 'login' | 'signup';

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setStatus({ state: 'loading' });

    try {
      const supabase = createClient();

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setStatus({
          state: 'success',
          message: t('auth.form.successSignup'),
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setStatus({ state: 'success', message: t('auth.form.successLogin') });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('auth.form.errorGeneric');
      setStatus({ state: 'error', message });
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

      <Tabs items={modes} value={mode} onChange={handleModeChange} ariaLabel={t('auth.tabs.ariaLabel')} />

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
    </section>
  );
};
