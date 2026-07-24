'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LayerStatus } from '@/types/verification';
import styles from './ProgressTracker.module.css';

export interface StepItem {
  id: string;
  label: string;
  icon: string;
  status: LayerStatus;
  estimatedSec: number;
}

export interface ProgressTrackerProps {
  reportId?: string | null;
  onComplete?: (reportId: string) => void;
  onError?: (error: string) => void;
  onRetry?: () => void;
}

const defaultSteps: StepItem[] = [
  { id: 'ocr_text', label: 'Analizez conținutul extras...', icon: '🔍', status: 'done', estimatedSec: 2 },
  { id: 'layer1', label: 'Caut în baze de date de fact-checking...', icon: '📚', status: 'loading', estimatedSec: 5 },
  { id: 'layer2', label: 'Caut în știri convenționale...', icon: '📰', status: 'pending', estimatedSec: 5 },
  { id: 'layer3', label: 'Verific surse oficiale și guvernamentale...', icon: '🏛️', status: 'pending', estimatedSec: 5 },
  { id: 'layer4', label: 'Verific declarații pe rețele sociale...', icon: '💬', estimatedSec: 5, status: 'pending' },
  { id: 'analysis', label: 'Analizez cu AI (Gemini 2.0 Flash)...', icon: '🤖', estimatedSec: 8, status: 'pending' },
];

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  reportId,
  onComplete,
  onError,
  onRetry,
}) => {
  const router = useRouter();
  const [steps, setSteps] = useState<StepItem[]>(defaultSteps);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Polling mechanism if reportId is provided
  const pollStatus = useCallback(async (): Promise<void> => {
    if (!reportId) return;

    try {
      const response = await fetch(`/api/reports/${reportId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.report || data.id) {
          // Report is ready
          setSteps((prev) =>
            prev.map((s) => ({ ...s, status: s.status === 'unavailable' ? 'unavailable' : 'done' }))
          );
          setIsFinished(true);
          onComplete?.(reportId);
        }
      }
    } catch {
      // Ignore transient polling errors
    }
  }, [reportId, onComplete]);

  // Status check loop with 45s max duration timeout
  useEffect(() => {
    if (isFinished || hasError) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= 45) {
          clearInterval(interval);
          setHasError(true);
          const err = 'Verificarea a depășit timpul maxim permis (45s). Te rugăm să reîncerci.';
          setErrorMessage(err);
          onError?.(err);
        }
        return next;
      });

      if (reportId) {
        pollStatus();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [reportId, isFinished, hasError, pollStatus, onError]);

  // Calculate dynamic progress percentage
  const completedCount = steps.filter((s) => s.status === 'done' || s.status === 'unavailable').length;
  const progressPercentage = Math.min(Math.round((completedCount / steps.length) * 100), 100);

  // Remaining time calculation
  const remainingSec = Math.max(
    0,
    steps
      .filter((s) => s.status === 'pending' || s.status === 'loading')
      .reduce((sum, s) => sum + s.estimatedSec, 0) - Math.floor(elapsedSeconds / 2)
  );

  const handleGoToReport = (): void => {
    if (reportId) {
      router.push(`/reports/${reportId}`);
    }
  };

  return (
    <div className={styles.container} aria-label="Progres verificare în timp real">
      <div className={styles.header}>
        <h3 className={styles.title}>
          {hasError ? 'A apărut o eroare la verificare' : isFinished ? '✓ Verificare finalizată!' : 'Verificăm în timp real...'}
        </h3>
        <p className={styles.subtitle}>
          {hasError
            ? errorMessage
            : isFinished
            ? 'Raportul este gata. Se încarcă rezultatele...'
            : `Timp scurs: ${elapsedSeconds}s · ~${remainingSec}s rămase`}
        </p>
      </div>

      {!hasError && (
        <>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={styles.progressFill}
              style={{ '--progress-width': `${progressPercentage}%` } as React.CSSProperties}
            />
          </div>

          <div className={styles.timerRow}>
            <span>
              Progres: {completedCount} din {steps.length} pași finalizați
            </span>
            <span>{progressPercentage}%</span>
          </div>

          <div className={styles.stepsList}>
            {steps.map((step) => {
              const isDone = step.status === 'done';
              const isLoading = step.status === 'loading';
              const isUnavailable = step.status === 'unavailable';
              const isStepErr = step.status === 'error';

              return (
                <div
                  key={step.id}
                  className={`${styles.stepItem} ${
                    isDone
                      ? styles.completedStep
                      : isLoading
                      ? styles.currentStep
                      : isUnavailable
                      ? styles.unavailableStep
                      : isStepErr
                      ? styles.errorStep
                      : styles.pendingStep
                  }`}
                >
                  <div className={styles.stepIcon}>
                    {isDone ? (
                      <span className={styles.checkIcon}>✓</span>
                    ) : isUnavailable ? (
                      <span className={styles.warnIcon}>⚠️</span>
                    ) : isStepErr ? (
                      <span className={styles.errorIcon}>✕</span>
                    ) : isLoading ? (
                      <span className={styles.spinner} />
                    ) : (
                      <span className={styles.pendingDot} />
                    )}
                  </div>
                  <span>{step.icon}</span>
                  <span className={styles.stepLabel}>
                    {step.label}
                    {isUnavailable && <em className={styles.unavailBadge}> (Indisponibil)</em>}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {isFinished && reportId && (
        <div className={styles.actionArea}>
          <Button variant="primary" size="lg" onClick={handleGoToReport}>
            Vezi raportul complet →
          </Button>
        </div>
      )}

      {hasError && (
        <div className={styles.actionAreaGap}>
          <Button variant="outline" size="md" onClick={onRetry}>
            Reîncearcă verificarea
          </Button>
        </div>
      )}
    </div>
  );
};
