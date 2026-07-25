import React from 'react';
import styles from './Footer.module.css';

const REPO_URL = 'https://github.com/Seby2005/fact-checker-ai';
const LICENSE_URL = 'https://opensource.org/licenses/MIT';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.tagline}>
          AI Fact-Checker verifică afirmații și conținut din social media folosind
          surse publice și inteligență artificială. Algoritmul de verificare este
          open source și documentat public.
        </p>

        <div className={styles.links}>
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={styles.link}>
            Cod sursă (GitHub)
          </a>
          <a href={LICENSE_URL} target="_blank" rel="noreferrer noopener" className={styles.link}>
            Licență MIT
          </a>
        </div>

        <p className={styles.copyright}>&copy; {year} AI Fact-Checker. Proiect open source.</p>
      </div>
    </footer>
  );
};
