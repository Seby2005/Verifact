import React from 'react';
import type { Metadata } from 'next';
import { AuthPanel } from '@/components/auth';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Cont',
  description:
    'Creează un cont Verifact sau autentifică-te. Rapoartele și istoricul tău rămân private.',
};

export default function ContPage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Cont</p>
        <h1 className={shell.title}>Intră în cont sau creează unul</h1>
        <p className={shell.lead}>
          Ai nevoie de cont doar dacă vrei să îți păstrezi istoricul
          verificărilor. O verificare simplă funcționează și fără.
        </p>
      </header>

      <div className={`${shell.body} ${styles.layout}`}>
        <AuthPanel />

        <aside className={styles.aside}>
          <h2 className={styles.asideTitle}>Ce se întâmplă cu datele tale</h2>
          <ul className={styles.asideList}>
            <li className={styles.asideItem}>
              <strong className={styles.asideStrong}>Totul este privat.</strong> Rapoartele
              tale, istoricul tău și contul tău rămân ale tale. Un raport devine
              public doar dacă apeși tu butonul de publicare.
            </li>
            <li className={styles.asideItem}>
              <strong className={styles.asideStrong}>Nu vindem date.</strong> Nu
              există brokeri de date, profilare publicitară sau tracker-e
              terțe în Verifact.
            </li>
            <li className={styles.asideItem}>
              <strong className={styles.asideStrong}>Screenshot-urile nu se
              păstrează.</strong> Imaginile încărcate sunt folosite pentru
              extragerea textului și apoi șterse, nu arhivate.
            </li>
            <li className={styles.asideItem}>
              <strong className={styles.asideStrong}>Poți pleca oricând.</strong> Ștergerea
              contului îți șterge și rapoartele, definitiv.
            </li>
          </ul>
          <p className={styles.asideNote}>
            Detaliile complete sunt pe pagina{' '}
            <a href="/open-source" className={styles.textLink}>
              Open source și confidențialitate
            </a>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
