import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { VerificationReport, Verdict } from '@/types/verification';
import shell from '../../page-shell.module.css';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface VerificationRow {
  id: string;
  input_text: string;
  verdict: Verdict;
  score: number;
  is_public: boolean;
  language: string;
  created_at: string;
  report_json: VerificationReport;
}

async function getPublicReport(id: string): Promise<VerificationRow | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (error || !data) return null;
    return data as VerificationRow;
  } catch {
    return null;
  }
}

function getVerdictLabel(verdict: Verdict): { label: string; badgeClass: string; ratingValue: number } {
  switch (verdict) {
    case 'true':
      return { label: 'Probabil Adevărat', badgeClass: styles.badgeTrue, ratingValue: 5 };
    case 'false':
      return { label: 'Probabil Fals', badgeClass: styles.badgeFalse, ratingValue: 1 };
    case 'partial':
      return { label: 'Parțial Adevărat / Context Lipsă', badgeClass: styles.badgePartial, ratingValue: 3 };
    case 'unclear':
    default:
      return { label: 'Neclar / Dovezi Insuficiente', badgeClass: styles.badgeUnclear, ratingValue: 2 };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicReport(id);

  if (!data) {
    return {
      title: 'Raport negăsit — Verifact',
      description: 'Raportul de verificare solicitat nu a fost găsit sau nu este public.',
    };
  }

  const verdictInfo = getVerdictLabel(data.verdict);
  const claimSnippet = data.input_text.slice(0, 100);
  const title = `[${verdictInfo.label}] "${claimSnippet}..." — Verifact`;
  const description = `Raport de verificare independentă a informației: Scor de veridicitate ${data.score}%. Vezi analiza detaliată și sursele citate pe Verifact.`;
  const canonicalUrl = `https://verifact.ro/rapoarte/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Verifact',
      locale: 'ro_RO',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PublicReportPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPublicReport(id);

  if (!data) {
    notFound();
  }

  const verdictInfo = getVerdictLabel(data.verdict);
  const report = data.report_json;

  // Schema.org ClaimReview JSON-LD for Google Fact Check Carousel
  const claimReviewLdJson = {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: `https://verifact.ro/rapoarte/${id}`,
    datePublished: data.created_at,
    claimReviewed: data.input_text,
    author: {
      '@type': 'Organization',
      name: 'Verifact',
      url: 'https://verifact.ro',
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: verdictInfo.ratingValue,
      bestRating: 5,
      worstRating: 1,
      alternateName: verdictInfo.label,
    },
    itemReviewed: {
      '@type': 'Claim',
      datePublished: data.created_at,
    },
  };

  return (
    <div className={`container ${styles.reportPage}`}>
      {/* Google ClaimReview Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(claimReviewLdJson) }}
      />

      <header className={styles.reportHeader}>
        <div className={styles.badgeRow}>
          <span className={`${styles.verdictBadge} ${verdictInfo.badgeClass}`}>
            {verdictInfo.label}
          </span>
          <span className={styles.scoreBadge}>Scor veridicitate: {data.score}%</span>
        </div>
        <h1 className={styles.claimTitle}>&ldquo;{data.input_text}&rdquo;</h1>
        <p className={styles.metaText}>
          Verificat automat pe baza surselor publice • {new Date(data.created_at).toLocaleDateString('ro-RO')}
        </p>
      </header>

      <main className={styles.reportCard}>
        <h2 className={styles.sectionTitle}>Analiză Factuală &amp; Context</h2>
        <div className={styles.analysisText}>
          {report?.executiveSummary ||
            (typeof report?.aiAnalysis === 'string' ? report.aiAnalysis : report?.aiAnalysis?.summary) ||
            'Analiza factuală este bazată pe interogarea surselor publice disponibile.'}
        </div>
      </main>

      <div className={styles.ctaBox}>
        <h3 className={styles.ctaTitle}>Vrei să verifici și tu o informație?</h3>
        <p className={styles.ctaText}>
          Introdu un text, un link sau încarcă un screenshot pentru o verificare rapidă cu surse transparente.
        </p>
        <Link href="/" className={shell.primaryBtn}>
          Verifică o știre gratuit
        </Link>
      </div>
    </div>
  );
}
