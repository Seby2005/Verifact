'use client';
import { useState } from 'react';
import styles from './ShareButtons.module.css';

interface ShareButtonsProps {
  reportId: string;
  reportUrl: string;
  disclaimer: string;
}

export function ShareButtons({ reportId, reportUrl, disclaimer }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(reportUrl);
      } else {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = reportUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Silently fail
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=Am+verificat+o+afirmatie+cu+AI+Fact-Checker:&url=${encodeURIComponent(reportUrl)}`;
  const mailtoUrl = `mailto:?subject=Raport+AI+Fact-Checker&body=Verificare+realizata+de+AI+Fact-Checker:%0A%0A${encodeURIComponent(reportUrl)}`;

  return (
    <div className={styles.wrapper}>
      <p className={styles.disclaimer} role="note">
        {disclaimer}
      </p>

      <div className={styles.actions}>
        <button
          id={`copy-link-${reportId}`}
          className={`${styles.btn} ${styles.copyBtn}`}
          onClick={handleCopyLink}
          type="button"
          aria-label="Copiaza link-ul raportului"
        >
          {copied ? '✓ Link copiat!' : '🔗 Copiaza link'}
        </button>

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.btn} ${styles.twitterBtn}`}
          aria-label="Partajeaza pe Twitter"
        >
          𝕏 Partajeaza
        </a>

        <a
          href={mailtoUrl}
          className={`${styles.btn} ${styles.emailBtn}`}
          aria-label="Trimite prin email"
        >
          ✉ Email
        </a>

        <a
          href={`mailto:contact@factcheck-ai.app?subject=Eroare+raport+${reportId}&body=Raport+ID:+${reportId}%0A%0ADescrierea+erorii:`}
          className={`${styles.btn} ${styles.reportBtn}`}
          aria-label="Raporteaza o eroare in acest raport"
        >
          ⚠ Raporteaza eroare
        </a>
      </div>
    </div>
  );
}
