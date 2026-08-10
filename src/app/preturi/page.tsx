'use client';

import React, { useState, useEffect } from 'react';
import { Button, Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

const BUSINESS_EMAIL = 'verifactro@gmail.com';

type Billing = 'monthly' | 'yearly';

/** A cell in the comparison table is either a short value or an included flag. */
type Cell = string | boolean;

function CellMark({ value, included, excluded }: { value: Cell; included: string; excluded: string }) {
  if (typeof value === 'string') {
    return <span className={styles.cellValue}>{value}</span>;
  }
  if (value) {
    return (
      <span className={styles.markYes}>
        <svg viewBox="0 0 20 20" className={styles.markIcon} aria-hidden="true">
          <path
            d="M4 10.5 8 14.5 16 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.srOnly}>{included}</span>
      </span>
    );
  }
  return (
    <span className={styles.markNo}>
      <svg viewBox="0 0 20 20" className={styles.markIcon} aria-hidden="true">
        <path
          d="M6 6 14 14 M14 6 6 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.srOnly}>{excluded}</span>
    </span>
  );
}

export default function PreturiPage() {
  const { locale } = useLanguage();
  const isEn = locale === 'en';
  const [billing, setBilling] = useState<Billing>('yearly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'success') {
        setCheckoutSuccess(true);
      }
    }
  }, []);

  const handleProCheckout = async () => {
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/checkout/creem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.href = '/cont';
        return;
      }

      if (!res.ok || !data.checkoutUrl) {
        setCheckoutError(
          data.error || (isEn ? 'Failed to initiate checkout session.' : 'Nu am putut iniția sesiunea de plată.')
        );
        setIsSubmitting(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setCheckoutError(isEn ? 'A network error occurred.' : 'A apărut o eroare de rețea. Te rugăm să reîncerci.');
      setIsSubmitting(false);
    }
  };

  const c = isEn
    ? {
        eyebrow: 'Pricing',
        title: 'Free for everyday checks. Paid when you check a lot.',
        billing: { monthly: 'Monthly', yearly: 'Yearly', save: 'Save 25%', aria: 'Billing period' },
        recommended: 'Recommended',
        perMonth: '/mo',
        billedYearly: 'billed €35.90 a year',
        successTitle: 'Subscription Active!',
        successMsg: 'Your Pro subscription is now active! You have full Pro access.',
        free: {
          name: 'Free',
          price: 'Free',
          tagline: 'For anyone who wants to check what they see in their feed.',
          checks: '3 verifications a month',
          cta: 'Start free',
        },
        pro: {
          name: 'Pro',
          priceMonthly: '€3.99',
          priceYearly: '€2.99',
          tagline: 'For journalists, researchers, and anyone who checks daily.',
          checks: 'Over 10× more checks than the free plan.',
          cta: isSubmitting ? 'Connecting to Creem...' : 'Choose Pro',
        },
        business: {
          name: 'Business',
          price: 'Contact',
          tagline: 'For newsrooms, NGOs, and teams.',
          checks: 'Custom volume and features',
          cta: 'Get in touch',
        },
        compareTitle: 'Compare the plans',
        included: 'Included',
        excluded: 'Not included',
        rows: [
          { label: 'Verifications per month', free: '3', pro: 'Over 10×', business: 'Custom' },
          { label: 'Text, screenshot, and URL checks', free: true, pro: true, business: true },
          { label: 'Verdict, score, and cited sources', free: true, pro: true, business: true },
          { label: 'Download the report as PDF', free: false, pro: true, business: true },
          { label: 'Exact link to the sentence in each source', free: false, pro: true, business: true },
          { label: 'Priority support', free: false, pro: true, business: true },
          { label: 'API access', free: false, pro: false, business: true },
          { label: 'Team billing and seats', free: false, pro: false, business: true },
        ],
        footnotePrefix: 'No card needed for the free plan. For anything custom, write to ',
      }
    : {
        eyebrow: 'Prețuri',
        title: 'Gratuit pentru verificări de zi cu zi. Plătit când verifici mult.',
        billing: { monthly: 'Lunar', yearly: 'Anual', save: 'Economisești 25%', aria: 'Perioadă de facturare' },
        recommended: 'Recomandat',
        perMonth: '/lună',
        billedYearly: 'facturat €35,90 pe an',
        successTitle: 'Abonament Activat!',
        successMsg: 'Abonamentul tău Pro a fost activat cu succes! Ai acum acces la toate funcțiile Pro.',
        free: {
          name: 'Free',
          price: 'Gratuit',
          tagline: 'Pentru oricine vrea să verifice ce vede în feed.',
          checks: '3 verificări pe lună',
          cta: 'Începe gratuit',
        },
        pro: {
          name: 'Pro',
          priceMonthly: '€3,99',
          priceYearly: '€2,99',
          tagline: 'Pentru jurnaliști, cercetători și oricine verifică zilnic.',
          checks: 'De peste 10× mai multe verificări ca planul gratuit.',
          cta: isSubmitting ? 'Se conectează la Creem...' : 'Alege Pro',
        },
        business: {
          name: 'Business',
          price: 'Contact',
          tagline: 'Pentru redacții, ONG-uri și echipe.',
          checks: 'Volum și funcții la cerere',
          cta: 'Scrie-ne',
        },
        compareTitle: 'Compară planurile',
        included: 'Inclus',
        excluded: 'Neinclus',
        rows: [
          { label: 'Verificări pe lună', free: '3', pro: 'Peste 10×', business: 'La cerere' },
          { label: 'Verificare din text, screenshot și URL', free: true, pro: true, business: true },
          { label: 'Verdict, scor și surse citate', free: true, pro: true, business: true },
          { label: 'Descarcă raportul ca PDF', free: false, pro: true, business: true },
          { label: 'Link exact la propoziția din fiecare sursă', free: false, pro: true, business: true },
          { label: 'Suport prioritar', free: false, pro: true, business: true },
          { label: 'Acces API', free: false, pro: false, business: true },
          { label: 'Facturare și locuri pentru echipă', free: false, pro: false, business: true },
        ],
        footnotePrefix: 'Fără card pentru planul gratuit. Pentru orice nevoie aparte, scrie-ne la ',
      };

  const proPrice = billing === 'yearly' ? c.pro.priceYearly : c.pro.priceMonthly;

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 className={shell.title}>{c.title}</h1>
      </header>

      <div className={shell.body}>
        {checkoutSuccess && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Callout label={c.successTitle}>{c.successMsg}</Callout>
          </div>
        )}

        {checkoutError && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Callout label="Eroare Plată">{checkoutError}</Callout>
          </div>
        )}

        {/* Billing period toggle — monthly vs a cheaper yearly. */}
        <div className={styles.billingToggle} role="group" aria-label={c.billing.aria}>
          <button
            type="button"
            className={[styles.billingOption, billing === 'monthly' ? styles.billingActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-pressed={billing === 'monthly'}
            onClick={() => setBilling('monthly')}
          >
            {c.billing.monthly}
          </button>
          <button
            type="button"
            className={[styles.billingOption, billing === 'yearly' ? styles.billingActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-pressed={billing === 'yearly'}
            onClick={() => setBilling('yearly')}
          >
            {c.billing.yearly}
            <span className={styles.saveChip}>{c.billing.save}</span>
          </button>
        </div>

        <div className={styles.grid}>
          {/* Free */}
          <section className={styles.plan}>
            <div className={styles.planHead}>
              <h2 className={styles.planName}>{c.free.name}</h2>
              <p className={styles.priceRow}>
                <span className={styles.price}>{c.free.price}</span>
              </p>
              <p className={styles.checks}>{c.free.checks}</p>
              <p className={styles.forWho}>{c.free.tagline}</p>
            </div>
            <div className={styles.planCta}>
              <Button variant="secondary" size="md" fullWidth href="/cont">
                {c.free.cta}
              </Button>
            </div>
          </section>

          {/* Pro — highlighted */}
          <section className={`${styles.plan} ${styles.planHighlight}`}>
            <span className={styles.recommendedTag}>{c.recommended}</span>
            <div className={styles.planHead}>
              <h2 className={styles.planName}>{c.pro.name}</h2>
              <p className={styles.priceRow}>
                <span className={styles.price}>{proPrice}</span>
                <span className={styles.cadence}>{c.perMonth}</span>
              </p>
              <p className={styles.billedNote}>
                {billing === 'yearly' ? c.billedYearly : '\u00A0'}
              </p>
              <p className={styles.checks}>{c.pro.checks}</p>
              <p className={styles.forWho}>{c.pro.tagline}</p>
            </div>
            <div className={styles.planCta}>
              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                onClick={handleProCheckout}
              >
                {c.pro.cta}
              </Button>
            </div>
          </section>

          {/* Business */}
          <section className={styles.plan}>
            <div className={styles.planHead}>
              <h2 className={styles.planName}>{c.business.name}</h2>
              <p className={styles.priceRow}>
                <span className={styles.price}>{c.business.price}</span>
              </p>
              <p className={styles.checks}>{c.business.checks}</p>
              <p className={styles.forWho}>{c.business.tagline}</p>
            </div>
            <div className={styles.planCta}>
              <Button variant="secondary" size="md" fullWidth href={`mailto:${BUSINESS_EMAIL}`}>
                {c.business.cta}
              </Button>
            </div>
          </section>
        </div>

        {/* Feature comparison */}
        <section className={shell.sectionRule}>
          <h2 className={styles.compareTitle}>{c.compareTitle}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={styles.rowHead}>
                    <span className={styles.srOnly}>{c.compareTitle}</span>
                  </th>
                  <th scope="col" className={styles.planCol}>{c.free.name}</th>
                  <th scope="col" className={`${styles.planCol} ${styles.planColHi}`}>{c.pro.name}</th>
                  <th scope="col" className={styles.planCol}>{c.business.name}</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className={styles.rowHead}>{row.label}</th>
                    <td className={styles.cell}>
                      <CellMark value={row.free} included={c.included} excluded={c.excluded} />
                    </td>
                    <td className={`${styles.cell} ${styles.cellHi}`}>
                      <CellMark value={row.pro} included={c.included} excluded={c.excluded} />
                    </td>
                    <td className={styles.cell}>
                      <CellMark value={row.business} included={c.included} excluded={c.excluded} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className={shell.sectionRule}>
          <p className={styles.footnote}>
            {c.footnotePrefix}
            <a href={`mailto:${BUSINESS_EMAIL}`} className={styles.textLink}>
              {BUSINESS_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

