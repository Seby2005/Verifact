'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import styles from '@/app/(auth)/login/Login.module.css';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setErrorMessage('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setEmailError('Introdu un email valid');
      return;
    }

    setStatus('loading');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message || 'A apărut o eroare.');
      } else {
        setStatus('success');
      }
    } catch {
      setStatus('error');
      setErrorMessage('A apărut o eroare neașteptată.');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Resetează parola</h1>
        <p className={styles.subtitle}>
          Introdu adresa de email și îți vom trimite un link pentru resetarea parolei.
        </p>
      </div>

      {status === 'success' ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: 'var(--color-green-600)', fontSize: '14px' }}>
            Am trimis un link de resetare la <strong>{email}</strong>. Verifică-ți inbox-ul.
          </div>
          <Link href="/login" className={styles.registerLink}>
            Înapoi la autentificare
          </Link>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {errorMessage && <div className={styles.serverErrorAlert}>{errorMessage}</div>}

          <div className={styles.field}>
            <label htmlFor="reset-email" className={styles.label}>
              Email
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${styles.input} ${emailError ? styles.inputError : ''}`}
                placeholder="nume@exemplu.ro"
                disabled={status === 'loading'}
              />
            </div>
            {emailError && <span className={styles.fieldError}>{emailError}</span>}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <span className={styles.spinner} />
                Se trimite...
              </>
            ) : (
              'Trimite link de resetare'
            )}
          </button>

          <div className={styles.footer}>
            <Link href="/login" className={styles.registerLink}>
              Înapoi la autentificare
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
