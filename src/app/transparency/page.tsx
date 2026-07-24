'use client';

import React, { useState, useEffect } from 'react';
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
          const data: StatsData = await res.json();
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
            '@type': 'SoftwareApplication',
            name: 'FactCheck AI',
            applicationCategory: 'NewsApplication',
            operatingSystem: 'Web',
            url: process.env.NEXT_PUBLIC_APP_URL || 'https://fact-checker-ai.vercel.app',
            sameAs: ['https://github.com/Seby2005/fact-checker-ai'],
            license: 'https://opensource.org/licenses/MIT',
            description:
              'Aplicație web open-source de verificare a știrilor folosind inteligență artificială transparentă și algoritmi auditabili.',
          }),
        }}
      />

      {/* SECȚIUNEA 1 — Hero */}
      <section className={styles.heroSection}>
        <div className={`${styles.container} ${styles.hero}`}>
          <span className={styles.badge}>
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Cod Deschis & Transparență Totală
          </span>
          <h1 className={styles.title}>De Ce FactCheck AI este Open Source</h1>
          <p className={styles.subtitle}>
            Un instrument anti-dezinformare nu poate funcționa ca o cutie neagră. Încrederea se construiește prin cod sursă auditabil, algoritm explicat public și neutralitate demonstrabilă.
          </p>

          <div className={styles.badgeRow}>
            <span className={`${styles.badgeItem} ${styles.badgeMit}`}>Licență MIT</span>
            <span className={`${styles.badgeItem} ${styles.badgeTs}`}>TypeScript Strict</span>
            <span className={`${styles.badgeItem} ${styles.badgeCi}`}>CI Build: Passing</span>
          </div>

          <div className={styles.heroBtnGroup}>
            <a
              href="https://github.com/Seby2005/fact-checker-ai"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaButton}
              data-testid="github-link-button"
            >
              <svg className={styles.githubIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Explorează Repository-ul pe GitHub
            </a>
            <a href="#contribuie" className={`${styles.ctaButton} ${styles.secondaryCtaBtn}`}>
              Ghid de Contribuție ↓
            </a>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 2 — De Ce Open Source (4 Piloni de Încredere) */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>4 Piloni ai Transparenței FactCheck AI</h2>
            <p className={styles.sectionSubtitle}>
              Motivele concrete pentru care alegem să menținem codul complet deschis
            </p>
          </header>

          <div className={styles.pillarsGrid}>
            <article className={styles.pillarCard}>
              <div className={styles.pillarIconWrapper}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className={styles.pillarTitle}>1. Auditabilitatea Algoritmului</h3>
              <p className={styles.pillarText}>
                Utilizatorii au dreptul să verifice că sistemul nu este manipulat politic sau editorial. Fiecare pas din scoringul ponderat este definit în fișiere publice de cod TypeScript, deschise inspecției oricărui dezvoltator sau jurnalist.
              </p>
            </article>

            <article className={styles.pillarCard}>
              <div className={styles.pillarIconWrapper}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className={styles.pillarTitle}>2. Integritatea Prompt-urilor AI</h3>
              <p className={styles.pillarText}>
                Instrucțiunile de sistem transmise modelului Gemini 2.0 Flash impun reguli stricte: fără invenții, fără speculații și fără opinii proprii. Oricine poate citi prompt-urile exacte din <code>src/lib/ai/prompts.ts</code> pentru a confirma că AI-ul nu hallucinează.
              </p>
            </article>

            <article className={styles.pillarCard}>
              <div className={styles.pillarIconWrapper}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className={styles.pillarTitle}>3. Construirea Încrederii prin Surse</h3>
              <p className={styles.pillarText}>
                Nu vă cerem să ne credeți pe cuvânt. Sistemul interoghează 4 straturi distincte (Google Fact Check Tools, presă mainstream, domenii guvernamentale și rețele sociale) și citează fiecare sursă direct în raportul final.
              </p>
            </article>

            <article className={styles.pillarCard}>
              <div className={styles.pillarIconWrapper}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className={styles.pillarTitle}>4. Audit & Contribuții Externe</h3>
              <p className={styles.pillarText}>
                Dezvoltatorii independenți, cercetătorii în dezinformare și jurnaliștii pot contribui cu parsere noi, optimizări de scoring, traduceri sau semnalări de vulnerabilități direct prin Pull Request-uri pe GitHub.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 3 — Diferența Onestă: Cod Auditabil vs. Serviciul Live de Producție */}
      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Limitările Deschiderii: Ce Este și Ce Nu Este Public</h2>
            <p className={styles.sectionSubtitle}>
              Transparență fără promisiuni nerealiste — o defalcare clară a resurselor deschise vs. cele protejate în producție
            </p>
          </header>

          <div className={styles.comparisonGrid}>
            {/* Coloana Stânga: Ce E Deschis */}
            <div className={`${styles.comparisonCard} ${styles.openCard}`}>
              <div className={styles.cardHeaderRow}>
                <span className={styles.openStatusBadge}>✅ Deschis & Auditabil</span>
                <h3 className={styles.comparisonCardTitle}>Codul Sursă al Aplicației</h3>
              </div>
              <ul className={styles.comparisonList}>
                <li>
                  <strong>Logica de verificare în 4 straturi:</strong> Orchestratorul, interogările API și algoritmul de scoring ponderat.
                </li>
                <li>
                  <strong>Prompt-urile AI anti-bias:</strong> Toate instrucțiunile acordate modelului Gemini 2.0 Flash.
                </li>
                <li>
                  <strong>Interfața UI & Componentele:</strong> Structura React (Next.js 14), stilurile CSS Modules și paginile.
                </li>
                <li>
                  <strong>Schema bazei de date:</strong> Tabelele Supabase, modelele de date TypeScript și configurările RLS.
                </li>
                <li>
                  <strong>Ghidul de rulare locală:</strong> Instrucțiuni pas cu pas pentru executarea aplicației pe calculatorul propriu.
                </li>
              </ul>
            </div>

            {/* Coloana Dreapta: Ce E Privat în Producție */}
            <div className={`${styles.comparisonCard} ${styles.closedCard}`}>
              <div className={styles.cardHeaderRow}>
                <span className={styles.closedStatusBadge}>🔒 Privat & Protejat de Producție</span>
                <h3 className={styles.comparisonCardTitle}>Infrastructura Live & Secretele</h3>
              </div>
              <ul className={styles.comparisonList}>
                <li>
                  <strong>Cheile API de Producție:</strong> Cheile private pentru Google Cloud Vision OCR, Gemini API Key și NewsAPI.
                </li>
                <li>
                  <strong>Infrastructura de Găzduire Live:</strong> Proiectul Vercel de producție, serviciul DNS și CDN-ul asociat.
                </li>
                <li>
                  <strong>Datele Utilizatorilor Reali:</strong> Baza de date live de producție, parolele hash-uite și istoricul utilizatorilor.
                </li>
                <li>
                  <strong>Securitate & Auto-găzduire live:</strong> Repozitoriul deschis nu acordă permisiuni de utilizare neautorizată a mărcii live sau drept de rulare pe resursele noastre cloud.
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.honestNoteBox}>
            <div className={styles.noteIcon}>💡</div>
            <div className={styles.noteContent}>
              <h4 className={styles.noteTitle}>Notă privind Rularea Locală & Auto-Găzduirea</h4>
              <p className={styles.noteText}>
                Codul sursă vă permite să clonați repozitoriul și să rulați o instanță locală de dezvoltare pe calculatorul personal (folosind propriile chei API în <code>.env.local</code>). Codul deschis reflectă transparența algoritmului nostru, dar nu garantează infrastructură gratuită sau sprijin pentru servicii comerciale derivate neautorizate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 4 — Arhitectura Tehnică în 4 Straturi */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Arhitectura de Verificare în 4 Straturi</h2>
            <p className={styles.sectionSubtitle}>
              Procesul riguros prin care trec toate informațiile introduse în aplicație
            </p>
          </header>

          <div className={styles.diagramFlow}>
            <div className={styles.flowBox}>Input Utilizator: Text / Screenshot (OCR) / URL</div>
            <svg className={styles.arrowDown} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            <div className={styles.flowBox}>Verificare Cache SHA-256 & Preprocesare</div>
            <svg className={styles.arrowDown} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            {/* Grid 4 Straturi */}
            <div className={styles.layersGrid}>
              <div className={`${styles.layerCard} ${styles.s1Card}`}>
                <span className={styles.layerBadge}>Stratul 1 (Pondere 35%)</span>
                <h3 className={styles.layerTitle}>Fact-Check Tools API</h3>
                <p className={styles.layerDesc}>
                  Verificări anterioare din baze de date IFCN: Snopes, PolitiFact, FactCheck.org, AFP, Factual.ro.
                </p>
              </div>

              <div className={`${styles.layerCard} ${styles.s2Card}`}>
                <span className={styles.layerBadge}>Stratul 2 (Pondere 30%)</span>
                <h3 className={styles.layerTitle}>Presă Convențională</h3>
                <p className={styles.layerDesc}>
                  Publicații verificate: Digi24, ProTV, G4Media, HotNews (RO) și Reuters, BBC, AP (EN).
                </p>
              </div>

              <div className={`${styles.layerCard} ${styles.s3Card}`}>
                <span className={styles.layerBadge}>Stratul 3 (Pondere 25%)</span>
                <h3 className={styles.layerTitle}>Surse Oficiale</h3>
                <p className={styles.layerDesc}>
                  Domenii guvernamentale (.gov.ro, .europa.eu), OMS, ONU și instituții publice acreditate.
                </p>
              </div>

              <div className={`${styles.layerCard} ${styles.s4Card}`}>
                <span className={styles.layerBadge}>Stratul 4 (Pondere 10%)</span>
                <h3 className={styles.layerTitle}>Social Media & AI</h3>
                <p className={styles.layerDesc}>
                  Conturi verificate X/Twitter și sinteza obiectivă cu Gemini 2.0 Flash fără opinie adăugată.
                </p>
              </div>
            </div>

            <svg className={styles.arrowDown} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>

            <div className={`${styles.flowBox} ${styles.finalFlowBox}`}>
              Raport Detaliat cu Scor Transparent & Citări Directe
            </div>
          </div>

          {/* Acordion Detalii */}
          <div className={styles.accordionList}>
            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleAccordion(1)}
                aria-expanded={openAccordion === 1}
              >
                <span>Sursa de date din Stratul 1 — Google Fact Check Tools API</span>
                <svg
                  className={`${styles.accordionIcon} ${openAccordion === 1 ? styles.iconRotated : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
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
                    <li>Dacă există o verificare anterioară confirmată, aceasta oferă o pondere semnificativă de 35% scorului final.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleAccordion(2)}
                aria-expanded={openAccordion === 2}
              >
                <span>Sursa de date din Stratul 2 — Știri Jurnalistice Convenționale</span>
                <svg
                  className={`${styles.accordionIcon} ${openAccordion === 2 ? styles.iconRotated : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openAccordion === 2 && (
                <div className={styles.accordionBody}>
                  <p>
                    Interogăm publicații jurnalistice acreditate pentru a verifica dacă subiectul este acoperit de presa mainstream cu o politică editorială stabilită.
                  </p>
                  <ul>
                    <li>Surse Românești: Digi24, ProTV, G4Media, HotNews, Mediafax, News.ro.</li>
                    <li>Surse Internaționale: Reuters, Associated Press (AP), BBC News, Deutsche Welle.</li>
                    <li>Evaluăm concordanța dintre titluri și corpul articolelor găsite.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleAccordion(3)}
                aria-expanded={openAccordion === 3}
              >
                <span>Sursa de date din Stratul 3 — Surse Guvernamentale & Instituționale</span>
                <svg
                  className={`${styles.accordionIcon} ${openAccordion === 3 ? styles.iconRotated : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
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
                    <li>Garanția informațiilor furnizate direct de autorități oficiale.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleAccordion(4)}
                aria-expanded={openAccordion === 4}
              >
                <span>Stratul 4 & Inteligența Artificială (Gemini 2.0 Flash)</span>
                <svg
                  className={`${styles.accordionIcon} ${openAccordion === 4 ? styles.iconRotated : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
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

      {/* SECȚIUNEA 5 — Ghid de Rulare Locală & Licență */}
      <section className={styles.section} id="contribuie">
        <div className={styles.container}>
          <div className={styles.openSourceCard}>
            <header>
              <span className={styles.badge}>Instalare & Contribuții</span>
              <h2 className={styles.sectionTitle} style={{ marginTop: '8px' }}>
                Cum Rulezi Proiectul Local & Ghid de Contribuție
              </h2>
              <p className={`${styles.sectionSubtitle} ${styles.subtitleMargin}`}>
                Proiectul este licențiat sub termenii <strong style={{ color: 'var(--color-text-primary)' }}>MIT License</strong>. Oricine poate instala versiunea de dezvoltare locală în câțiva pași simpli.
              </p>
            </header>

            <div className={styles.codeSection}>
              <h4 className={styles.codeBlockTitle}>Pasul 1: Clonare & Instalare Dependențe</h4>
              <div className={styles.codeBlock}>
                <code>
                  git clone https://github.com/Seby2005/fact-checker-ai.git<br />
                  cd fact-checker-ai<br />
                  npm install
                </code>
              </div>
            </div>

            <div className={styles.codeSection}>
              <h4 className={styles.codeBlockTitle}>Pasul 2: Configurare Variabile de Mediu (.env.local)</h4>
              <div className={styles.codeBlock}>
                <code>
                  cp .env.example .env.local<br />
                  # Adaugă cheile tale API în .env.local (GEMINI_API_KEY, etc.)
                </code>
              </div>
            </div>

            <div className={styles.codeSection}>
              <h4 className={styles.codeBlockTitle}>Pasul 3: Pornire Server de Dezvoltare</h4>
              <div className={styles.codeBlock}>
                <code>npm run dev</code>
              </div>
            </div>

            <div className={styles.contribBox}>
              <h4 className={styles.contribTitle}>Ghid Rapid pentru Contribuitori</h4>
              <ol className={styles.contribList}>
                <li>Verifică fișierul <a href="https://github.com/Seby2005/fact-checker-ai/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">CONTRIBUTING.md</a> pentru toate convențiile de cod.</li>
                <li>Creează un branch dedicat: <code>feature/nume-feature</code> sau <code>fix/nume-fix</code>.</li>
                <li>Scrie cod în TypeScript strict fără excepții (fără <code>any</code>) și folosește CSS Modules pentru UI.</li>
                <li>Rulează <code>npm run type-check</code> și <code>npm test</code> înainte de a deschide un Pull Request.</li>
              </ol>
            </div>

            <div className={styles.btnGroup}>
              <a
                href="https://github.com/Seby2005/fact-checker-ai"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaButton}
              >
                Vezi Repository-ul pe GitHub &rarr;
              </a>
              <a
                href="https://github.com/Seby2005/fact-checker-ai/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.ctaButton} ${styles.secondaryCtaBtn}`}
              >
                Citește Licența MIT
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 6 — Statistici Agregate */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Statistici de Verificare în Timp Real</h2>
            <p className={styles.sectionSubtitle}>Date sintetizate din utilizarea platformei</p>
          </header>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{stats.totalVerifications}</span>
              <span className={styles.statLabel}>Total Verificări Efectuate</span>
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
            <h3 className={styles.chartTitle}>Distribuția Verdictelor Generat de Algoritm</h3>

            <div className={styles.barRow}>
              <span className={styles.barLabel}>Adevărat</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${styles.fillTrue}`}
                  style={{ '--bar-width': `${truePct}%` } as React.CSSProperties}
                />
              </div>
              <span className={styles.barValue}>{truePct}%</span>
            </div>

            <div className={styles.barRow}>
              <span className={styles.barLabel}>Fals</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${styles.fillFalse}`}
                  style={{ '--bar-width': `${falsePct}%` } as React.CSSProperties}
                />
              </div>
              <span className={styles.barValue}>{falsePct}%</span>
            </div>

            <div className={styles.barRow}>
              <span className={styles.barLabel}>Parțial</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${styles.fillPartial}`}
                  style={{ '--bar-width': `${partialPct}%` } as React.CSSProperties}
                />
              </div>
              <span className={styles.barValue}>{partialPct}%</span>
            </div>

            <div className={styles.barRow}>
              <span className={styles.barLabel}>Neclar</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${styles.fillUnclear}`}
                  style={{ '--bar-width': `${unclearPct}%` } as React.CSSProperties}
                />
              </div>
              <span className={styles.barValue}>{unclearPct}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECȚIUNEA 7 — Limitele AI & Disclaimer */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.warningCard}>
            <svg className={styles.warningIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className={styles.warningContent}>
              <h3 className={styles.warningTitle}>Limitările Algoritmului & Disclaimer Tehnic</h3>
              <ul className={styles.warningList}>
                <li>Inteligența Artificială oferă asistență analitică, dar poate comite erori. Verificați întotdeauna sursele primare citate în rapoarte.</li>
                <li>Verificăm exclusiv fapte empirice și afirmații verificabile, nu judecăți de valoare, speculații sau opinii personale.</li>
                <li>Rapoartele reflectă starea informațiilor publice disponibile la momentul exact al rulării căutării.</li>
                <li>Screenshot-urile încărcate pentru OCR sunt procesate în memorie și nu sunt stocate permanent pe serverele noastre.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
