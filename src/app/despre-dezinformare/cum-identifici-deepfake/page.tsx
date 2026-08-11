import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import shell from '../../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Cum Identifici un Deepfake sau o Imagine AI (Ghid Practic) — Verifact',
  description:
    'Află cum poți recunoaște ușor imaginile, videoclipurile și vocile generate prin inteligență artificială. Semne vizibile, anomaliile de detaliu și cum verifici rapid o poză suspectă.',
  alternates: {
    canonical: 'https://verifact.ro/despre-dezinformare/cum-identifici-deepfake',
  },
  openGraph: {
    title: 'Cum Identifici un Deepfake sau o Imagine AI — Verifact',
    description:
      'Ghid practic pentru recunoașterea conținutului sintetic și a pozelor modificate pe rețelele sociale.',
    url: 'https://verifact.ro/despre-dezinformare/cum-identifici-deepfake',
    siteName: 'Verifact',
    locale: 'ro_RO',
    type: 'article',
  },
};

export default function DeepfakeGuidePage() {
  return (
    <div className={`container ${styles.guidePage}`}>
      <header className={styles.guideHeader}>
        <span className={styles.categoryTag}>Ghid Educațional</span>
        <h1 className={styles.guideTitle}>Cum identifici un Deepfake sau o imagine generată prin AI</h1>
        <p className={styles.guideLead}>
          Tehnologia generativă a avansat enorm, însă chiar și cele mai performante modele lasă urme microscopice. Iată la ce trebuie să fii atent când ceva ți se pare suspect.
        </p>
      </header>

      <div className={styles.guideBody}>
        <Callout label="Semnul principal">
          Imaginile generate prin AI arată adesea impecabil la o primă vedere, dar devin neclare sau imposibile din punct de vedere fizic atunci când privești detaliile mici: degetele, reflexiile din ochi sau textul din fundal.
        </Callout>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>1. Verifică mâinile și numărul de degete</h2>
          <p className={styles.paragraph}>
            Deși modelele noi de inteligență artificială s-au îmbunătățit considerabil, fuziunea degetelor sau numărul incorect al acestora rămâne unul dintre cele mai comune indicii. Uită-te atent dacă o persoană din poză are 6 degete, unghii deformate sau îmbinări anatomice nefirești ale articulațiilor.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>2. Urmărește lumina și reflexiile din ochi</h2>
          <p className={styles.paragraph}>
            În fotografiile reale, reflexia luminii în ambele pupile este identică (de exemplu, o fereastră sau un blitz). Generatoarele AI creează deseori reflexii diferite în ochiul stâng față de cel drept sau umbre care nu respectă sursa naturală de lumină din scenă.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>3. Verifică inscripțiile și scrisul din fundal</h2>
          <p className={styles.paragraph}>
            AI-ul întâmpină dificultăți majore în a reda litere reale. Dacă pe o pancartă, o etichetă de haine sau un panou stradal apar litere ilizibile, simboluri inventate sau un text distorsionat, este un semnal clar că imaginea este sintetizată sintetic.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>4. Ce faci când nu ești sigur?</h2>
          <p className={styles.paragraph}>
            Fă un screenshot și folosește căutarea inversă de imagini (Google Reverse Image Search sau Tineye) pentru a vedea unde a apărut prima dată fotografia. De multe ori vei descoperi că poza originală este diferită sau că este deja semnalată ca fiind creată cu Midjourney ori DALL-E.
          </p>
        </section>

        <div className={shell.sectionRule}>
          <Link href="/despre-dezinformare" className={styles.backLink}>
            ← Înapoi la Ghidul despre dezinformare
          </Link>
        </div>
      </div>
    </div>
  );
}
