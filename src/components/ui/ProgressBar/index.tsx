import React from 'react';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number; // 0 - 100
  variant?: 'linear' | 'circular';
  size?: number; // size in px for circular
  showValueLabel?: boolean;
  label?: string;
  className?: string;
}

function getVerdictStyleClass(val: number): string {
  if (val >= 85) return styles.verdictTrue;
  if (val >= 60) return styles.verdictPartial;
  if (val >= 40) return styles.verdictUnclear;
  return styles.verdictFalse;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'linear',
  size = 120,
  showValueLabel = true,
  label,
  className = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const verdictClass = getVerdictStyleClass(clampedValue);

  if (variant === 'circular') {
    const strokeWidth = Math.max(6, Math.round(size * 0.08));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

    return (
      <div
        className={`${styles.circularWrapper} ${className}`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Scor veridicitate: ${clampedValue}%`}
      >
        <svg width={size} height={size} className={styles.svg}>
          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className={styles.circularTrack}
          />
          {/* Animated progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className={`${styles.circularProgress} ${verdictClass}`}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {showValueLabel ? (
          <div className={styles.centerLabel}>
            <span className={`${styles.scoreNumber} ${verdictClass}`}>
              {clampedValue}%
            </span>
            {label ? <span className={styles.subText}>{label}</span> : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`${styles.linearContainer} ${className}`}>
      {label || showValueLabel ? (
        <div className={styles.labelRow}>
          {label ? <span className={styles.linearLabel}>{label}</span> : <div />}
          {showValueLabel ? (
            <span className={`${styles.linearValue} ${verdictClass}`}>
              {clampedValue}%
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={styles.linearTrack}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${styles.linearFill} ${verdictClass}`}
          style={{ '--progress-width': `${clampedValue}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
};
