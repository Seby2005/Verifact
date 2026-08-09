import React from 'react';
import styles from './Logo.module.css';

export interface LogoProps {
  /** `full` renders "Verifact"; `mark` renders just "V" for small/icon use. */
  variant?: 'full' | 'mark';
  className?: string;
}

/**
 * The Verifact wordmark, set between square brackets — the brand mark. Size is
 * inherited from the parent's font-size, so callers control scale by setting it.
 */
export const Logo: React.FC<LogoProps> = ({ variant = 'full', className }) => (
  <span className={[styles.logo, className].filter(Boolean).join(' ')} aria-label="Verifact">
    <span className={`${styles.bracket} ${styles.bracketLeft}`} aria-hidden="true" />
    <span>{variant === 'mark' ? 'V' : 'Verifact'}</span>
    <span className={`${styles.bracket} ${styles.bracketRight}`} aria-hidden="true" />
  </span>
);
