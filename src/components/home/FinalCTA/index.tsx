'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import styles from './FinalCTA.module.css';

export const FinalCTA: React.FC = () => {
  const handleScrollToForm = (): void => {
    const el = document.querySelector('#verify-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className={styles.wrapper} aria-label="Încearcă FactCheck AI">
      <div className={styles.container}>
        <h2 className={styles.title}>Combate dezinformarea acum</h2>
        <p className={styles.subtitle}>
          Gratuit, fără cont necesar și fără limită de timp pentru primele tale verificări.
        </p>
        <div className={styles.ctaBtn}>
          <Button variant="primary" size="lg" onClick={handleScrollToForm}>
            Încearcă gratuit
          </Button>
        </div>
      </div>
    </section>
  );
};
