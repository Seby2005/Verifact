import React, { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReportView } from '@/components/verify/ReportView';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { ro } from '@/i18n/dictionaries/ro';
import { en } from '@/i18n/dictionaries/en';
import type { Verification } from '@/types/database';
import type { VerificationReport } from '@/types/verification';
import shell from '../../page-shell.module.css';

export const dynamic = 'force-dynamic';

const TITLE_MAX_CHARS = 60;

interface LoadedReport {
  report: VerificationReport;
  /** Read from the row, not the stored JSON, which can be stale after a PATCH. */
  isPublic: boolean;
}

/**
 * Returns the report only if the caller is allowed to see it — public, or
 * their own. Anything else (missing row, malformed id, private and not the
 * owner, never-completed verification) collapses to null, so the caller has a
 * single not-found path instead of four error cases.
 *
 * Cached per request so generateMetadata and the page share one query.
 */
const loadReport = cache(async (id: string): Promise<LoadedReport | null> => {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Verification;
  if (!row.report_json) return null;

  if (!row.is_public) {
    const user = await getAuthenticatedUser();
    if (row.user_id !== user?.id) return null;
  }

  return {
    report: row.report_json as unknown as VerificationReport,
    isPublic: row.is_public,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const loaded = await loadReport(id);
  if (!loaded) {
    return { title: 'Raport indisponibil', robots: { index: false } };
  }

  const { report, isPublic } = loaded;
  const dict = report.language === 'en' ? en : ro;

  const claim = (report.claim ?? report.inputText ?? '').trim();
  const title =
    claim.length > TITLE_MAX_CHARS ? `${claim.slice(0, TITLE_MAX_CHARS).trimEnd()}…` : claim;
  const description = `${dict.verdict.copy[report.verdict]} — ${dict.verdict.scoreLabel}${report.score}%`;

  return {
    title,
    description,
    // A private report is readable only by its owner; keep it out of indexes.
    robots: { index: isPublic, follow: isPublic },
    openGraph: {
      title,
      description,
      siteName: 'Verifact',
      locale: report.language === 'en' ? 'en_US' : 'ro_RO',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadReport(id);
  if (!loaded) notFound();

  return (
    <div className={`container ${shell.page}`}>
      <ReportView report={loaded.report} />
    </div>
  );
}
