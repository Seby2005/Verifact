import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './Hero.module.css';

export const Hero: React.FC = () => {
  return (
    <section className={styles.section} aria-label="Hero">
      <div className={styles.badge}>
        <span>🛡️ Transparență maximă & Cod Open Source</span>
      </div>

      <h1 className={styles.title}>
        Acces instant la adevăr, prin <br />
        <span className={styles.highlight}>inteligență artificială</span> și surse verificabile
      </h1>

      <p className={styles.subtitle}>
        Încarcă un screenshot sau introdu text/URL și primești un raport detaliat de veridicitate cu surse oficiale citate în sub 30 de secunde. Fără manipulare, fără partizanat politic.
      </p>

      <div className={styles.ctaGroup}>
        <Link href="#verify-section">
          <Button variant="primary" size="lg">
            Verifică acum — gratuit
          </Button>
        </Link>
        <Link href="#how-it-works">
          <Button variant="outline" size="lg">
            Cum funcționează?
          </Button>
        </Link>
      </div>

      <p className={styles.disclaimer}>
        Fără cont obligatoriu · 10 verificări gratuite/lună · Licență MIT
      </p>
    </section>
  );
};
