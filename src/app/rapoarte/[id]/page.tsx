import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { VerificationReport, Verdict } from '@/types/verification';
import type { VisibilityStatus } from '@/types/database';
import { FlagReportButton } from '@/components/public-reports/FlagReportButton';
import shell from '../../page-shell.module.css';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface VerificationRow {
  id: string;
  input_text: string;
  verdict: Verdict | null;
  score: number | null;
  is_public: boolean;
  visibility_status: VisibilityStatus;
  show_author: boolean;
  language: string;
  created_at: string;
  published_at: string | null;
  report_json: VerificationReport | null;
  author_name?: string | null;
}

async function getPublicReport(id: string): Promise<VerificationRow | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('verifications')
      .select('id, input_text, verdict, score, is_public, visibility_status, show_author, language, created_at, published_at, report_json, profiles(username)')
      .eq('id', id)
      .eq('visibility_status', 'public')
      .single();

    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    if (row.visibility_status !== 'public') return null;

    const profile = row.profiles as { username: string | null } | null;
    const showAuthor = Boolean(row.show_author);

    return {
      id: String(row.id),
      input_text: String(row.input_text || ''),
      verdict: row.verdict as Verdict | null,
      score: typeof row.score === 'number' ? row.score : null,
      is_public: Boolean(row.is_public),
      visibility_status: row.visibility_status as VisibilityStatus,
      show_author: showAuthor,
      language: String(row.language || 'ro'),
      created_at: String(row.created_at),
      published_at: row.published_at ? String(row.published_at) : null,
      report_json: (row.report_json as VerificationReport | null) || null,
      author_name: showAuthor && profile?.username ? profile.username : null,
    };
  } catch {
    return null;
  }
}

function getVerdictLabel(verdict: Verdict | null): { label: string; badgeClass: string; ratingValue: number } {
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
  const description = `Raport de verificare independentă a informației: Scor de veridicitate ${data.score ?? 'N/A'}%. Vezi analiza detaliată și sursele citate pe Verifact.`;
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

  // Return HTTP 404 (notFound) if report does not exist or is not public
  if (!data) {
    notFound();
  }

  const verdictInfo = getVerdictLabel(data.verdict);
  const report = data.report_json;
  const displayDate = data.published_at || data.created_at;
  const authorLabel = data.show_author && data.author_name ? `@${data.author_name}` : 'Verificat pe Verifact';

  // Schema.org ClaimReview JSON-LD for Google Fact Check Carousel & Rich Results
  const claimReviewLdJson = {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: `https://verifact.ro/rapoarte/${id}`,
    datePublished: displayDate,
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
      author: data.show_author && data.author_name ? { '@type': 'Person', name: data.author_name } : undefined,
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
          {typeof data.score === 'number' && (
            <span className={styles.scoreBadge}>Scor veridicitate: {data.score}%</span>
          )}
        </div>
        <h1 className={styles.claimTitle}>&ldquo;{data.input_text}&rdquo;</h1>
        <p className={styles.metaText}>
          {authorLabel} • Verificat automat pe baza surselor publice • {new Date(displayDate).toLocaleDateString('ro-RO')}
        </p>
      </header>

      <main className={styles.reportCard}>
        <h2 className={styles.sectionTitle}>Analiză Factuală &amp; Context</h2>
        <div className={styles.analysisText}>
          {report?.executiveSummary ||
            (typeof report?.aiAnalysis === 'string' ? report.aiAnalysis : report?.aiAnalysis?.summary) ||
            'Analiza factuală este bazată pe interogarea surselor publice disponibile.'}
        </div>

        {report?.sources && report.sources.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 className={styles.sectionTitle}>Surse Citate</h3>
            <ul className={styles.sourcesList}>
              {report.sources.map((src, idx) => (
                <li key={idx} className={styles.sourceItem}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                    {src.publisher || src.title}
                  </a>
                  {src.title && src.publisher && (
                    <span style={{ color: 'var(--color-ink-muted)', marginLeft: '0.5rem' }}>
                      — {src.title}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <FlagReportButton reportId={id} />
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
