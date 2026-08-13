import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicReportById } from '@/lib/verification/public-reports-query';
import type { Verdict } from '@/types/verification';
import { FlagReportButton } from '@/components/public-reports/FlagReportButton';
import { ReportPageCta } from '@/components/public-reports/ReportPageCta';
import { PublicReportCard } from '@/components/reports/PublicReportCard';
import shell from '../../page-shell.module.css';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
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
  // Consume central helper (single source of truth)
  const data = await getPublicReportById(id);

  if (!data) {
    return {
      title: 'Raport negăsit — Verifact',
      description: 'Raportul de verificare solicitat nu a fost găsit sau nu este public.',
    };
  }

  const verdictInfo = getVerdictLabel(data.verdict);
  const claimSnippet = data.inputText.slice(0, 100);
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
  // Consume central helper (single source of truth)
  const data = await getPublicReportById(id);

  // Return HTTP 404 (notFound) if report does not exist or is not public
  if (!data) {
    notFound();
  }

  const verdictInfo = getVerdictLabel(data.verdict);
  const report = data.reportJson;
  const displayDate = data.publishedAt || data.createdAt;
  const authorLabel = data.showAuthor && data.authorName ? `@${data.authorName}` : 'Verificat pe Verifact';

  // Schema.org ClaimReview JSON-LD for Google Fact Check Carousel & Rich Results
  const claimReviewLdJson = {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: `https://verifact.ro/rapoarte/${id}`,
    datePublished: displayDate,
    claimReviewed: data.inputText,
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
      datePublished: data.createdAt,
      author: data.showAuthor && data.authorName ? { '@type': 'Person', name: data.authorName } : undefined,
    },
  };

  return (
    <div className={`container ${styles.reportPage}`}>
      {/* Google ClaimReview Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(claimReviewLdJson) }}
      />

      <div style={{ marginBottom: '1.5rem' }}>
        <PublicReportCard report={data} variant="detail" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <FlagReportButton reportId={id} />
      </div>

      <ReportPageCta />
    </div>
  );
}
