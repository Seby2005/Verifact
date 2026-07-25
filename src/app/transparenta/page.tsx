import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Transparență',
  description:
    'Metodologia Verifact: cele patru straturi de surse, cum se calculează scorul de veridicitate și ce înseamnă fiecare verdict.',
};

/*
 * Why this page is separate from /open-source:
 *
 * They answer two different questions for two different readers. This page is
 * about METHOD — what sources are consulted, how the score is weighted, what a
 * verdict band means. /open-source is about GOVERNANCE AND DATA — the licence,
 * how to audit or contribute to the code, and what happens to a user's own
 * data. A reader who distrusts a verdict needs this page; a reader who
 * distrusts us as an operator needs that one. Merging them would bury both.
 */

/** Layers as defined in docs/PRD.md §3.2. */
const LAYERS = [
  {
    number: '01',
    title: 'Fact-check-uri existente',
    weight: '35%',
    text: 'Căutăm afirmația în baze de date de fact-checking deja publicate, prin Google Fact Check Tools. Dacă o organizație de profil a verificat deja afirmația, asta cântărește cel mai mult.',
  },
  {
    number: '02',
    title: 'Presă convențională',
    weight: '30%',
    text: 'Verificăm cum a fost relatat subiectul în publicații de știri cu istoric editorial, pentru context și pentru relatări contradictorii.',
  },
  {
    number: '03',
    title: 'Surse oficiale',
    weight: '25%',
    text: 'Consultăm site-uri instituționale — .gov.ro, .europa.eu, OMS, ONU și alte instituții publice relevante pentru subiect.',
  },
  {
    number: '04',
    title: 'Analiză contextuală AI',
    weight: '10%',
    text: 'Un model AI sintetizează straturile anterioare și semnalează contextul lipsă. Ponderea este mică intenționat: modelul explică, nu decide.',
  },
];

/** Bands as defined in docs/PRD.md §3.2. */
const BANDS = [
  { range: '85–100%', label: 'Probabil adevărat', text: 'Confirmată de mai multe surse independente, fără contradicții semnificative.' },
  { range: '60–84%', label: 'Parțial adevărat / context lipsă', text: 'Nucleul afirmației se susține, dar lipsește context care schimbă interpretarea.' },
  { range: '40–59%', label: 'Neclar / insuficient verificat', text: 'Sursele sunt puține, contradictorii sau de calitate incertă. Nu tragem o concluzie.' },
  { range: '0–39%', label: 'Probabil fals', text: 'Contrazisă de surse credibile sau bazată pe o premisă demonstrat falsă.' },
];

export default function TransparentaPage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Transparență</p>
        <h1 className={shell.title}>Cum ajungem la un verdict</h1>
        <p className={shell.lead}>
          Un verdict fără metodă este o opinie cu autoritate împrumutată. Mai
          jos e exact ce consultăm, cum cântărim și unde ne oprim.
        </p>
      </header>

      <div className={shell.body}>
        <section>
          <h2 className={styles.sectionTitle}>Cele patru straturi de surse</h2>
          <ol className={styles.layers}>
            {LAYERS.map((layer) => (
              <li key={layer.number} className={styles.layer}>
                <div className={styles.layerHead}>
                  <span className={styles.layerNumber}>{layer.number}</span>
                  <span className={styles.layerWeight}>Pondere {layer.weight}</span>
                </div>
                <h3 className={styles.layerTitle}>{layer.title}</h3>
                <p className={styles.layerText}>{layer.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={shell.sectionRule}>
          <h2 className={styles.sectionTitle}>Ce înseamnă scorul</h2>
          <p className={styles.intro}>
            Scorul final este media ponderată a celor patru straturi. Banda în
            care cade determină eticheta verdictului — nimic altceva.
          </p>
          <dl className={styles.bands}>
            {BANDS.map((band) => (
              <div key={band.range} className={styles.band}>
                <dt className={styles.bandRange}>{band.range}</dt>
                <dd className={styles.bandBody}>
                  <span className={styles.bandLabel}>{band.label}</span>
                  <span className={styles.bandText}>{band.text}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={shell.sectionRule}>
          <h2 className={styles.sectionTitle}>Limitele metodei</h2>
          <div className={shell.prose}>
            <ul>
              <li>
                Verificăm afirmații factuale, nu opinii, predicții sau judecăți
                de valoare. O afirmație de tipul &bdquo;politica X este
                greșită&rdquo; nu poate primi un scor.
              </li>
              <li>
                Calitatea raportului depinde de ce există public. Pentru
                subiecte foarte recente sau foarte de nișă, sursele pot lipsi —
                caz în care verdictul rămâne &bdquo;neclar&rdquo;, nu
                &bdquo;fals&rdquo;.
              </li>
              <li>
                Un scor mare nu este o garanție. Este o măsură a cât de mult se
                susține afirmația în sursele consultate la momentul verificării.
              </li>
              <li>
                Nu detectăm satira sau ironia în mod fiabil. O afirmație
                preluată dintr-un context satiric poate fi evaluată literal.
              </li>
            </ul>
          </div>
          <Callout label="Statusul implementării" tone="plain">
            Metodologia de mai sus este specificația după care se construiește
            motorul de verificare. Pipeline-ul nu este încă activ public —
            progresul poate fi urmărit în repository.
          </Callout>
          <p className={styles.follow}>
            Codul care implementează toate acestea este public.{' '}
            <Link href="/open-source" className={styles.textLink}>
              Vezi pagina open source
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
