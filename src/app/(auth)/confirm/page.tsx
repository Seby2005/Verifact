'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import styles from './Confirm.module.css';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'adresa ta de email';

  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  const supabase = createBrowserClient();

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resendStatus === 'loading') return;

    setResendStatus('loading');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setResendStatus('error');
      } else {
        setResendStatus('sent');
        setCooldown(60);
      }
    } catch {
      setResendStatus('error');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>✉️</div>

      <h1 className={styles.title}>Verifică-ți emailul</h1>

      <p className={styles.description}>
        Am trimis un email de confirmare la{' '}
        <span className={styles.emailHighlight}>{email}</span>. Verifică inbox-ul (și dosarul de spam) și apasă pe link-ul din email pentru a-ți activa contul.
      </p>

      {resendStatus === 'sent' && (
        <span className={styles.notice}>Emailul de confirmare a fost retrimis!</span>
      )}
      {resendStatus === 'error' && (
        <span className={`${styles.notice} ${styles.noticeError}`}>
          Nu am putut retrimite emailul. Încearcă din nou mai târziu.
        </span>
      )}

      <button
        type="button"
        className={styles.resendBtn}
        onClick={handleResend}
        disabled={cooldown > 0 || resendStatus === 'loading'}
      >
        {cooldown > 0 ? `Retrimite emailul (${cooldown}s)` : 'Retrimite emailul'}
      </button>

      <Link href="/login" className={styles.backToLogin}>
        Înapoi la autentificare
      </Link>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Se încarcă...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
