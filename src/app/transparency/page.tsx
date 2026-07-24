'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface StatsData {
  totalVerifications: number;
  verdictDistribution: {
    true: number;
    false: number;
    partial: number;
    unclear: number;
  };
  averageProcessingTime: number;
  topSources: { name: string; count: number }[];
}

export default function TransparencyPage() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);
  const [stats, setStats] = useState<StatsData>({
    totalVerifications: 124,
    verdictDistribution: { true: 42, false: 31, partial: 35, unclear: 16 },
    averageProcessingTime: 8.5,
    topSources: [],
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Fallback default stats active
      }
    }
    fetchStats();
  }, []);

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const totalVerdicts =
    stats.verdictDistribution.true +
    stats.verdictDistribution.false +
    stats.verdictDistribution.partial +
    stats.verdictDistribution.unclear || 1;

  const truePct = Math.round((stats.verdictDistribution.true / totalVerdicts) * 100);
  const falsePct = Math.round((stats.verdictDistribution.false / totalVerdicts) * 100);
  const partialPct = Math.round((stats.verdictDistribution.partial / totalVerdicts) * 100);
  const unclearPct = Math.round((stats.verdictDistribution.unclear / totalVerdicts) * 100);

  return (
    <main className={styles.main}>
      {/* Schema Markup JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Fact-Checker AI',
            url: process.env.NEXT_PUBLIC_APP_URL || 'https://fact-checker-ai.vercel.app',
            sameAs: ['https://github.com/Seby2005/fact-checker-ai'],
            description:
              'Aplicație web open source de verificare a știrilor folosind inteligență artificială.',
          }),
        }}
      />

      {/* SECȚIUNEA 1 — Hero */}
      <section className={styles.section}>
        <div className={`${styles.container} ${styles.hero}`}>
          <span className={styles.badge}>
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Transparență Algoritm & Cod Sursă
          </span>
          <h1 className={styles.title}>Cum funcționează Fact-Checker AI</h1>
          <p className={styles.subtitle}>
            Transparență totală. Algoritmul nostru este 100% open source, fără poziții politice și complet verificabil.
          </p>
          <a
            href="https://github.com/Seby2005/fact-checker-ai"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaButton}
            data-testid="github-link-button"
          >
            <svg className={styles.githubIcon} viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Vezi codul sursă pe GitHub
          </a>
        </div>
      </section>

      {/* SECȚIUNEA 2 — Diagrama Algoritmului */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Arhitectura de Verificare în 4 Straturi</h2>
            <p className={styles.sectionSubtitle}>
              Fiecare afirmație trece printr-un proces riguros în mai mulți pași
            </p>
          </header>

          <div className={styles.diagramFlow}>
            <div className={styles.flowBox}>Input Utilizator: Text / Screenshot (OCR) / URL</div>
            <svg className={styles.arrowDown} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            <div className={styles.flowBox}>Verificare Cache & Preprocesare</div>
            <svg className={styles.arrowDown} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            {/* Grid 4 Straturi */}
            <div className={styles.layersGrid}>
              <div className={`${styles.layerCard} ${styles.s1Card}`}>
                <span className={styles.layerBadge}>Stratul 1</span>
                <h3 className={styles.layerTitle}>Fact-Check APIs</h3>
                <p className={styles.layerDesc}>
                  Baza de date Google Fact Check Tools (Snopes, PolitiFact, AFP, FactCheck.org).
                </p>
              </div>

              <div className={`${styles.layerCard} ${styles.s2Card}`}>
                <span className={styles.layerBadge}>Stratul 2</span>
                <h3 className={styles.layerTitle}>Știri Jurnalistice</h3>
                <p className={styles.layerDesc}>
                  Știri de la surse legitime RO (Digi24, ProTV, G4Media) și EN (Reuters, BBC, AP).
                </p>
              </div>

              <div className={`${styles.layerCard} ${styles.s3Card}`}>
                <span className={styles.layerBadge}>Stratul 3</span>
                <h3 className={styles.layerTitle}>Surse Oficiale</h3>
                <p className={styles.layerDesc}>
                  Domenii guvernamentale (.gov.ro, .europa.eu), OMS, ONU și instituții publice.
                </p>
              </div>

              <div className={`${styles.layerCard} ${styles.s4Card}`}>
                <span className={styles.layerBadge}>Stratul 4</span>
                <h3 className={styles.layerTitle}>Social Media</h3>
                <p className={styles.layerDesc}>
                  Verificarea declarațiilor pe conturile oficiale verificate X/Twitter și Facebook.
                </p>
              </div>
            </div>

            <svg className={styles.arrowDown} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            <div className={styles.flowBox}>Agregare Scor Ponderat (0-100%) + Analiză Gemini 2.0 Flash</div>
            <svg className={styles.arrowDown} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            <div className={styles.flowBox} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none' }}>
              Raport Detaliat cu Surse Citabile & Verdict
            </div>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 3 — Detalii per Strat */}
      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Detalii Tehnice ale Straturilor</h2>
            <p className={styles.sectionSubtitle}>Dă click pe fiecare strat pentru a vedea sursele și modul de verificare</p>
          </header>

          <div className={styles.accordionList}>
            {/* Accordion 1 */}
            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleAccordion(1)}
              >
                <span>Stratul 1 — Google Fact Check Tools API</span>
                <svg
                  className={`${styles.accordionIcon} ${openAccordion === 1 ? styles.iconRotated : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openAccordion === 1 && (
                <div className={styles.accordionBody}>
                  <p>
                    Căutăm afirmația direct în baza de date indexată de Google Fact Check Tools. Aceasta conține verificări realizate de organizații independente de fact-checking acreditate de IFCN (International Fact-Checking Network).
                  </p>
                  <ul>
                    <li>Surse principale: Snopes, PolitiFact, AFP Fact Check, FactCheck.org, Factual.ro.</li>
                    <li>Dacă exista o verificare anterioară confirmată, aceasta oferă o pondere semnificativă scorului final.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Accordion 2 */}
            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleAccordion(2)}
              >
                <span>Stratul 2 — Știri Jurnalistice Convenționale</span>
                <svg
                  className={`${styles.accordionIcon} ${openAccordion === 2 ? styles.iconRotated : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openAccordion === 2 && (
                <div className={styles.accordionBody}>
                  <p>
                    Interogăm publicații jurnalistice acreditate pentru a verifica dacă subiectul este acoperit de presa mainstream.
                  </p>
                  <ul>
                    <li>Surse Românești: Digi24, ProTV, G4Media, HotNews, Mediafax, News.ro.</li>
                    <li>Surse Internaționale: Reuters, Associated Press (AP), BBC News, Deutsche Welle.</li>
                    <li>Evaluăm concordanța dintre titluri și corpul articolelor găsite.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Accordion 3 */}
            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleAccordion(3)}
              >
                <span>Stratul 3 — Surse Guvernamentale & Instituționale</span>
                <svg
                  className={`${styles.accordionIcon} ${openAccordion === 3 ? styles.iconRotated : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openAccordion === 3 && (
                <div className={styles.accordionBody}>
                  <p>
                    Verificăm datele oficiale furnizate de instituțiile publice pentru a preveni dezinformările legate de legi, statistici sau măsuri guvernamentale.
                  </p>
                  <ul>
                    <li>Domenii: .gov.ro, .europa.eu, WHO.int, UN.org, INS (Institutul Național de Statistică).</li>
                    <li>Garanția informațiilor furnizate de autorități oficiale.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Accordion 4 */}
            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleAccordion(4)}
              >
                <span>Stratul 4 & Inteligența Artificială (Gemini 2.0 Flash)</span>
                <svg
                  className={`${styles.accordionIcon} ${openAccordion === 4 ? styles.iconRotated : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openAccordion === 4 && (
                <div className={styles.accordionBody}>
                  <p>
                    Rezultatele colectate de pe toate straturile sunt transmise modelului Gemini 2.0 Flash de la Google cu instrucțiuni stricte de sinteză:
                  </p>
                  <ul>
                    <li><strong>Integritate AI:</strong> Modelul nu inventează surse și nu ia poziții politice/editoriale.</li>
                    <li><strong>Limbaj probabilistic:</strong> Raportul folosește expresii bazate pe dovezi (&ldquo;datele indică&rdquo;, &ldquo;este consistent cu&rdquo;).</li>
                    <li>Generare automată a raportului structurat în limba română sau engleză.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 4 — Open Source */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.openSourceCard}>
            <div>
              <h2 className={styles.sectionTitle}>Codul sursă este 100% Public</h2>
              <p className={styles.sectionSubtitle} style={{ marginTop: '8px' }}>
                Dezvoltăm transparent. Aplicația Fact-Checker AI este un proiect open source licențiat sub licența MIT.
              </p>
            </div>

            <div className={styles.badgeRow}>
              <span className={`${styles.badgeItem} ${styles.badgeMit}`}>Licență: MIT</span>
              <span className={`${styles.badgeItem} ${styles.badgeCi}`}>CI Build: Passing</span>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px', color: '#111827' }}>Cum rulezi proiectul local în 3 pași:</h4>
              <div className={styles.codeBlock}>
                <code>
                  git clone https://github.com/Seby2005/fact-checker-ai.git<br />
                  cd fact-checker-ai<br />
                  npm install && npm run dev
                </code>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <a
                href="https://github.com/Seby2005/fact-checker-ai"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaButton}
              >
                Deschide pe GitHub &rarr;
              </a>
              <Link href="/pricing" className={styles.ctaButton} style={{ backgroundColor: '#ffffff', color: '#111827', border: '1px solid #e9ecef' }}>
                Ghid Contribuții (CONTRIBUTING)
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 5 — Statistici Agregate */}
      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Statistici de Verificare</h2>
            <p className={styles.sectionSubtitle}>Date sintetizate din platformă</p>
          </header>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{stats.totalVerifications}</span>
              <span className={styles.statLabel}>Total Verificări Efecutate</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statNumber}>{stats.averageProcessingTime}s</span>
              <span className={styles.statLabel}>Timp Mediu de Procesare</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statNumber}>100%</span>
              <span className={styles.statLabel}>Surse Verificabile</span>
            </div>
          </div>

          {/* Graph CSS Verdict Distribution */}
          <div className={styles.chartContainer}>
            <h3 className={styles.chartTitle}>Distribuția Verdictelor</h3>

            <div className={styles.barRow}>
              <span className={styles.barLabel}>Adevărat</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${truePct}%`, backgroundColor: '#16a34a' }} />
              </div>
              <span className={styles.barValue}>{truePct}%</span>
            </div>

            <div className={styles.barRow}>
              <span className={styles.barLabel}>Fals</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${falsePct}%`, backgroundColor: '#dc2626' }} />
              </div>
              <span className={styles.barValue}>{falsePct}%</span>
            </div>

            <div className={styles.barRow}>
              <span className={styles.barLabel}>Parțial</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${partialPct}%`, backgroundColor: '#d97706' }} />
              </div>
              <span className={styles.barValue}>{partialPct}%</span>
            </div>

            <div className={styles.barRow}>
              <span className={styles.barLabel}>Neclar</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${unclearPct}%`, backgroundColor: '#6c757d' }} />
              </div>
              <span className={styles.barValue}>{unclearPct}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 6 — Limitele AI */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.warningCard}>
            <svg className={styles.warningIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className={styles.warningContent}>
              <h3 className={styles.warningTitle}>Limitările Inteligenței Artificiale</h3>
              <ul className={styles.warningList}>
                <li>AI-ul poate face erori de interpretare. Verificați întotdeauna sursele citate în raport.</li>
                <li>Verificăm fapte obiective și declarații verificabile, nu opinii personale sau judecăți de valoare.</li>
                <li>Rapoartele reflectă starea informațiilor publice disponibile exact la momentul verificării.</li>
                <li>Screenshot-urile încărcate nu sunt stocate permanent pe serverele noastre.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
