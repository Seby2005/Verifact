import React from 'react';
import { Button, Card, Badge, ShieldCheckIcon, CheckCircleIcon } from '@/components/ui';
import styles from './page.module.css';

const STEPS = [
  {
    number: '01',
    title: 'Trimiți afirmația',
    text: 'Lipești un text, un link către un articol sau încarci un screenshot dintr-o postare pe rețele sociale.',
  },
  {
    number: '02',
    title: 'Algoritmul verifică sursele',
    text: 'Căutăm afirmația în baze de date de fact-checking, presă și surse oficiale — nu doar în cunoștințele modelului AI.',
  },
  {
    number: '03',
    title: 'Primești un raport verificabil',
    text: 'Vezi verdictul, nivelul de certitudine și sursele exacte pe care se bazează, ca să poți verifica singur concluzia.',
  },
];

const TRUST_POINTS = [
  {
    title: 'Algoritm open source',
    text: 'Fiecare pas al verificării este documentat public — nimic nu se întâmplă într-o cutie neagră.',
  },
  {
    title: 'Surse citate explicit',
    text: 'Nu primești doar un verdict, ci și linkurile către sursele pe care se bazează.',
  },
  {
    title: 'Certitudine, nu absolutism',
    text: 'Afișăm nivelul de încredere al fiecărui verdict — inclusiv atunci când informația este neclară.',
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Verificare independentă a informației</p>
          <h1 className={styles.heroTitle}>
            Combate dezinformarea cu surse, nu cu presupuneri.
          </h1>
          <p className={styles.heroSubtitle}>
            AI Fact-Checker analizează afirmații și conținut din social media pe baza
            unor surse publice verificabile, și explică transparent cum a ajuns la
            fiecare concluzie.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" size="lg" href="#cum-functioneaza">
              Vezi cum funcționează
            </Button>
            <a
              className={styles.heroSecondaryLink}
              href="https://github.com/Seby2005/fact-checker-ai"
              target="_blank"
              rel="noreferrer noopener"
            >
              Proiect open source — contribuie pe GitHub
            </a>
          </div>
        </div>

        <Card variant="default" padding="lg" className={styles.heroCard}>
          <p className={styles.heroCardLabel}>Exemplu de raport</p>
          <p className={styles.heroCardClaim}>
            &ldquo;Vaccinurile ARNm modifică ADN-ul uman.&rdquo;
          </p>
          <Badge variant="false">PROBABIL FALS · 6% certitudine</Badge>
          <ul className={styles.heroCardSources}>
            <li>
              <CheckCircleIcon size={14} className={styles.heroCardSourceIcon} />
              CDC — Understanding mRNA COVID-19 Vaccines
            </li>
            <li>
              <CheckCircleIcon size={14} className={styles.heroCardSourceIcon} />
              Nature — Genetics review, 2023
            </li>
          </ul>
        </Card>
      </section>

      <section id="cum-functioneaza" className={styles.section}>
        <h2 className={styles.sectionTitle}>Cum funcționează</h2>
        <div className={styles.stepsGrid}>
          {STEPS.map((step) => (
            <Card key={step.number} variant="bordered" padding="lg" className={styles.stepCard}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.trustHeader}>
          <ShieldCheckIcon size={28} className={styles.trustIcon} />
          <h2 className={styles.sectionTitle}>De ce să ai încredere în raport</h2>
        </div>
        <div className={styles.trustGrid}>
          {TRUST_POINTS.map((point) => (
            <div key={point.title} className={styles.trustItem}>
              <h3 className={styles.trustItemTitle}>{point.title}</h3>
              <p className={styles.trustItemText}>{point.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
