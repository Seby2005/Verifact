'use client';

import React, { useState } from 'react';
import styles from './FlagReportButton.module.css';

interface FlagReportButtonProps {
  reportId: string;
}

export function FlagReportButton({ reportId }: FlagReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg('Trebuie să fii autentificat pentru a semnala un raport.');
        } else {
          setErrorMsg(data.error || 'A apărut o eroare la trimiterea semnalării.');
        }
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
      setIsOpen(false);
    } catch {
      setErrorMsg('A apărut o eroare de rețea. Te rugăm să reîncerci.');
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.flagContainer}>
        <span className={styles.successMessage}>
          ✓ Raportul a fost semnalat echipei de moderare. Mulțumim!
        </span>
      </div>
    );
  }

  return (
    <div className={styles.flagContainer}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={styles.flagBtn}
        aria-label="Semnalează acest raport"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        Semnalează acest raport
      </button>

      {isOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Semnalează un raport public</h3>
            <p className={styles.modalText}>
              Dacă consideri că acest raport încalcă regulile platformei, conține date personale sau informații abuzive, trimite o semnalare echipei noastre.
            </p>

            <form onSubmit={handleSubmit}>
              <textarea
                className={styles.textarea}
                placeholder="Motivul semnalării (opțional)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />

              {errorMsg && <p className={styles.errorMessage}>{errorMsg}</p>}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Anulează
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Se trimite...' : 'Trimite semnalarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
