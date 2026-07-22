import React from 'react';
import type { Metadata } from 'next';
import { Hero, AnimatedStats, HowItWorks, ImpactStats, Testimonials, FinalCTA } from '@/components/home';
import { VerifyForm } from '@/components/verify/VerifyForm';

export const metadata: Metadata = {
  title: 'FactCheck AI — Verificare știri cu inteligență artificială',
  description:
    'Verifică instant dacă o știre este adevărată sau falsă. Upload screenshot, text sau URL și primești un raport detaliat cu surse. Gratuit, open source, în română.',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        <VerifyForm />
      </div>
      <AnimatedStats />
      <HowItWorks />
      <ImpactStats />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
