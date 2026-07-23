'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TIER_CONFIG } from '@/types/user';
import styles from './Pricing.module.css';

const FAQ_ITEMS = [
  {
    q: 'Ce se întâmplă dacă depășesc limita de verificări?',
    a: 'Verificările se opresc până la resetarea lunară (prima zi a lunii). Poți face upgrade oricând pentru a continua imediat.',
  },
  {
    q: 'Pot anula abonamentul oricând?',
    a: 'Da, fără penalități. Accesul Pro rămâne activ până la sfârșitul perioadei plătite.',
  },
  {
    q: 'Datele mele (screenshot-urile) sunt stocate?',
    a: 'Nu. Screenshot-urile sunt procesate în timp real și șterse imediat după extragerea textului. Nu stocăm imagini.',
  },
  {
    q: 'Ce metode de plată acceptați?',
    a: 'Card bancar (Visa, Mastercard) prin Stripe. Factura fiscală inclusă. (Plata online va fi activă în curând).',
  },
  {
    q: 'Există reducere pentru ONG-uri sau instituții educaționale?',
    a: 'Da. Contactați-ne la contact@factcheck-ai.ro pentru prețuri speciale.',
  },
  {
    q: 'Algoritmul este cu adevărat open source?',
    a: 'Da, complet. Codul sursă este disponibil pe GitHub sub licență MIT. Poți audita exact cum funcționează verificarea.',
  },
  {
    q: 'Cât de precisă este verificarea AI?',
    a: 'Acuratețea medie este de 85-90% față de verdictele jurnaliștilor specializați în fact-checking. Întotdeauna includem sursele pentru a-ți permite să judeci singur.',
  },
];

export function PricingClient() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const isYearly = billingPeriod === 'yearly';

  return (
    <div className={styles.container}>
      {/* HEADER SECTION */}
      <section className={styles.header}>
        <h1 className={styles.title}>Prețuri simple și transparente</h1>
        <p className={styles.subtitle}>
          Verificarea adevărului nu ar trebui să fie scumpă. De aceea avem un plan gratuit pentru totdeauna.
        </p>

        <div className={styles.toggleWrapper}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${!isYearly ? styles.toggleActive : ''}`}
            onClick={() => setBillingPeriod('monthly')}
          >
            Lunar
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${isYearly ? styles.toggleActive : ''}`}
            onClick={() => setBillingPeriod('yearly')}
          >
            Anual
            <span className={styles.discountBadge}>-20% 🏷️</span>
          </button>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className={styles.cardsGrid}>
        {/* FREE CARD */}
        <div className={styles.card}>
          <div>
            <div className={styles.cardHeader}>
              <h2 className={styles.tierName}>{TIER_CONFIG.free.name}</h2>
              <p className={styles.priceSubtext}>Pentru uz personal ocazional</p>
              <div className={styles.priceWrapper}>
                <span className={styles.priceAmount}>€0</span>
                <span className={styles.pricePeriod}>/ lună</span>
              </div>
              <div className={styles.priceSubtext}>pentru totdeauna</div>
            </div>

            <ul className={styles.featuresList}>
              {TIER_CONFIG.free.features.map((feat, i) => (
                <li key={i} className={styles.featureItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/register" className={styles.ctaBtn}>
            Începe gratuit
          </Link>
        </div>

        {/* PRO CARD (RECOMMENDED) */}
        <div className={`${styles.card} ${styles.proCard}`}>
          <div className={styles.popularBadge}>⭐ Cel mai popular</div>
          <div>
            <div className={styles.cardHeader}>
              <h2 className={styles.tierName}>{TIER_CONFIG.pro.name}</h2>
              <p className={styles.priceSubtext}>Pentru jurnaliști și cercetători</p>
              <div className={styles.priceWrapper}>
                <span className={styles.priceAmount}>
                  €{isYearly ? (TIER_CONFIG.pro.priceYearly / 12).toFixed(2) : TIER_CONFIG.pro.priceMonthly}
                </span>
                <span className={styles.pricePeriod}>/ lună</span>
              </div>
              <div className={styles.priceSubtext}>
                {isYearly
                  ? `Facturat anual (€${TIER_CONFIG.pro.priceYearly})`
                  : 'Facturat lunar'}
              </div>
            </div>

            <ul className={styles.featuresList}>
              {TIER_CONFIG.pro.features.map((feat, i) => (
                <li key={i} className={styles.featureItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span className={i > 0 ? styles.boldFeature : ''}>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/register?plan=pro"
            className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}
          >
            Începe perioada de test
          </Link>
        </div>

        {/* BUSINESS CARD */}
        <div className={styles.card}>
          <div>
            <div className={styles.cardHeader}>
              <h2 className={styles.tierName}>{TIER_CONFIG.business.name}</h2>
              <p className={styles.priceSubtext}>Pentru redacții și organizații</p>
              <div className={styles.priceWrapper}>
                <span className={styles.priceAmount}>
                  €{isYearly ? (TIER_CONFIG.business.priceYearly / 12).toFixed(2) : TIER_CONFIG.business.priceMonthly}
                </span>
                <span className={styles.pricePeriod}>/ lună</span>
              </div>
              <div className={styles.priceSubtext}>
                {isYearly
                  ? `Facturat anual (€${TIER_CONFIG.business.priceYearly})`
                  : 'Facturat lunar'}
              </div>
            </div>

            <ul className={styles.featuresList}>
              {TIER_CONFIG.business.features.map((feat, i) => (
                <li key={i} className={styles.featureItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <a href="mailto:contact@factcheck-ai.ro" className={styles.ctaBtn}>
            Contactează-ne
          </a>
        </div>
      </section>

      {/* FEATURE COMPARISON TABLE */}
      <section>
        <h2 className={styles.sectionTitle}>Comparativ detaliat funcționalități</h2>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Funcționalitate</th>
                <th>Gratuit</th>
                <th>Pro</th>
                <th>Business</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.highlightRow}>
                <td><strong>Verificări/lună</strong></td>
                <td><strong>10</strong></td>
                <td><strong>200</strong></td>
                <td><strong>2,000</strong></td>
              </tr>
              <tr>
                <td>Screenshot upload</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr>
                <td>Verificare text & URL</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr>
                <td>Raport detaliat cu surse</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr className={styles.highlightRow}>
                <td>Export PDF</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr>
                <td>API access</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr>
                <td>Verificări bulk</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr>
                <td>Webhook notifications</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr>
                <td>Analytics dashboard</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr>
                <td>Suport prioritar</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.checkMark}>✓</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
              <tr>
                <td>SLA 99.9% uptime</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.crossMark}>✗</td>
                <td className={styles.checkMark}>✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section>
        <h2 className={styles.sectionTitle}>Întrebări frecvente</h2>

        <div className={styles.faqContainer}>
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div key={index} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <span className={`${styles.faqArrow} ${isOpen ? styles.faqArrowOpen : ''}`}>
                    ▼
                  </span>
                </button>
                {isOpen && <div className={styles.faqAnswer}>{item.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaBannerTitle}>Gata să combați dezinformarea?</h2>
        <div className={styles.ctaBannerButtons}>
          <Link href="/register" className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}>
            Începe gratuit — fără card
          </Link>
          <a href="mailto:contact@factcheck-ai.ro" className={styles.ctaBtn}>
            Întreabă-ne orice →
          </a>
        </div>
      </section>
    </div>
  );
}
