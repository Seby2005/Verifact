import React from 'react';
import { getScoreColor } from '@/lib/constants/verdicts';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number; // 0 - 100
  variant?: 'linear' | 'circular';
  size?: number; // size in px for circular, height for linear
  showValueLabel?: boolean;
  label?: string;
  className?: string;
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
  const dynamicColor = getScoreColor(clampedValue);

  if (variant === 'circular') {
    const strokeWidth = Math.max(6, Math.round(size * 0.08));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

    return (
      <div
        className={`${styles.circularWrapper} ${className}`}
        style={{ width: size, height: size }}
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
            className={styles.circularProgress}
            style={{
              stroke: dynamicColor,
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>

        {showValueLabel ? (
          <div className={styles.centerLabel}>
            <span className={styles.scoreNumber} style={{ color: dynamicColor }}>
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
            <span className={styles.linearValue} style={{ color: dynamicColor }}>
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
          className={styles.linearFill}
          style={{
            width: `${clampedValue}%`,
            backgroundColor: dynamicColor,
          }}
        />
      </div>
    </div>
  );
};
