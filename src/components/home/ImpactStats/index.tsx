import React from 'react';
import styles from './ImpactStats.module.css';

export const ImpactStats: React.FC = () => {
  const items = [
    {
      stat: '6 din 10',
      description: 'români au dat share la o știre falsă în ultimul an',
      source: 'Sursa: IPSOS 2023',
    },
    {
      stat: '3 minute',
      description: 'cât durează o verificare manuală medie prin mai multe tab-uri',
      source: 'Studiu intern de utilizare',
    },
    {
      stat: '30 secunde',
      description: 'cât durează verificarea noastră automată cu Gemini AI',
      source: 'Timp mediu de răspuns API',
    },
  ];

  return (
    <section className={styles.wrapper} aria-label="De ce contează verificarea știrilor">
      <div className={styles.container}>
        <h2 className={styles.title}>De ce contează verificarea știrilor</h2>
        <div className={styles.grid}>
          {items.map((item, idx) => (
            <div key={idx} className={styles.item}>
              <span className={styles.bigStat}>{item.stat}</span>
              <p className={styles.description}>{item.description}</p>
              <span className={styles.source}>{item.source}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
