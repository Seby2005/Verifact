import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { JsonLd } from '@/components/JsonLd';
import shell from '../../page-shell.module.css';
import styles from '../glosar-dezinformare/glosar.module.css';

export const metadata: Metadata = {
  title: 'Cum verifici dacă o sursă online este de încredere — Verifact',
  description:
    'Ghid practic în 5 pași pentru evaluarea veridicității site-urilor de știri, autorilor și publicațiilor. Învață să deosebești sursele primare de cele secundare.',
  openGraph: {
    title: 'Cum verifici dacă o sursă online este de încredere — Verifact',
    description:
      'Ghid practic pentru evaluarea surselor de știri, verificarea domeniilor web și încrucișarea informațiilor.',
    url: 'https://verifact.ro/resurse/cum-verifici-o-sursa-de-incredere',
    type: 'article',
  },
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifact.ro';

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Cum verifici dacă o sursă online este de încredere',
  description:
    'Ghid practic în 5 pași pentru evaluarea veridicității site-urilor de știri, autorilor și publicațiilor din mediul online.',
  url: `${baseUrl}/resurse/cum-verifici-o-sursa-de-incredere`,
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

export default function SourceVerificationGuidePage() {
  return (
    <div className={`container ${shell.page}`}>
      <JsonLd data={articleSchema} />

      <header className={shell.head}>
        <p className="eyebrow">Centru de resurse · Ghid practic</p>
        <h1 className={shell.title}>Cum verifici dacă o sursă online este de încredere</h1>
        <p className={shell.lead}>
          În era abundenței informaționale, abilitatea de a evalua rapid credibilitatea unui site
          sau autor reprezintă primul scut împotriva manipulării.
        </p>
      </header>

      <div className={shell.body}>
        <Callout label="Regula fundamentală de verificare">
          Un articol credibil oferă transparență totală: numeste autorul, indică sursa originală a
          informației și oferă linkuri directe către documentele sau declarațiile oficiale pe care se bazează.
        </Callout>

        <div className={shell.prose} style={{ marginTop: '2rem', marginBottom: '2.5rem' }}>
          <h2>1. Caută sursa primară a informației</h2>
          <p>
            O <strong>sursă primară</strong> este documentul original, studiul științific, legea sau
            înregistrarea directă a unui eveniment. În schimb, majoritatea postărilor din social
            media sunt surse secundare sau terțiare care interpretează (sau distorsionează) faptul
            original. Dacă un articol pretinde că „un studiu recent arată că X”, caută titlul exact
            al acelui studiu sau numele instituției de cercetare. Dacă autorul nu oferă nicio cale
            de acces la sursa primară, gradul de încredere scade semnificativ. Pentru mai multe detalii
            tehnice, consultă{' '}
            <Link href="/resurse/glosar-dezinformare#sursa-primara-vs-secundara" className={styles.textLink}>
              definiția din Glosarul de dezinformare
            </Link>
            .
          </p>

          <h2>2. Verifică colectivul redacțional și autorul</h2>
          <p>
            Publicațiile legitime au o pagină clară de „Despre noi” sau „Echipă redacțională” unde sunt
            prezentați jurnaliștii, editorii și datele de contact ale organizației. Dacă un site
            nu menționează niciun nume de autor sau folosește pseudonime generice precum „Redacția”
            ori „Admin”, este un semnal de alarmă. Caută numele autorului pe Google pentru a vedea dacă
            are un istoric jurnalistic real sau dacă este un profil inventat.
          </p>

          <h2>3. Uită-te atent la adresa web (URL) și la vechimea site-ului</h2>
          <p>
            Multe site-uri de dezinformare folosesc domenii care imită publicații cunoscute, adăugând
            extensii neobișnuite (ex. <code>.xyz</code>, <code>.news-live.online</code>) sau modificând o singură
            literă din denumirea unui ziar de renume. Verifică adresa din bara browserului. De asemenea,
            site-urile create de doar câteva săptămâni care publică exclusiv articole senzaționale sau
            politice sunt adesea vehicule temporare pentru campanii de manipulare.
          </p>

          <h2>4. Încrucișează informația cu alte publicații independente</h2>
          <p>
            Dacă o știre este cu adevărat importantă și reală, ea va fi relată simultan de mai multe
            instituții de presă independente cu istoric demonstrat. Dacă o afirmație bombă apare pe
            un singur site necunoscut și nu este confirmată de nicio altă sursă credibilă, probabilitatea
            ca informația să fie falsă sau scoasă din context este extrem de ridicată. Află mai multe
            despre modul în care evaluăm noi sursele în{' '}
            <Link href="/transparenta" className={styles.textLink}>
              Metodologia de verificare Verifact
            </Link>
            .
          </p>

          <h2>5. Fii atent la tonul limbajului</h2>
          <p>
            Jurnalismul de calitate folosește un ton neutru, sobru și bazat pe fapte. Titlurile scrise
            cu MAJUSCULE, cuvintele excesiv de emoționale („BOMBĂ!”, „ȘOCANT!”, „NU O SĂ-ȚI VINĂ SĂ CREZI”)
            și apelul la frică sau ură sunt mărci înregistrate ale conținutului senzaționalist conceput
            pentru a atrage click-uri (clickbait) sau pentru a manipula opinia publică.
          </p>
        </div>

        <section className={shell.sectionRule}>
          <p className={styles.closing}>
            Vrei să verifici rapid o știre sau o afirmație suspectă?{' '}
            <Link href="/" className={styles.textLink}>
              Introdu textul pe pagina principală Verifact
            </Link>{' '}
            sau explorează celelalte{' '}
            <Link href="/resurse" className={styles.textLink}>
              ghiduri din centrul de resurse
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
