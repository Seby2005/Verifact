import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import shell from '../../page-shell.module.css';
import styles from './glosar.module.css';

export const metadata: Metadata = {
  title: 'Glosar de dezinformare — Termeni-cheie explicați',
  description:
    'Ghid explicativ cu definiții clare pentru termenii esențiali din mediul informațional: dezinformare, misinformare, deepfake, fact-checking, ferme de boți și bule de filtrare.',
  openGraph: {
    title: 'Glosar de dezinformare — Verifact',
    description:
      'Definiții clare și neutre pentru dezinformare, misinformare, deepfake, fact-checking și alte concepte cheie.',
    url: '/resurse/glosar-dezinformare',
    type: 'article',
  },
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifact.ro';

const GLOSSARY_TERMS = [
  {
    id: 'dezinformare-misinformare-malinformare',
    title: 'Dezinformare (vs. misinformare, vs. malinformare)',
    definition:
      'Dezinformarea reprezintă conținutul fals sau înșelător creat și răspândit cu intenția deliberată de a induce în eroare sau de a aduce un prejudiciu. Spre deosebire de aceasta, misinformarea este informația falsă distribuită neintenționat de persoane care cred că este adevărată, în timp ce malinformarea se referă la informații reale folosite în mod malițios pentru a face rău.',
  },
  {
    id: 'deepfake',
    title: 'Deepfake',
    definition:
      'Un deepfake este un material audio, video sau o imagine sintetizată artificial cu ajutorul modelelor avansate de inteligență artificială, pentru a imita cu precizie înfățișarea sau vocea unei persoane reale. Această tehnologie poate genera secvențe convingătoare în care oameni publici par să declare lucruri pe care nu le-au rostit niciodată.',
  },
  {
    id: 'fact-checking',
    title: 'Fact-checking',
    definition:
      'Fact-checking-ul reprezintă procesul riguros de verificare a veridicității afirmațiilor publice, știrilor sau imaginilor prin raportare la surse primare, date oficiale și dovezi verificabile. Obiectivul este de a stabili acuratețea factuală a unei informații înainte sau după ce aceasta a fost difuzată în spațiul public.',
  },
  {
    id: 'sursa-primara-vs-secundara',
    title: 'Sursă primară vs. sursă secundară',
    definition:
      'O sursă primară este un document nemijlocit, o înregistrare directă sau o mărturie directă de la fața locului (ex. legi, rapoarte oficiale, date brute). O sursă secundară reprezintă o analiză, o interpretare sau o preluare jurnalistică care comentează și sintetizează sursele primare.',
  },
  {
    id: 'bot-farm-cont-fals',
    title: 'Bot farm / cont fals',
    definition:
      'O fermă de boți (bot farm) este o rețea automatizată de conturi fictive pe rețelele sociale, programate să distribuie, să aprecieze sau să comenteze masiv anumite mesaje. Scopul acestora este de a crea falsa impresie de consens popular și de a manipula algoritmii de recomandare ai platformelor.',
  },
  {
    id: 'bula-informationala',
    title: 'Bulă informațională (filter bubble)',
    definition:
      'Bula informațională este o stare de izolare intelectuală creată de algoritmii rețelelor sociale și motoarelor de căutare, care furnizează utilizatorului doar conținut aliniat cu preferințele sale anterioare. În timp, această expunere selectivă reduce contactul cu opinii sau fapte divergente și amplifică convingerile existente.',
  },
];

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Glosar de dezinformare: Termeni-cheie pe înțelesul tuturor',
  description:
    'Ghid explicativ cu privire la termenii esențiali din domeniul dezinformării: de la diferența dintre misinformare și malinformare, la deepfake, fact-checking și ferme de boți.',
  url: `${baseUrl}/resurse/glosar-dezinformare`,
  datePublished: '2026-08-12',
  dateModified: '2026-08-12',
  inLanguage: 'ro-RO',
  author: {
    '@type': 'Organization',
    name: 'Verifact',
    url: baseUrl,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Verifact',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/logo/verifact-v-logo-transparent.png`,
    },
  },
};

const definedTermSetSchema = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'Glosar de dezinformare Verifact',
  url: `${baseUrl}/resurse/glosar-dezinformare`,
  hasDefinedTerm: GLOSSARY_TERMS.map((term) => ({
    '@type': 'DefinedTerm',
    name: term.title,
    description: term.definition,
    url: `${baseUrl}/resurse/glosar-dezinformare#${term.id}`,
  })),
};

export default function GlosarPage() {
  return (
    <div className={`container ${shell.page}`}>
      <JsonLd data={[articleSchema, definedTermSetSchema]} />

      <header className={shell.head}>
        <p className="eyebrow">Centru de resurse · Glosar</p>
        <h1 className={shell.title}>Glosar de dezinformare</h1>
        <p className={shell.lead}>
          Termenii esențiali din ecosistemul dezinformării explicați pe scurt, clar și fără jargon.
        </p>
      </header>

      <div className={shell.body}>
        <nav className={styles.quickNav} aria-label="Navigare rapidă termeni">
          <p className={styles.quickNavTitle}>Sari la termen:</p>
          <ul className={styles.quickNavList}>
            {GLOSSARY_TERMS.map((term) => (
              <li key={term.id}>
                <a href={`#${term.id}`} className={styles.quickNavLink}>
                  {term.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-label="Definiții glosar">
          {GLOSSARY_TERMS.map((term) => (
            <article key={term.id} className={styles.termCard}>
              <h2 id={term.id} className={styles.termTitle}>
                <a href={`#${term.id}`} className={styles.termAnchor}>
                  {term.title}
                </a>
              </h2>
              <p className={styles.termDefinition}>{term.definition}</p>
            </article>
          ))}
        </section>

        <section className={shell.sectionRule}>
          <p className={styles.closing}>
            Ai găsit o afirmație sau un mesaj suspect?{' '}
            <Link href="/" className={styles.textLink}>
              Verifică acum cu Verifact
            </Link>{' '}
            sau vezi mai multe ghiduri în{' '}
            <Link href="/resurse" className={styles.textLink}>
              Centrul de resurse
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
