'use client';

import React, { useState } from 'react';
import { Button, Input, Tabs, Callout, type TabItem } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import styles from './AuthPanel.module.css';

type Mode = 'login' | 'signup';

const MODES: ReadonlyArray<TabItem<Mode>> = [
  { id: 'login', label: 'Intră în cont' },
  { id: 'signup', label: 'Creează cont' },
];

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'success'; message: string };

export const AuthPanel: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });

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
