'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { JsonLd } from '@/components/JsonLd';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

const CONTENT = {
  ro: {
    eyebrow: 'Echipă & Guvernanță',
    title: 'Cine construiește Verifact și cum asigurăm independența',
    lead:
      'Verifact este o inițiativă tehnologică independentă și open-source, dedicată combaterii dezinformării din spațiul public prin automatizare, verificare multistrat și transparență totală a surselor.',
    teamTitle: 'Echipa de Dezvoltare & Inițiativă',
    founderRole: 'Fondator & Dezvoltator Principal',
    founderBio:
      'Student și software engineer pasionat de inteligență artificială aplicată, sisteme distribuite și etica informației digitale. A conceput arhitectura Verifact pentru a oferi publicului din România un instrument gratuit, neutru și verificabil de analiză a știrilor false.',
    contributorsRole: 'Comunitatea Open Source',
    contributorsBio:
      'Verifact este un proiect public pe GitHub. Algoritmul de verificare, registrul de surse și codul sursă complet sunt auditate și pot fi îmbunătățite de dezvoltatori, jurnaliști și cercetători independenți din comunitate.',
    githubLink: 'Profil GitHub',
    projectRepo: 'Depozit Proiect (GitHub)',
    governanceTitle: 'Politica de Independență și Finanțare',
    governanceIntro:
      'În conformitate cu bunele practici internaționale de fact-checking (promovate de International Fact-Checking Network - IFCN), Verifact aderă la standarde riguroase de transparență și nepartizanat.',
    policies: [
      {
        title: 'Independență Politică și Editorială',
        text: 'Verifact nu primește finanțări de la partide politice, candidați electorali sau instituții guvernamentale. Nu promovăm nicio agendă ideologică. Algoritmul nostru evaluează exclusiv afirmații factuale în raport cu dovezi publice verificabile.',
      },
      {
        title: 'Model de Finanțare Transparent',
        text: 'Proiectul este self-hosted și finanțat independent de către fondator, susținut prin infrastructură open-source și subscripții premium opționale pentru utilizatori avansați (Pro Dossier). Nu vindem datele utilizatorilor și nu acceptăm publicitate sponsorizată.',
      },
      {
        title: 'Politica de Corecții și Drept la Replică',
        text: 'Transparența înseamnă asumarea responsabilității. Orice utilizator poate contesta o verificare publică sau semnala o eroare de clasificare direct de pe pagina raportului (butonul „Raportează / Contestă”), iar echipa revizuiește semnalările în mod public.',
      },
    ],
    contactTitle: 'Semnalează o eroare sau colaborează cu noi',
    contactText:
      'Dacă ești cercetător, jurnalist sau dezvoltator și vrei să contribui la baza de date sau la algoritmul Verifact, codul este deschis pentru contribuții.',
    contactBtn: 'Vezi Codul pe GitHub',
  },
  en: {
    eyebrow: 'Team & Governance',
    title: 'Who builds Verifact and how we guarantee independence',
    lead:
      'Verifact is an independent, open-source technological initiative dedicated to countering misinformation through automation, multi-layer verification, and complete source transparency.',
    teamTitle: 'Development Team & Initiative',
    founderRole: 'Founder & Lead Developer',
    founderBio:
      'Software engineer focused on applied artificial intelligence, distributed systems, and information ethics. Architected Verifact to provide a free, neutral, and verifiable verification tool for online information.',
    contributorsRole: 'Open Source Community',
    contributorsBio:
      'Verifact is an open-source project hosted on GitHub. The verification algorithm, source registry, and codebase are audited and open to contributions from independent developers, journalists, and researchers.',
    githubLink: 'GitHub Profile',
    projectRepo: 'Project Repository (GitHub)',
    governanceTitle: 'Independence & Funding Policy',
    governanceIntro:
      'In alignment with international fact-checking standards (IFCN Code of Principles), Verifact strictly adheres to non-partisanship and radical transparency.',
    policies: [
      {
        title: 'Editorial & Political Independence',
        text: 'Verifact accepts zero funding from political parties, candidates, or government entities. We do not endorse any ideology. The algorithm evaluates factual claims strictly against publicly verifiable evidence.',
      },
      {
        title: 'Transparent Funding Model',
        text: 'The project is independently self-funded by its creators, supported by open-source infrastructure and optional Pro subscriptions. We never sell user data nor host sponsored advertising.',
      },
      {
        title: 'Correction & Dispute Policy',
        text: 'Every public report includes an open dispute mechanism ("Dispute / Report") allowing readers to contest sources or classifications. Corrections and revisions are transparently documented.',
      },
    ],
    contactTitle: 'Report an issue or collaborate with us',
    contactText:
      'If you are a researcher, journalist, or developer wishing to improve Verifact’s methodology or dataset, contributions are welcome.',
    contactBtn: 'View Code on GitHub',
  },
};

