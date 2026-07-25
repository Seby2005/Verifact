import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Misiune',
  description:
    'De ce există Verifact: acces instant la verificarea informației, prin AI transparentă și surse verificabile.',
};

/** Values as stated in docs/PRD.md §1.2 — restyled here, not rewritten. */
const VALUES = [
  {
    title: 'Transparență',
    text: 'Algoritmul este open source. Orice persoană poate vedea cum se face verificarea.',
  },
  {
    title: 'Corectitudine',
    text: 'Nu luăm poziții politice. Verificăm fapte, nu opinii.',
  },
  {
    title: 'Accesibilitate',
    text: 'Gratuit pentru utilizatorul de rând.',
  },
  {
    title: 'Responsabilitate',
    text: 'Fiecare raport include surse verificabile, nu doar concluzii.',
  },
  {
    title: 'Confidențialitate',
    text: 'Screenshot-urile utilizatorilor nu sunt stocate permanent.',
  },
];

export default function MisiunePage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Misiune</p>
        <h1 className={shell.title}>De ce există Verifact</h1>
      </header>

      <div className={shell.body}>
        <Callout label="Misiunea produsului">
          Oferim fiecărui cetățean acces instant la adevăr, prin inteligență
          artificială transparentă și surse verificabile.
        </Callout>

        <div className={`${shell.prose} ${styles.prose}`}>
          <h2>Problema</h2>
          <p>
            Trăim într-o epocă în care dezinformarea circulă mai rapid decât
            adevărul. O știre falsă ajunge la milioane de oameni în ore, în timp
            ce dezminținile apar zile mai târziu, dacă apar.
          </p>
          <p>
            Verifact rezolvă această problemă oferind verificare instantă,
            transparentă și accesibilă oricui — gratuit pentru uz personal.
          </p>

          <h2>De ce România, întâi</h2>
          <ul>
            <li>
              Dezinformarea este o problemă acută în spațiul digital românesc.
            </li>
            <li>
              Nu există un instrument nativ, în limba română, de fact-checking
              automat.
            </li>
            <li>
              Alegeri frecvente și un climat politic polarizat înseamnă cerere
              mare pentru verificare independentă.
            </li>
            <li>
              Jurnalismul independent este în creștere — G4Media, PressOne,
              Recorder și alții sunt parteneri naturali, nu concurenți.
            </li>
          </ul>

          <h2>Ce nu suntem</h2>
          <p>
            Nu suntem un arbitru al adevărului și nu înlocuim redacțiile. Un
            raport generat automat este un punct de plecare cu surse, nu o
            decizie editorială finală. De aceea fiecare verdict vine cu scorul
            lui de certitudine și cu sursele la vedere — ca să poți verifica
            singur concluzia, inclusiv împotriva noastră.
          </p>
        </div>

        <section className={shell.sectionRule}>
          <h2 className={styles.valuesTitle}>Valorile după care lucrăm</h2>
          <dl className={styles.values}>
            {VALUES.map((value) => (
              <div key={value.title} className={styles.value}>
                <dt className={styles.valueTitle}>{value.title}</dt>
                <dd className={styles.valueText}>{value.text}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.follow}>
            Vezi și{' '}
            <Link href="/transparenta" className={styles.textLink}>
              metodologia de verificare
            </Link>{' '}
            sau{' '}
            <Link href="/open-source" className={styles.textLink}>
              codul și politica de confidențialitate
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
