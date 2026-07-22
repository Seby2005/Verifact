'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import styles from './Hero.module.css';

export const Hero: React.FC = () => {
  const scrollTo = (selector: string): void => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className={styles.section} aria-label="Hero">
      <div className={styles.badge}>
        <span>🆕 Acum disponibil în română</span>
      </div>

      <h1 className={styles.title}>
        Verifică orice știre în<br />
        secunde, cu <span className={styles.highlight}>AI</span>
      </h1>

      <p className={styles.subtitle}>
        Încarcă un screenshot, introdu un text sau un URL și primești instant un raport detaliat cu surse verificabile. Gratuit, transparent și open source.
      </p>

      <div className={styles.ctaGroup}>
        <Button
          variant="primary"
          size="lg"
          onClick={() => scrollTo('#verify-section')}
        >
          Verifică acum — gratuit
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => scrollTo('#how-it-works')}
        >
          Cum funcționează?
        </Button>
      </div>

      <p className={styles.disclaimer}>
        Fără cont necesar · 10 verificări gratuite/lună · Open Source
      </p>
    </section>
  );
};
