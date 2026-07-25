import React from 'react';
import Link from 'next/link';
import { FOOTER_SECTIONS, REPO_URL } from '../routes';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <p className={styles.wordmark}>Verifact</p>
            {/* The privacy promise is repeated here, on /cont and on
                /open-source — the three places a user decides whether to
                trust us with something. */}
            <p className={styles.privacy}>
              Totul este privat. Rapoartele tale, istoricul tău și contul tău
              rămân ale tale — nu vindem date și nu publicăm nimic fără să ceri
              tu asta explicit.
            </p>
          </div>

          <div className={styles.columns}>
            {FOOTER_SECTIONS.map((section) => (
              <nav key={section.title} className={styles.column} aria-label={section.title}>
                <p className={styles.columnTitle}>{section.title}</p>
                <ul className={styles.columnList}>
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={styles.link}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>&copy; {year} Verifact. Licență MIT.</p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.link}
          >
            Cod sursă pe GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};
