import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { VerifyTool, ReportView } from '@/components/verify';
import type { VerificationReport } from '@/types/verification';
import styles from './page.module.css';

/**
 * A fixed, clearly-labelled sample used to show what a finished report looks
 * like. It is never presented as a live result — the real tool above returns
 * whatever /api/verify returns, and nothing else.
 */
const SAMPLE_REPORT: VerificationReport = {
  id: 'exemplu',
  claim: 'Vaccinurile ARNm modifică ADN-ul uman.',
  verdict: 'false',
  score: 6,
  summary:
    'ARN-ul mesager din vaccin nu ajunge în nucleul celulei, unde se află ADN-ul, și se degradează în câteva zile după ce celula produce proteina spike. Nu există niciun mecanism cunoscut prin care acest proces să modifice genomul uman.',
  sources: [
    {
      title: 'Understanding How COVID-19 Vaccines Work',
      publisher: 'Centers for Disease Control and Prevention',
      date: '2024-09-12',
      url: 'https://www.cdc.gov/covid/vaccines/how-they-work.html',
    },
    {
      title: 'mRNA vaccines — a new era in vaccinology',
      publisher: 'Nature Reviews Drug Discovery',
      date: '2018-01-12',
      url: 'https://www.nature.com/articles/nrd.2017.243',
    },
    {
      title: 'Fact check: mRNA vaccines do not alter human DNA',
      publisher: 'Reuters',
      date: '2021-05-21',
      url: 'https://www.reuters.com/article/factcheck-dna-vaccine-idUSL2N2N918K',
    },
  ],
  processingTime: 12.3,
  createdAt: '2026-07-25T09:00:00.000Z',
};

const STEPS = [
  {
    number: '01',
    title: 'Trimiți afirmația',
    text: 'Text, link către un articol sau screenshot dintr-o postare. Nu ai nevoie de cont pentru o verificare.',
  },
  {
    number: '02',
    title: 'Căutăm în surse, nu în memoria unui model',
    text: 'Afirmația este căutată în baze de date de fact-checking, presă convențională, surse oficiale și declarații publice — patru straturi independente.',
  },
  {
    number: '03',
    title: 'Primești un raport cu surse',
    text: 'Verdict, scor de veridicitate și lista completă a surselor pe care se bazează concluzia, ca să o poți verifica singur.',
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={`container ${styles.hero}`}>
        <p className="eyebrow">Verificare independentă, cu AI</p>
        <h1 className={styles.heroTitle}>
          Dezinformarea circulă mai repede decât dezmințirea.
        </h1>
        <p className={styles.heroLead}>
          Verifact analizează afirmații, articole și postări din social media pe
          baza surselor publice verificabile — și îți arată exact pe ce se
          bazează fiecare concluzie.
        </p>
      </section>

      <section className={`container ${styles.toolSection}`}>
        <VerifyTool />
      </section>

      <section className={`container ${styles.section}`}>
        <p className="eyebrow">Exemplu</p>
        <h2 className={styles.sectionTitle}>Cum arată un raport</h2>
        <div className={styles.sampleWrap}>
          <ReportView report={SAMPLE_REPORT} />
        </div>
      </section>

      <section className={`container ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Cum funcționează</h2>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.number} className={styles.step}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`container ${styles.section}`}>
        <Callout label="Principiul de bază">
          Un verdict fără surse este doar o altă opinie. De aceea fiecare raport
          Verifact citează integral sursele pe care se sprijină, iar algoritmul
          care le cântărește este public.
        </Callout>
        <p className={styles.calloutFollow}>
          <Link href="/transparenta" className={styles.textLink}>
            Vezi metodologia completă
          </Link>
          {' · '}
          <Link href="/open-source" className={styles.textLink}>
            Open source și confidențialitate
          </Link>
        </p>
      </section>
    </div>
  );
}
