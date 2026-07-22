'use client';

import React from 'react';
import styles from './VerifyForm.module.css';

export interface VerifyFormProps {
  onVerifyStub?: () => void;
}

export const VerifyForm: React.FC<VerifyFormProps> = () => {
  return (
    <div id="verify-section" className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Ce vrei să verifici?</span>
      </div>
      <div className={styles.placeholderBox}>
        <p>Formularul de verificare se încarcă...</p>
      </div>
    </div>
  );
};
