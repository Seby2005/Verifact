import React from 'react';
import Link from 'next/link';
import styles from './LimitReached.module.css';

interface LimitReachedProps {
  tier?: 'free' | 'pro' | 'business' | 'anonymous';
  resetsAt?: Date;
  onClose?: () => void;
}

export function LimitReached({ tier = 'free', resetsAt }: LimitReachedProps) {
  const isAnonymous = tier === 'anonymous';

  let daysRemaining = 0;
  if (resetsAt) {
    const diff = resetsAt.getTime() - new Date().getTime();
    daysRemaining = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className={styles.card} data-testid="limit-reached">
      <div className={styles.icon}>⚠️</div>
      <h2 className={styles.title} data-testid="limit-message">
        {isAnonymous ? 'Ai atins limita de verificări anonime' : 'Ai atins limita de verificări'}
      </h2>
      <p className={styles.description}>
        {isAnonymous
          ? 'Utilizatorii neautentificați pot efectua maxim 3 verificări. Creează un cont gratuit pentru a primi 10 verificări lunare!'
          : 'Utilizatorii Free pot face 10 verificări pe lună. Tu le-ai folosit pe toate.'}
      </p>

      {!isAnonymous && (
        <div className={styles.countdown}>
          Limita se resetează în: {daysRemaining} {daysRemaining === 1 ? 'zi' : 'zile'}
        </div>
      )}

      <div className={styles.actions}>
        {isAnonymous ? (
          <>
            <Link href="/register" className={styles.ctaBtn} data-testid="upgrade-cta">
              Creează cont gratuit
            </Link>
            <Link href="/login" className={styles.secondaryBtn}>
              Intră în cont
            </Link>
          </>
        ) : (
          <Link href="/pricing" className={styles.ctaBtn} data-testid="upgrade-cta">
            Upgrade la Pro →
          </Link>
        )}
      </div>
    </div>
  );
}
