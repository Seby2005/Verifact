import React from 'react';
import Link from 'next/link';
import { Hero, VerifySection, AnimatedStats, HowItWorks, ImpactStats, Testimonials, FinalCTA } from '@/components/home';
import styles from './Home.module.css';

export const metadata = {
  title: 'AI Fact-Checker — Verificare instantă de știri și dezinformare',
  description: 'Aplicație open source de fact-checking. Verifică instant screenshot-uri, text și URL-uri cu inteligență artificială transparentă și surse jurnalistice/oficiale.',
};

export default function HomePage() {
  return (
    <main className={styles.main}>
      {/* Above the fold: Hero + Formular de verificare */}
      <Hero />

      <React.Suspense fallback={null}>
        <VerifySection />
      </React.Suspense>

      {/* Statistici reale preluated din DB */}
      <AnimatedStats />

      {/* Cum funcționează secțiunea vizuală 3-4 pași */}
      <HowItWorks />

      <ImpactStats />

      {/* Secțiune Încredere & Transparență / Open Source */}
      <section className={styles.transparencySection}>
        <div className={styles.transparencyContainer}>
          <h2 className={styles.transparencyTitle}>
            Transparență Radicală & Cod Sursă Deschis
          </h2>
          <p className={styles.transparencyDesc}>
            Proiectul nostru este 100% open source sub licență MIT. Algoritmul de fact-checking, sursele interogate și formulele de scoring sunt publice. Nu luăm decizii editoriale politice.
          </p>
          <div className={styles.transparencyBtnGroup}>
            <Link href="/transparency" className={styles.primaryBtn}>
              Vezi explicația algoritmului →
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryBtn}
            >
              Codul pe GitHub (MIT License)
            </a>
          </div>
        </div>
      </section>

      <Testimonials />
      <FinalCTA />
    </main>
  );
}
