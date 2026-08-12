import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { VerdictType } from '@/types/database';
import styles from './page.module.css';

export const revalidate = 60; // ISR revalidation every 60s for public feed

export const metadata: Metadata = {
  title: 'Rapoarte de Verificare Publice — Verifact',
  description: 'Explorează rapoartele publice de verificare factuală efectuate de utilizatorii Verifact pe baza surselor verificate independent.',
  alternates: {
    canonical: 'https://verifact.ro/rapoarte',
  },
  openGraph: {
    title: 'Rapoarte de Verificare Publice — Verifact',
    description: 'Explorează rapoartele publice de verificare factuală efectuate de utilizatorii Verifact.',
    url: 'https://verifact.ro/rapoarte',
    siteName: 'Verifact',
    locale: 'ro_RO',
    type: 'website',
  },
};

interface PublicReportItem {
  id: string;
  input_text: string;
  verdict: VerdictType | null;
  score: number | null;
  created_at: string;
  published_at: string | null;
  show_author: boolean;
  author_name?: string | null;
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 12;

function getVerdictInfo(verdict: VerdictType | null): { label: string; badgeClass: string } {
  switch (verdict) {
    case 'true':
      return { label: 'Probabil Adevărat', badgeClass: styles.badgeTrue };
    case 'false':
      return { label: 'Probabil Fals', badgeClass: styles.badgeFalse };
    case 'partial':
      return { label: 'Parțial Adevărat', badgeClass: styles.badgePartial };
    case 'unclear':
    default:
      return { label: 'Neclar', badgeClass: styles.badgeUnclear };
  }
}

async function getPublicReports(page: number): Promise<{ reports: PublicReportItem[]; totalCount: number }> {
  try {
    const supabase = await createServerClient();
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Query ONLY public verifications with explicit public-safe fields + optional profile username
    const { data, count, error } = await supabase
      .from('verifications')
      .select('id, input_text, verdict, score, created_at, published_at, show_author, profiles(username)', { count: 'exact' })
      .eq('visibility_status', 'public')
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error || !data) {
      return { reports: [], totalCount: 0 };
    }

    const reports: PublicReportItem[] = data.map((item: Record<string, unknown>) => {
      const profile = item.profiles as { username: string | null } | null;
      const showAuthor = Boolean(item.show_author);
      return {
        id: String(item.id),
        input_text: String(item.input_text || ''),
        verdict: item.verdict as VerdictType | null,
        score: typeof item.score === 'number' ? item.score : null,
        created_at: String(item.created_at),
        published_at: item.published_at ? String(item.published_at) : null,
        show_author: showAuthor,
        author_name: showAuthor && profile?.username ? profile.username : null,
      };
    });

    return { reports, totalCount: count || 0 };
  } catch {
    return { reports: [], totalCount: 0 };
  }
}

export default async function PublicReportsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1);
  const { reports, totalCount } = await getPublicReports(currentPage);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className={`container ${styles.feedPage}`}>
      <header className={styles.feedHeader}>
        <h1 className={styles.feedTitle}>Rapoarte de Verificare Publice</h1>
        <p className={styles.feedLead}>
          Știri, decupaje din rețele sociale și afirmații publice verificate cu inteligență artificială și surse transparente.
        </p>
      </header>

      {reports.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>Nu există rapoarte publice în acest moment</h2>
          <p className={styles.emptyText}>
            Fii primul care verifică și publică o știre pe Verifact.
          </p>
          <Link href="/" className={styles.pageBtn}>
            Verifică o știre gratuit
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.reportsGrid}>
            {reports.map((report) => {
              const verdictInfo = getVerdictInfo(report.verdict);
              const displayDate = report.published_at || report.created_at;
              const formattedDate = new Date(displayDate).toLocaleDateString('ro-RO', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <Link key={report.id} href={`/rapoarte/${report.id}`} className={styles.reportCard}>
                  <div className={styles.cardHeader}>
                    <span className={`${styles.verdictBadge} ${verdictInfo.badgeClass}`}>
                      {verdictInfo.label}
                    </span>
                    {typeof report.score === 'number' && (
                      <span className={styles.scoreBadge}>{report.score}%</span>
                    )}
                  </div>
                  <h2 className={styles.claimSnippet}>&ldquo;{report.input_text}&rdquo;</h2>
                  <div className={styles.cardFooter}>
                    <span className={styles.authorText}>
                      {report.show_author && report.author_name
                        ? `@${report.author_name}`
                        : 'Verificat pe Verifact'}
                    </span>
                    <time className={styles.dateText} dateTime={displayDate}>
                      {formattedDate}
                    </time>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Paginare rapoarte">
              <Link
                href={`/rapoarte?page=${currentPage - 1}`}
                className={`${styles.pageBtn} ${currentPage <= 1 ? styles.disabledBtn : ''}`}
                aria-disabled={currentPage <= 1}
              >
                &larr; Înapoi
              </Link>
              <span className={styles.pageIndicator}>
                Pagina {currentPage} din {totalPages}
              </span>
              <Link
                href={`/rapoarte?page=${currentPage + 1}`}
                className={`${styles.pageBtn} ${currentPage >= totalPages ? styles.disabledBtn : ''}`}
                aria-disabled={currentPage >= totalPages}
              >
                Înainte &rarr;
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
