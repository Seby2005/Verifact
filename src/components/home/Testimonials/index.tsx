import React from 'react';
import styles from './Testimonials.module.css';

export const Testimonials: React.FC = () => {
  const testimonials = [
    {
      quote:
        'Ca jurnalist, economisesc ore întregi de verificare. Raportul include exact sursele de care am nevoie pentru a valida o știre înainte de redactare.',
      author: 'Andrei M.',
      role: 'Jurnalist independent',
      initials: 'AM',
    },
    {
      quote:
        'Am verificat o știre de pe Facebook înainte să o dau mai departe și era complet falsă. Aplicația mi-a arătat exact de unde venea dezinformarea.',
      author: 'Elena P.',
      role: 'Utilizator activ',
      initials: 'EP',
    },
    {
      quote:
        'Instrumentul perfect pentru educație media în liceu. Elevii mei înțeleg imediat diferența dintre o sursă verificată și un zvon nefondat.',
      author: 'Prof. Maria D.',
      role: 'Profesor de educație civică',
      initials: 'MD',
    },
  ];

  return (
    <section className={styles.section} aria-label="Ce spun utilizatorii">
      <h2 className={styles.title}>Folosit de jurnaliști și cetățeni activi</h2>
      <div className={styles.grid}>
        {testimonials.map((t, idx) => (
          <article key={idx} className={styles.card}>
            <span className={styles.quoteMark} aria-hidden="true">
              “
            </span>
            <p className={styles.quoteText}>{t.quote}</p>
            <div className={styles.authorRow}>
              <div className={styles.avatar}>{t.initials}</div>
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>{t.author}</span>
                <span className={styles.authorRole}>{t.role}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
