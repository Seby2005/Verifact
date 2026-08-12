import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RESOURCE_ARTICLES } from '@/content/resurse';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Resurse, Ghiduri și Glosar despre Dezinformare — Verifact',
  description:
    'Articole educaționale, ghiduri practice, glosar de termeni și recapitulări lunare ale știrilor false din România.',
  openGraph: {
    title: 'Resurse și Ghiduri despre Dezinformare — Verifact',
    description:
      'Articole educaționale, ghiduri practice, glosar de termeni și recapitulări lunare despre dezinformare.',
    url: '/resurse',
  },
};

export default function ResursePage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Centru de resurse</p>
        <h1 className={shell.title}>Ghiduri și resurse educaționale</h1>
        <p className={shell.lead}>
          Materiale concepute pentru a te ajuta să identifici falsurile, să înțelegi termenii din domeniu
          și să evaluezi credibilitatea surselor din mediul online.
        </p>
      </header>

      <div className={shell.body}>
        <section>
          <h2 className={styles.sectionTitle}>Toate resursele și ghidurile</h2>
          <div className={styles.grid}>
            {RESOURCE_ARTICLES.map((article) => {
              const href = article.externalHref || `/resurse/${article.slug}`;

              return (
                <Link key={article.slug} href={href} className={styles.card}>
                  <div className={styles.meta}>
                    <span className={styles.category}>{article.category}</span>
                    <span className={styles.dot}>·</span>
                    <span>{article.readingTime} citire</span>
                  </div>
                  <h3 className={styles.title}>{article.title}</h3>
                  <p className={styles.description}>{article.description}</p>
                  <div className={styles.footer}>
                    <span>Autor: {article.author}</span>
                    <span className={styles.readLink}>Citește articolul →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={shell.sectionRule} style={{ marginTop: '3rem' }}>
          <p className={styles.intro}>
            Ai nevoie de verificarea unei afirmații specifice?{' '}
            <Link href="/" className={shell.textLink}>
              Folosește instrumentul AI Verifact
            </Link>{' '}
            sau află mai multe despre{' '}
            <Link href="/transparenta" className={shell.textLink}>
              metodologia noastră de analiză
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
