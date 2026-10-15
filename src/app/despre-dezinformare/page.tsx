'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function DespreDezinformarePage() {
  const { dict } = useLanguage();
  const content = dict.despreDezinformarePage;

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 className={shell.title}>{content.title}</h1>
        <p className={shell.lead}>{content.lead}</p>
      </header>

      <div className={shell.body}>
        <Callout label={content.calloutLabel}>{content.calloutText}</Callout>

        {/* Section 1: Anatomy / Pillars */}
        <section className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{content.pillarsTitle}</h2>
          <p className={styles.sectionLead}>{content.pillarsLead}</p>
          <div className={styles.pillarsGrid}>
            {content.pillars.map((pillar) => (
              <div key={pillar.badge} className={styles.pillarCard}>
                <span className={styles.pillarBadge}>{pillar.badge}</span>
                <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                <p className={styles.pillarText}>{pillar.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Real Techniques & Examples */}
        <section className={shell.sectionRule}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{content.techniquesTitle}</h2>
            <p className={styles.sectionLead}>{content.techniquesLead}</p>
          </div>
          <div className={styles.techniquesGrid}>
            {content.techniques.map((item) => (
              <article key={item.title} className={styles.techniqueCard}>
                <div className={styles.techniqueHeader}>
                  <span className={styles.techniqueTag}>{item.tag}</span>
                  <h3 className={styles.techniqueTitle}>{item.title}</h3>
                </div>
                <div className={styles.techniqueBody}>
                  <div className={styles.techniqueRow}>
                    <span className={`${styles.techniqueLabel} ${styles.labelTrap}`}>
                      {content.labelTrap}
                    </span>
                    <p className={styles.techniqueContent}>{item.trap}</p>
                  </div>
                  <div className={styles.techniqueRow}>
                    <span className={`${styles.techniqueLabel} ${styles.labelReality}`}>
                      {content.labelReality}
                    </span>
                    <p className={styles.techniqueContent}>{item.reality}</p>
                  </div>
                  <div className={styles.techniqueExampleBox}>
                    {item.example}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section 3: 5-Step Action Checklist */}
        <section className={shell.sectionRule}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{content.stepsTitle}</h2>
            <p className={styles.sectionLead}>{content.stepsLead}</p>
          </div>
          <ol className={styles.stepsList}>
            {content.steps.map((step) => (
              <li key={step.num} className={styles.stepCard}>
                <span className={styles.stepNumber}>{step.num}</span>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Section 4: Family & WhatsApp Conversations */}
        <section className={shell.sectionRule}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{content.familyTitle}</h2>
            <p className={styles.sectionLead}>{content.familyLead}</p>
          </div>
          <div className={styles.familyBox}>
            <div className={styles.familyRulesGrid}>
              {content.familyRules.map((rule) => (
                <div key={rule.title} className={styles.familyRule}>
                  <h3 className={styles.familyRuleTitle}>{rule.title}</h3>
                  <p className={styles.familyRuleText}>{rule.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Specific Guides & Verifact Tools */}
        <section className={shell.sectionRule}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{content.guidesTitle}</h2>
            <p className={styles.sectionLead}>{content.guidesLead}</p>
          </div>
          <div className={styles.guidesGrid}>
            {content.guides.map((guide) => (
              <Link key={guide.title} href={guide.href} className={styles.guideCard}>
                <div>
                  <span className={styles.guideTag}>{guide.tag}</span>
                  <h3 className={styles.guideTitle}>{guide.title}</h3>
                  <p className={styles.guideDesc}>{guide.desc}</p>
                </div>
                <span className={styles.guideAction}>{guide.action}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 6: Closing & Citation note */}
        <section className={shell.sectionRule}>
          <p className={styles.closing}>
            {content.closingText}
            <Link href="/" className={styles.textLink}>
              {content.verifyLink}
            </Link>
            {content.orText}
            <Link href="/transparenta" className={styles.textLink}>
              {content.methodologyLink}
            </Link>
            .
          </p>
          <p className={styles.closing} style={{ marginTop: 'var(--space-3)', opacity: 0.75 }}>
            {content.sourcesNote}
          </p>
        </section>
      </div>
    </div>
  );
}
