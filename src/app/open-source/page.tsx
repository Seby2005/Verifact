import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Callout } from '@/components/ui';
import { REPO_URL } from '@/components/layout/routes';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Open source și confidențialitate',
  description:
    'De ce codul Verifact este public sub licență MIT și ce se întâmplă cu datele tale: totul este privat.',
};

export default function OpenSourcePage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Cod și date</p>
        <h1 className={shell.title}>Codul e public. Datele tale nu.</h1>
        <p className={shell.lead}>
          Două promisiuni care merg împreună: oricine poate audita cum
          funcționează Verifact, și nimeni nu poate vedea ce ai verificat tu.
        </p>
      </header>

      {/* In-page navigation between the two halves of this page. */}
      <nav className={styles.jump} aria-label="Secțiuni">
        <a href="#open-source" className={styles.jumpLink}>
          Open source
        </a>
        <a href="#confidentialitate" className={styles.jumpLink}>
          Confidențialitate
        </a>
      </nav>

      <div className={shell.body}>
        <section id="open-source" className={styles.section}>
          <p className="eyebrow">Partea I</p>
          <h2 className={styles.sectionTitle}>De ce codul este deschis</h2>

          <div className={shell.prose}>
            <p>
              Un instrument care îți spune ce este adevărat și ce nu are o
              putere considerabilă. Singurul mod onest de a deține acea putere
              este să lași pe oricine să verifice cum o folosești.
            </p>

            <h3>Ce poți verifica singur</h3>
            <ul>
              <li>
                Ce surse sunt consultate și în ce ordine — nu doar rezultatul,
                ci interogările din spate.
              </li>
              <li>
                Cum se calculează scorul de veridicitate, cu ponderile exacte
                ale fiecărui strat.
              </li>
              <li>
                Ce prompt-uri primește modelul AI și unde poate influența
                verdictul, respectiv unde nu poate.
              </li>
              <li>
                Istoricul modificărilor: orice schimbare de metodologie e
                vizibilă în istoricul repository-ului.
              </li>
            </ul>

            <h3>Licență și contribuții</h3>
            <p>
              Verifact este publicat sub licență MIT. Poți folosi codul, îl poți
              modifica și îl poți rula pe infrastructura ta, inclusiv comercial.
              Contribuțiile sunt binevenite — mai ales rapoartele despre
              verdicte greșite, care sunt cel mai util tip de feedback.
            </p>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" size="md" href={REPO_URL}>
              Vezi codul pe GitHub
            </Button>
            <Link href="/transparenta" className={styles.textLink}>
              Metodologia de verificare
            </Link>
          </div>
        </section>

        <section id="confidentialitate" className={`${styles.section} ${shell.sectionRule}`}>
          <p className="eyebrow">Partea II</p>
          <h2 className={styles.sectionTitle}>Confidențialitate</h2>

          <Callout label="Pe scurt">
            Totul este privat — rapoartele tale, istoricul tău, contul tău.
            Nimic din ce verifici nu devine public decât dacă apeși tu butonul
            de publicare.
          </Callout>

          <div className={shell.prose}>
            <h3>Ce colectăm</h3>
            <ul>
              <li>
                <strong>Fără cont:</strong> textul sau linkul pe care îl trimiți
                spre verificare, folosit doar pentru a genera raportul cerut.
              </li>
              <li>
                <strong>Cu cont:</strong> adresa de email și istoricul propriilor
                verificări, ca să le regăsești.
              </li>
              <li>
                Date tehnice minime necesare funcționării (de exemplu, limitarea
                abuzurilor).
              </li>
            </ul>

            <h3>Ce nu facem</h3>
            <ul>
              <li>Nu vindem și nu închiriem date către nimeni.</li>
              <li>
                Nu folosim tracker-e publicitare terțe și nu construim profiluri
                de utilizator pentru publicitate.
              </li>
              <li>
                Nu publicăm verificările tale și nu le arătăm altor utilizatori.
              </li>
              <li>
                Nu păstrăm permanent screenshot-urile încărcate: imaginea este
                folosită pentru extragerea textului, apoi ștearsă.
              </li>
            </ul>

            <h3>Controlul tău</h3>
            <ul>
              <li>Poți șterge orice raport din istoricul tău, oricând.</li>
              <li>
                Poți șterge contul complet — ștergerea contului șterge și
                rapoartele asociate, definitiv.
              </li>
              <li>
                Poți publica un raport dacă vrei să îl citeze cineva; publicarea
                este întotdeauna o acțiune explicită a ta.
              </li>
            </ul>
          </div>

          <p className={styles.note}>
            Ai o întrebare despre datele tale sau vrei să raportezi o problemă de
            confidențialitate? Deschide un issue public în{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={styles.textLink}>
              repository
            </a>{' '}
            sau scrie-ne din{' '}
            <Link href="/cont" className={styles.textLink}>
              contul tău
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
