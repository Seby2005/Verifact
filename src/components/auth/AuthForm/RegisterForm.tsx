'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import styles from '@/app/(auth)/register/Register.module.css';

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const supabase = createBrowserClient();

  // Evaluare criterii parolă
  const hasMin8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);

  const criteriaMetCount = [hasMin8, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  let strengthLabel = '';
  let strengthClass = '';

  if (password.length > 0) {
    if (criteriaMetCount <= 2) {
      strengthLabel = 'Parolă slabă';
      strengthClass = styles.weak;
    } else if (criteriaMetCount === 3) {
      strengthLabel = 'Parolă medie';
      strengthClass = styles.medium;
    } else {
      strengthLabel = 'Parolă puternică';
      strengthClass = styles.strong;
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());
  const isPasswordValid = hasMin8;
  const doPasswordsMatch = password === confirmPassword;

  const isFormValid = isEmailValid && isPasswordValid && doPasswordsMatch && agreedTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setServerError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setServerError('Există deja un cont înregistrat cu acest email.');
        } else {
          setServerError(error.message || 'A apărut o eroare la înregistrare.');
        }
      } else {
        router.push(`/confirm?email=${encodeURIComponent(email.trim())}`);
      }
    } catch {
      setServerError('A apărut o eroare neașteptată. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Creează cont gratuit</h1>
        <p className={styles.subtitle}>Fără card de credit. Anulezi oricând.</p>
      </div>

      <SocialAuthButtons />

      <div className={styles.divider}>sau</div>

      {serverError && <div className={styles.serverErrorAlert}>{serverError}</div>}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="reg-email" className={styles.label}>
            Email
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="nume@exemplu.ro"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="reg-password" className={styles.label}>
            Parolă
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {password.length > 0 && (
            <div className={styles.strengthContainer}>
              <div className={styles.strengthMeter}>
                <div className={`${styles.segment} ${criteriaMetCount >= 1 ? strengthClass : ''}`} />
                <div className={`${styles.segment} ${criteriaMetCount >= 2 ? strengthClass : ''}`} />
                <div className={`${styles.segment} ${criteriaMetCount >= 3 ? strengthClass : ''}`} />
                <div className={`${styles.segment} ${criteriaMetCount >= 4 ? strengthClass : ''}`} />
              </div>
              <span className={`${styles.strengthText} ${strengthClass}`}>{strengthLabel}</span>

              <div className={styles.criteriaList}>
                <div className={`${styles.criterion} ${hasMin8 ? styles.met : ''}`}>
                  {hasMin8 ? '✓' : '○'} Minim 8 caractere
                </div>
                <div className={`${styles.criterion} ${hasUpper ? styles.met : ''}`}>
                  {hasUpper ? '✓' : '○'} Cel puțin o literă mare
                </div>
                <div className={`${styles.criterion} ${hasDigit ? styles.met : ''}`}>
                  {hasDigit ? '✓' : '○'} Cel puțin o cifră
                </div>
                <div className={`${styles.criterion} ${hasSpecial ? styles.met : ''}`}>
                  {hasSpecial ? '✓' : '○'} Caracter special (@, !, #)
                </div>
              </div>
            </div>
          )}
        </div>

        {password.length > 0 && (
          <div className={styles.field}>
            <label htmlFor="reg-confirm" className={styles.label}>
              Confirmă parola
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${styles.input} ${
                  confirmPassword && !doPasswordsMatch ? styles.inputError : ''
                }`}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
            {confirmPassword && !doPasswordsMatch && (
              <span className={styles.fieldError}>Parolele nu se potrivesc</span>
            )}
          </div>
        )}

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            disabled={isLoading}
          />
          <span>
            Sunt de acord cu{' '}
            <Link href="/terms" className={styles.checkboxLink} target="_blank">
              Termenii și condițiile
            </Link>{' '}
            și{' '}
            <Link href="/privacy" className={styles.checkboxLink} target="_blank">
              Politica de confidențialitate
            </Link>
          </span>
        </label>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Se creează contul...
            </>
          ) : (
            'Înregistrează-te'
          )}
        </button>
      </form>

      <div className={styles.footer}>
        Ai deja un cont?{' '}
        <Link href="/login" className={styles.loginLink}>
          Intră în cont
        </Link>
      </div>
    </div>
  );
}
