import React from 'react';
import styles from './HowItWorks.module.css';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: 1,
      title: 'Adaugă conținutul',
      description:
        'Screenshot, text sau link — acceptăm orice format. Suportăm conținut de pe Facebook, TikTok, Twitter, Instagram și orice site de știri.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
    },
    {
      step: 2,
      title: 'AI verifică în 4 straturi',
      description:
        'Algoritmul nostru caută în baze de date de fact-checking, știri verificate, surse guvernamentale și declarații oficiale — simultan.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      step: 3,
      title: 'Primești raportul detaliat',
      description:
        'Procentaj de veridicitate, surse citate, context și explicații — tot ce ai nevoie pentru a înțelege adevărul.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className={styles.section} aria-label="Cum funcționează">
      <div className={styles.header}>
        <h2 className={styles.title}>Simplu. Rapid. Transparent.</h2>
        <p className={styles.subtitle}>3 pași până la adevăr</p>
      </div>

      <div className={styles.grid}>
        {steps.map((item) => (
          <article key={item.step} className={styles.card}>
            <span className={styles.stepNumber} aria-hidden="true">
              0{item.step}
            </span>
            <div className={styles.iconWrapper}>{item.icon}</div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardText}>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
