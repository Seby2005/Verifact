'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './AuthLayout.module.css';

const TESTIMONIALS = [
  {
    quote: '„FactCheck AI m-a ajutat să verific rapid o știre virală despre sănătate înainte să o redistribui.”',
    author: 'Elena Radu',
    role: 'Jurnalist independent',
  },
  {
    quote: '„Acuratețea și transparența surselor oferă o încredere uriașă în rezultatele obținute.”',
    author: 'Mihai Ionescu',
    role: 'Cercetător media',
  },
  {
    quote: '„Procesul de verificare durează sub 30 secunde. Excelent pentru verificat știri zilnice!”',
    author: 'Andrei Popa',
    role: 'Utilizator pasionat',
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const currentTestimonial = TESTIMONIALS[currentTestimonialIndex];

  return (
    <div className={styles.container}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandHeader}>
          <Link href="/" className={styles.backLink}>
            ← Înapoi la pagina principală
          </Link>

          <h1 className={styles.brandTitle}>FactCheck AI</h1>
          <p className={styles.brandTagline}>
            Verifică adevărul din știri și rețele sociale cu inteligență artificială transparentă.
          </p>

          <ul className={styles.benefitsList}>
            <li className={styles.benefitItem}>
              <span className={styles.checkIcon}>✓</span>
              <span>Verificare în 30 de secunde</span>
            </li>
            <li className={styles.benefitItem}>
              <span className={styles.checkIcon}>✓</span>
              <span>Surse transparente și verificabile</span>
            </li>
            <li className={styles.benefitItem}>
              <span className={styles.checkIcon}>✓</span>
              <span>Gratuit, fără card de credit</span>
            </li>
          </ul>
        </div>

        <div className={styles.testimonialCard}>
          <p className={styles.quote}>{currentTestimonial.quote}</p>
          <div className={styles.author}>{currentTestimonial.author}</div>
          <div className={styles.authorRole}>{currentTestimonial.role}</div>
        </div>
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.formContainer}>{children}</div>
      </main>
    </div>
  );
}
