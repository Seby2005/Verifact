import React from 'react';
import Link from 'next/link';
import { Hero, VerifySection, AnimatedStats, HowItWorks, ImpactStats, Testimonials, FinalCTA } from '@/components/home';

export const metadata = {
  title: 'AI Fact-Checker — Verificare instantă de știri și dezinformare',
  description: 'Aplicație open source de fact-checking. Verifică instant screenshot-uri, text și URL-uri cu inteligență artificială transparentă și surse jurnalistice/oficiale.',
};

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      <section style={{ backgroundColor: 'var(--color-gray-50)', padding: '4rem 1rem', borderTop: '1px solid var(--color-gray-100)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: '1rem' }}>
            Transparență Radicală & Cod Sursă Deschis
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--color-gray-600)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Proiectul nostru este 100% open source под licență MIT. Algoritmul de fact-checking, sursele interogate și formulele de scoring sunt publice. Nu luăm decizii editoriale politice.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/transparency" style={{ textDecoration: 'none' }}>
              <span style={{ display: 'inline-block', padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-primary)', color: '#fff', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem' }}>
                Vezi explicația algoritmului →
              </span>
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <span style={{ display: 'inline-block', padding: '0.75rem 1.25rem', backgroundColor: '#fff', color: 'var(--color-gray-800)', border: '1px solid var(--color-gray-300)', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem' }}>
                Codul pe GitHub (MIT License)
              </span>
            </a>
          </div>
        </div>
      </section>

      <Testimonials />
      <FinalCTA />
    </main>
  );
}
