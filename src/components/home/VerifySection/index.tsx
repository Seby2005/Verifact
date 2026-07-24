'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VerifyForm } from '@/components/verify/VerifyForm';
import { ProgressTracker } from '@/components/verify/ProgressTracker';
import type { VerificationInput } from '@/types/verification';
import styles from './VerifySection.module.css';

export const VerifySection: React.FC = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (input: VerificationInput): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          inputType: input.inputType || input.type || 'text',
          inputText: input.text,
          inputUrl: input.url,
          language: input.language === 'en' ? 'en' : 'ro',
          isPublic: input.isPublic,
        }),
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'A apărut o eroare la inițierea verificării.');
      }

      if (data.reportId) {
        setCurrentReportId(data.reportId);
      } else {
        throw new Error('Răspunsul de la server nu conține un ID de raport valid.');
      }
    } catch (err: unknown) {
      let message = 'A apărut o eroare neașteptată la trimiterea cererii de verificare.';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          message = 'Conexiunea cu serverul a expirat (10s). Vă rugăm să reîncercați.';
        } else {
          message = err.message;
        }
      }
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  const handleProgressComplete = (reportId: string): void => {
    router.push(`/reports/${reportId}`);
  };

  const handleProgressError = (err: string): void => {
    setErrorMessage(err);
    setIsSubmitting(false);
    setCurrentReportId(null);
  };

  return (
    <section id="verify-section" className={styles.verifySection} aria-label="Sectiune verificare stiri">
      <div className={styles.container}>
        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              className={styles.dismissBtn}
              onClick={() => setErrorMessage(null)}
              aria-label="Închide eroarea"
            >
              ✕
            </button>
          </div>
        )}

        {!currentReportId ? (
          <React.Suspense fallback={<div className={styles.loadingFallback}>Se încarcă formularul de verificare...</div>}>
            <VerifyForm onSubmit={handleSubmit} isLoading={isSubmitting} />
          </React.Suspense>
        ) : (
          <div className={styles.trackerWrapper}>
            <ProgressTracker
              reportId={currentReportId}
              onComplete={handleProgressComplete}
              onError={handleProgressError}
            />
          </div>
        )}
      </div>
    </section>
  );
};
