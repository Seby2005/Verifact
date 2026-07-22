'use client';

import React, { useState } from 'react';
import { Hero, AnimatedStats, HowItWorks, ImpactStats, Testimonials, FinalCTA } from '@/components/home';
import { VerifyForm, VerifyFormData } from '@/components/verify/VerifyForm';
import { ProgressTracker } from '@/components/verify/ProgressTracker';
import { Card, Badge, Button } from '@/components/ui';

export default function HomePage() {
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [lastSubmittedData, setLastSubmittedData] = useState<VerifyFormData | null>(null);

  const handleFormSubmit = async (data: VerifyFormData): Promise<void> => {
    setLastSubmittedData(data);
    setIsComplete(false);
    setIsVerifying(true);
  };

  const handleProgressComplete = (): void => {
    setIsVerifying(false);
    setIsComplete(true);
  };

  const handleReset = (): void => {
    setIsVerifying(false);
    setIsComplete(false);
    setLastSubmittedData(null);
  };

  return (
    <>
      <Hero />

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        {!isVerifying && !isComplete && (
          <VerifyForm onSubmit={handleFormSubmit} />
        )}

        {isVerifying && (
          <ProgressTracker autoPlay onComplete={handleProgressComplete} />
        )}

        {isComplete && (
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <Card variant="default" padding="lg">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge variant="partial">⚠️ PARȚIAL ADEVĂRAT (67%)</Badge>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                    Sprint 1 — Stub Raport
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--color-gray-100)', paddingTop: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: '0.5rem' }}>
                    Afirmația analizată:
                  </h3>
                  <blockquote style={{ fontSize: '0.95rem', color: 'var(--color-gray-700)', fontStyle: 'italic', background: 'var(--color-gray-50)', padding: '0.75rem 1rem', borderRadius: '6px', borderLeft: '3px solid var(--color-primary)' }}>
                    &ldquo;{lastSubmittedData?.text || 'Conținut de verificat'}&rdquo;
                  </blockquote>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                  Raport real detaliat și căutare multi-strat disponibilă în Sprint 2. Conținutul a fost procesat cu succes și extras corect.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <Button variant="primary" size="md" onClick={handleReset}>
                    Verifică alt conținut
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <AnimatedStats />
      <HowItWorks />
      <ImpactStats />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
