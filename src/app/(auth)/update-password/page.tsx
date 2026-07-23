'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import styles from '@/app/(auth)/login/Login.module.css';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Parola trebuie să aibă minim 8 caractere');
      return;
    }

    if (password !== confirmPassword) {
      setError('Parolele nu se potrivesc');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || 'A apărut o eroare la actualizarea parolei.');
      } else {
        router.push('/dashboard?updated=true');
      }
    } catch {
      setError('A apărut o eroare neașteptată.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Setează o parolă nouă</h1>
        <p className={styles.subtitle}>Introdu noua ta parolă pentru a continua</p>
      </div>

      {error && <div className={styles.serverErrorAlert}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="new-password" className={styles.label}>
            Parolă nouă
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="confirm-new-password" className={styles.label}>
            Confirmă parola nouă
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Se salvează...
            </>
          ) : (
            'Salvează parola nouă'
          )}
        </button>
      </form>
    </div>
  );
}