export default function TeamPage() {
  const { locale } = useLanguage();
  const c = CONTENT[locale === 'en' ? 'en' : 'ro'];

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Sebi Iancu',
    jobTitle: 'Founder & Lead Software Engineer',
    worksFor: {
      '@type': 'Organization',
      name: 'Verifact',
      url: 'https://www.verifact.ro',
    },
    url: 'https://github.com/Seby2005',
    sameAs: ['https://github.com/Seby2005'],
  };

  return (
    <div className={`container ${shell.page}`}>
      <JsonLd data={personSchema} />

      <header className={shell.head}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 className={shell.title}>{c.title}</h1>
        <p className={shell.lead}>{c.lead}</p>
      </header>

      <div className={shell.body}>
        <section>
          <h2 className={styles.sectionTitle}>{c.teamTitle}</h2>

          <div className={styles.teamGrid}>
            <article className={styles.memberCard}>
              <div className={styles.memberHeader}>
                <h3 className={styles.memberName}>Sebi Iancu</h3>
                <span className={styles.memberRole}>{c.founderRole}</span>
              </div>
              <p className={styles.memberBio}>{c.founderBio}</p>
              <div className={styles.memberLinks}>
                <a
                  href="https://github.com/Seby2005"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.memberLink}
                >
                  {c.githubLink} →
                </a>
                <a
                  href="https://github.com/Seby2005/Verifact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.memberLink}
                >
                  {c.projectRepo} →
                </a>
              </div>
            </article>

            <article className={styles.memberCard}>
              <div className={styles.memberHeader}>
                <h3 className={styles.memberName}>Contribuitori & Cercetători</h3>
                <span className={styles.memberRole}>{c.contributorsRole}</span>
              </div>
              <p className={styles.memberBio}>{c.contributorsBio}</p>
              <div className={styles.memberLinks}>
                <Link href="/open-source" className={styles.memberLink}>
                  Open Source & Contribuții →
                </Link>
                <Link href="/transparenta" className={styles.memberLink}>
                  Metodologie Verificare →
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className={shell.sectionRule}>
          <h2 className={styles.sectionTitle}>{c.governanceTitle}</h2>
          <p className={styles.introText}>{c.governanceIntro}</p>

          <ul className={styles.policyList}>
            {c.policies.map((p, idx) => (
              <li key={idx} className={styles.policyItem}>
                <h3 className={styles.policyTitle}>
                  <span>✓</span> {p.title}
                </h3>
                <p className={styles.policyText}>{p.text}</p>
              </li>
            ))}
          </ul>

          <Callout label="Standarde IFCN" tone="plain">
            {locale === 'en'
              ? 'Verifact is built following the core tenets of the International Fact-Checking Network: nonpartisanship, transparency of sources, transparency of funding, and open corrections.'
              : 'Verifact este construit respectând principiile de bază ale International Fact-Checking Network: nepartizanat politic, transparența totală a surselor, transparența finanțării și dreptul la replică și corecții deschise.'}
          </Callout>

          <div className={styles.contactBlock}>
            <h3 className={styles.contactTitle}>{c.contactTitle}</h3>
            <p className={styles.contactText}>{c.contactText}</p>
            <a
              href="https://github.com/Seby2005/Verifact"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.memberLink}
              style={{ fontWeight: 600 }}
            >
              {c.contactBtn} →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
