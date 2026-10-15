import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicReportById } from '@/lib/verification/public-reports-query';
import type { Verdict } from '@/types/verification';
import { FlagReportButton } from '@/components/public-reports/FlagReportButton';
import { ReportPageCta } from '@/components/public-reports/ReportPageCta';
import { ReportDeepDive } from '@/components/report/ReportDeepDive';
import { ReportAuditTrail } from '@/components/report/ReportAuditTrail';
import { PublicReportCard } from '@/components/reports/PublicReportCard';
import { JsonLd } from '@/components/JsonLd';
import { getTranslation, type Locale } from '@/i18n/language';
import { ro } from '@/i18n/dictionaries/ro';
import { en } from '@/i18n/dictionaries/en';
import { fr } from '@/i18n/dictionaries/fr';
import styles from './page.module.css';

const DICTS: Record<Locale, unknown> = { ro, en, fr };
const OG_LOCALE: Record<Locale, string> = { ro: 'ro_RO', en: 'en_US', fr: 'fr_FR' };

/** Narrows a stored report language string to a supported locale. */
function toLocale(lang: string | null | undefined): Locale {
  return lang === 'en' || lang === 'fr' ? lang : 'ro';
}

/** The verdict label in the report's own language (shares the dictionary the badge uses). */
function localizedVerdict(verdict: Verdict | null, locale: Locale): string {
  const dict = DICTS[locale] as Record<string, unknown>;
  const key =
    verdict === 'true'
      ? 'publicReports.verdictTrue'
      : verdict === 'false'
      ? 'publicReports.verdictFalse'
      : verdict === 'partial'
      ? 'publicReports.verdictPartial'
      : 'publicReports.verdictUnclear';
  return getTranslation(dict, key);
}

/** SEO description in the report's own language. */
function localizedDescription(score: number | null, locale: Locale): string {
  const s = score ?? 0;
  if (locale === 'en') {
    return `Independent information verification report: credibility score ${s}%. See the full analysis and cited sources on Verifact.`;
  }
  if (locale === 'fr') {
    return `Rapport de vérification indépendante de l'information : score de crédibilité ${s}%. Consultez l'analyse détaillée et les sources citées sur Verifact.`;
  }
  return `Raport de verificare independentă a informației: Scor de veridicitate ${s}%. Vezi analiza detaliată și sursele citate pe Verifact.`;
}

function getRatingValue(verdict: Verdict | null): number {
  switch (verdict) {
    case 'true':
      return 5;
    case 'false':
      return 1;
    case 'partial':
      return 3;
    case 'unclear':
    default:
      return 2;
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicReportById(id);

  if (!data) {
    return {
      title: 'Raport negăsit — Verifact',
      description: 'Raportul de verificare solicitat nu a fost găsit sau nu este public.',
    };
  }

  const metaLocale = toLocale(data.language);
  const claimSnippet = data.inputText.slice(0, 100);
  const title = `[${localizedVerdict(data.verdict, metaLocale)}] "${claimSnippet}..." — Verifact`;
  const description = localizedDescription(data.score, metaLocale);
  const canonicalUrl = `https://verifact.ro/rapoarte/${id}`;
  const ogImages = data.imageUrls.length > 0 ? data.imageUrls.slice(0, 1) : undefined;

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
      locale: OG_LOCALE[metaLocale],
      type: 'article',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages,
    },
  };
}

export default async function PublicReportPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPublicReportById(id);

  if (!data) {
    notFound();
  }

  const report = data.reportJson;
  const displayDate = data.publishedAt || data.createdAt;
  const reportLocale: Locale = data.language === 'en' || data.language === 'fr' ? data.language : 'ro';
  const ratingValue = getRatingValue(data.verdict);

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
      ratingValue,
      bestRating: 5,
      worstRating: 1,
      alternateName: localizedVerdict(data.verdict, reportLocale),
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
      <JsonLd data={claimReviewLdJson} />

      <div style={{ marginBottom: '1.5rem' }}>
        <PublicReportCard report={data} variant="detail" />
      </div>

      {data.imageUrls.length > 0 && (
        <div className={styles.imageGallery}>
          {data.imageUrls.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`Evidence ${idx + 1}`}
              className={styles.reportImage}
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <FlagReportButton reportId={id} />
      </div>

      {report ? <ReportDeepDive report={report} /> : null}

      <ReportAuditTrail report={report} id={id} date={displayDate} />

      <ReportPageCta />
    </div>
  );
}
