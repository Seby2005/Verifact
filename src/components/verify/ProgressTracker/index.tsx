'use client';

import React, { useState, useEffect } from 'react';
import styles from './ProgressTracker.module.css';

export interface ProgressStep {
  id: string;
  label: string;
  icon: string;
  estimatedDuration: number;
}

export interface ProgressTrackerProps {
  steps?: ProgressStep[];
  currentStepIndex?: number;
  isComplete?: boolean;
  onComplete?: () => void;
  autoPlay?: boolean;
}

const defaultSteps: ProgressStep[] = [
  { id: '1', label: 'Analizez conținutul...', icon: '🔍', estimatedDuration: 2000 },
  { id: '2', label: 'Caut în baze de fact-checking...', icon: '📚', estimatedDuration: 5000 },
  { id: '3', label: 'Verific știrile convenționale...', icon: '📰', estimatedDuration: 5000 },
  { id: '4', label: 'Consult surse oficiale...', icon: '🏛️', estimatedDuration: 5000 },
  { id: '5', label: 'Verific declarații publice...', icon: '💬', estimatedDuration: 5000 },
  { id: '6', label: 'Generez raportul cu AI...', icon: '🤖', estimatedDuration: 8000 },
];

const motivationalMessages = [
  'Verificăm în baze de date internaționale...',
  'Comparăm cu surse jurnalistice verificate...',
  'Consultăm documente oficiale...',
  'Aproape gata! AI-ul analizează rezultatele...',
];

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  steps = defaultSteps,
  currentStepIndex = 0,
  isComplete = false,
  onComplete,
  autoPlay = false,
}) => {
  const [activeStep, setActiveStep] = useState<number>(currentStepIndex);
  const [motivationalIdx, setMotivationalIdx] = useState<number>(0);

  // Sync external prop if changed
  useEffect(() => {
    setActiveStep(currentStepIndex);
  }, [currentStepIndex]);

  // Handle autoPlay mode for demo/simulation
  useEffect(() => {
    if (!autoPlay || isComplete) return;

    if (activeStep >= steps.length) {
      onComplete?.();
      return;
    }

    const currentStepConfig = steps[activeStep];
    const timer = setTimeout(() => {
      if (activeStep < steps.length - 1) {
        setActiveStep((prev) => prev + 1);
      } else {
        onComplete?.();
      }
    }, currentStepConfig.estimatedDuration);

    return () => clearTimeout(timer);
  }, [autoPlay, activeStep, steps, isComplete, onComplete]);

  // Motivational quote rotator every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setMotivationalIdx((prev) => (prev + 1) % motivationalMessages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate remaining time estimation in seconds
  const remainingTimeSeconds = Math.ceil(
    steps
      .slice(activeStep)
      .reduce((acc, step) => acc + step.estimatedDuration, 0) / 1000
  );

  const progressPercentage = Math.min(
    isComplete ? 100 : Math.round(((activeStep + 0.5) / steps.length) * 100),
    100
  );

  return (
    <div className={styles.container} aria-label="Progres verificare în timp real">
      <div className={styles.header}>
        <h3 className={styles.title}>Verificăm pentru tine...</h3>
        <p className={styles.subtitle}>
          {isComplete
            ? '✓ Verificare finalizată!'
            : steps[activeStep]?.label || 'Procesez conținutul...'}
        </p>
      </div>

      {/* Progress Bar */}
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuenow={progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className={styles.timerRow}>
        <span>
          Pasul {Math.min(activeStep + 1, steps.length)} din {steps.length}
        </span>
        <span>
          {isComplete
            ? 'Gata!'
            : `~${remainingTimeSeconds} secunde rămase`}
        </span>
      </div>

      {/* Steps List */}
      <div className={styles.stepsList}>
        {steps.map((step, idx) => {
          const isDone = idx < activeStep || isComplete;
          const isCurrent = idx === activeStep && !isComplete;

          return (
            <div
              key={step.id}
              className={`${styles.stepItem} ${
                isDone
                  ? styles.completedStep
                  : isCurrent
                  ? styles.currentStep
                  : styles.pendingStep
              }`}
            >
              <div className={styles.stepIcon}>
                {isDone ? (
                  <span className={styles.checkIcon}>✓</span>
                ) : isCurrent ? (
                  <span className={styles.spinner} />
                ) : (
                  <span className={styles.pendingDot} />
                )}
              </div>
              <span>{step.icon}</span>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Motivational message rotator */}
      <div className={styles.motivationalText}>
        <span>💡 {motivationalMessages[motivationalIdx]}</span>
      </div>
    </div>
  );
};
