import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Column 1: Brand & Tagline */}
          <div className={styles.colBrand}>
            <Link href="/" className={styles.brand} aria-label="FactCheck AI Pagina principală">
              <svg
                className={styles.logoIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>FactCheck AI</span>
            </Link>
            <p className={styles.tagline}>
              Instrument open source de verificare a știrilor și conținutului digital folosind inteligență artificială transparentă și baze de date verificate.
            </p>
            <div className={styles.openSourceBadge}>
              <span>Open Source cu ❤️ pentru adevăr</span>
            </div>
          </div>

          {/* Column 2: Product Links */}
          <div>
            <h2 className={styles.colTitle}>Produs</h2>
            <ul className={styles.linkList}>
              <li>
                <Link href="/" className={styles.link}>
                  Acasă
                </Link>
              </li>
              <li>
                <Link href="/reports" className={styles.link}>
                  Rapoarte publice
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={styles.link}>
                  Prețuri & Abonamente
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className={styles.link}>
                  Cum funcționează
                </Link>
              </li>
              <li>
                <Link href="/transparency" className={styles.link}>
                  Transparență & Algoritm
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: External & Resources */}
          <div>
            <h2 className={styles.colTitle}>Resurse & Comunitate</h2>
            <ul className={styles.linkList}>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    className={styles.externalIcon}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a
                  href="/transparency#api-docs"
                  className={styles.link}
                >
                  Documentație API
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Contribuie la proiect
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Raportează o problemă
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className={styles.bottomRow}>
          <span>© 2025 FactCheck AI. Licențiat MIT.</span>
          <span>Construit cu Next.js · Gemini AI · Supabase</span>
        </div>
      </div>
    </footer>
  );
};
