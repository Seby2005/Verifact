import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Callout } from '@/components/ui';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Prețuri',
  description:
    'Verifact este gratuit pentru uz personal. Planuri Pro și Business pentru jurnaliști, redacții și organizații.',
};

/** Tiers as defined in docs/PRD.md §3.4. */
const PLANS = [
  {
    name: 'Free',
    price: 'Gratuit',
    cadence: null,
    forWho: 'Pentru oricine vrea să verifice ce vede în feed.',
    checks: '10 verificări pe lună',
    features: [
      'Raport standard cu surse citate',
      'Verificare din text, screenshot sau URL',
      'Istoric personal al verificărilor',
      'Partajare publică a unui raport, dacă alegi tu',
    ],
    cta: 'Începe gratuit',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '€7,99',
    cadence: 'pe lună',
    forWho: 'Pentru jurnaliști, cercetători și profesori.',
    checks: '200 de verificări pe lună',
    features: [
      'Tot ce include planul Free',
      'Raport detaliat pe straturi de verificare',
      'Export PDF pentru citare',
      'Cheie API personală',
    ],
    cta: 'Alege Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '€49',
    cadence: 'pe lună',
    forWho: 'Pentru redacții, ONG-uri și platforme.',
    checks: '2000 de verificări pe lună',
    features: [
      'Tot ce include planul Pro',
      'Acces API complet și webhook-uri',
      'Dashboard de analytics pentru echipă',
      'Suport prioritar',
    ],
    cta: 'Contactează-ne',
    highlight: false,
  },
];

export default function PreturiPage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Prețuri</p>
        <h1 className={shell.title}>Gratuit pentru cetățeni. Plătit doar la volum.</h1>
        <p className={shell.lead}>
          Verificarea informației nu ar trebui să fie un privilegiu. Planul
          gratuit acoperă nevoia unui utilizator obișnuit; plătesc doar cei care
          verifică la scară profesională.
        </p>
      </header>

      <div className={shell.body}>
        <div className={styles.grid}>
          {PLANS.map((plan) => (
            <section
              key={plan.name}
              className={[styles.plan, plan.highlight ? styles.planHighlight : '']
                .filter(Boolean)
                .join(' ')}
            >
              <div className={styles.planHead}>
                <h2 className={styles.planName}>{plan.name}</h2>
                <p className={styles.priceRow}>
                  <span className={styles.price}>{plan.price}</span>
                  {plan.cadence ? <span className={styles.cadence}>{plan.cadence}</span> : null}
                </p>
                <p className={styles.checks}>{plan.checks}</p>
                <p className={styles.forWho}>{plan.forWho}</p>
              </div>

              <ul className={styles.features}>
                {plan.features.map((feature) => (
                  <li key={feature} className={styles.feature}>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className={styles.planCta}>
                <Button
                  variant={plan.highlight ? 'primary' : 'secondary'}
                  size="md"
                  fullWidth
                  href="/cont"
                >
                  {plan.cta}
                </Button>
              </div>
            </section>
          ))}
        </div>

        <div className={shell.sectionRule}>
          <Callout label="Fără costuri ascunse">
            Planul gratuit nu se transformă în plată automat și nu îți cere card
            la înregistrare. Dacă depășești limita lunară, verificările se
            opresc până în luna următoare — nu te taxăm surpriză.
          </Callout>
          <p className={styles.footnote}>
            Prețurile nu includ TVA. Ai nevoie de altceva?{' '}
            <Link href="/cont" className={styles.textLink}>
              Creează un cont
            </Link>{' '}
            și scrie-ne.
          </p>
        </div>
      </div>
    </div>
  );
}
