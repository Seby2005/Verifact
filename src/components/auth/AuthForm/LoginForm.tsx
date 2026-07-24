'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { toUserFacingAuthMessage } from '@/lib/auth/auth-errors';
import styles from '@/app/(auth)/login/Login.module.css';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const supabase = createBrowserClient();

  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setServerError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setEmailError('Introdu un email valid');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Introdu parola');
      isValid = false;
    }

    if (!isValid) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Shares the mapping with the register form so a network/CSP failure
        // reads the same everywhere instead of surfacing "Failed to fetch".
        setServerError(toUserFacingAuthMessage(error, 'A apărut o eroare. Te rugăm să încerci din nou.'));
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setServerError(
        toUserFacingAuthMessage(
          err as { message?: string; name?: string },
          'A apărut o eroare. Te rugăm să încerci din nou.'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Bun revenit!</h1>
        <p className={styles.subtitle}>Intră în contul tău pentru a continua</p>
      </div>

      <SocialAuthButtons redirectTo={redirectTo} />

      <div className={styles.divider}>sau</div>

      {serverError && <div className={styles.serverErrorAlert}>{serverError}</div>}

      <form
        className={`${styles.form} ${isShaking ? styles.shake : ''}`}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className={styles.field}>
          <label htmlFor="login-email" className={styles.label}>
            Email
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${styles.input} ${emailError ? styles.inputError : ''}`}
              placeholder="nume@exemplu.ro"
              disabled={isLoading}
            />
          </div>
          {emailError && <span className={styles.fieldError}>{emailError}</span>}
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="login-password" className={styles.label}>
              Parolă
            </label>
            <Link href="/reset-password" className={styles.forgotLink}>
              Ai uitat parola?
            </Link>
          </div>
          <div className={styles.inputWrapper}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
              placeholder="••••••••"
              disabled={isLoading}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Ascunde' : 'Arată'}
            </button>
          </div>
          {passwordError && <span className={styles.fieldError}>{passwordError}</span>}
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Se autentifică...
            </>
          ) : (
            'Intră în cont'
          )}
        </button>
      </form>

      <div className={styles.footer}>
        Nu ai cont?{' '}
        <Link href="/register" className={styles.registerLink}>
          Înregistrează-te
        </Link>
      </div>
    </div>
  );
}
