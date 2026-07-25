'use client';

import React, { useEffect, useState } from 'react';
import { Button, Input, Tabs, Callout, Modal, type TabItem } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { TIER_CONFIG, type UsageLimitCheck } from '@/types/user';
import styles from './AuthPanel.module.css';

type Mode = 'login' | 'signup';

const MODES: ReadonlyArray<TabItem<Mode>> = [
  { id: 'login', label: 'Intră în cont' },
  { id: 'signup', label: 'Creează cont' },
];

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
};

const DELETE_CONFIRM_PHRASE = 'ȘTERGE';

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'success'; message: string };

type Session = { email: string | null } | null | undefined; // undefined = still checking

export const AuthPanel: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  const [session, setSession] = useState<Session>(undefined);
  const [usage, setUsage] = useState<UsageLimitCheck | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<Status>({ state: 'idle' });

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
          message:
            'Contul a fost creat. Verifică-ți emailul pentru linkul de confirmare.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setStatus({ state: 'success', message: 'Autentificare reușită.' });
      }
    } catch (err) {
      // Surfaces the real reason rather than a generic failure — the Supabase
      // project credentials fall back to placeholders when env vars are unset,
      // which is the most common cause of failure in local development.
      const message =
        err instanceof Error ? err.message : 'A apărut o eroare la autentificare.';
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
        throw new Error(data?.error || 'Ștergerea contului a eșuat.');
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ștergerea contului a eșuat.';
      setDeleteStatus({ state: 'error', message });
    }
  };

  // Still checking whether there's an active session — avoid flashing the
  // login form for a user who is actually already signed in.
  if (session === undefined) {
    return <section className={styles.panel} aria-labelledby="auth-heading" />;
  }

  if (session) {
    const tierLabel = usage ? TIER_LABELS[usage.tier] ?? usage.tier : null;
    const limit = usage ? usage.limit : TIER_CONFIG.free.monthlyLimit;

    return (
      <section className={styles.panel} aria-labelledby="auth-heading">
        <h2 id="auth-heading" className={styles.srOnly}>
          Contul tău
        </h2>

        <div className={styles.account}>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>Email</span>
            <span className={styles.accountValue}>{session.email}</span>
          </div>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>Plan</span>
            <span className={styles.accountValue}>{tierLabel ?? '—'}</span>
          </div>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>Verificări luna asta</span>
            <span className={styles.accountValue}>
              {usage ? `${usage.current} din ${limit}` : '—'}
            </span>
          </div>
        </div>

        <div className={styles.accountActions}>
          <Button type="button" variant="secondary" size="md" onClick={handleSignOut}>
            Deconectare
          </Button>
        </div>

        <div className={styles.dangerZone}>
          <p className={styles.dangerLead}>
            Ștergerea contului este definitivă: rapoartele tale private se
            șterg pentru totdeauna, iar cele publicate rămân în baza publică,
            anonimizate. Detalii în{' '}
            <a href="/confidentialitate" className={styles.textLink}>
              Politica de confidențialitate
            </a>
            .
          </p>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
          >
            Șterge contul
          </Button>
        </div>

        <Modal isOpen={isDeleteOpen} onClose={closeDeleteModal} title="Ștergi contul definitiv?">
          <p className={styles.modalLead}>
            Această acțiune nu poate fi anulată. Toate rapoartele tale private
            vor fi șterse. Rapoartele publicate rămân, dar fără nicio legătură
            cu contul tău.
          </p>
          <Input
            label={`Scrie „${DELETE_CONFIRM_PHRASE}” ca să confirmi`}
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoComplete="off"
            fullWidth
          />
          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" size="md" onClick={closeDeleteModal}>
              Renunță
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              disabled={deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE}
              isLoading={deleteStatus.state === 'loading'}
              onClick={handleDeleteAccount}
            >
              Șterge definitiv contul
            </Button>
          </div>
          <div aria-live="polite">
            {deleteStatus.state === 'error' ? (
              <div className={styles.status}>
                <Callout label="Nu a funcționat" tone="plain">
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
        Autentificare
      </h2>

      <Tabs items={MODES} value={mode} onChange={handleModeChange} ariaLabel="Mod autentificare" />

      <form
        className={styles.form}
        onSubmit={handleSubmit}
        id={`tabpanel-${mode}`}
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="nume@exemplu.ro"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />

        <Input
          label="Parolă"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          placeholder="Minimum 8 caractere"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText={
            mode === 'signup' ? 'Alege o parolă de cel puțin 8 caractere.' : undefined
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
            {mode === 'signup' ? 'Creează cont' : 'Intră în cont'}
          </Button>
        </div>

        <p className={styles.privacyNote}>
          Totul este privat: rapoartele și istoricul tău nu sunt vizibile pentru
          nimeni altcineva și nu sunt vândute mai departe.
        </p>

        <div aria-live="polite">
          {status.state === 'error' ? (
            <div className={styles.status}>
              <Callout label="Nu a funcționat" tone="plain">
                {status.message}
              </Callout>
            </div>
          ) : null}

          {status.state === 'success' ? (
            <div className={styles.status}>
              <Callout label="Gata" tone="plain">
                {status.message}
              </Callout>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
};
