import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublicReports } from '@/lib/verification/public-reports-query';
import { PublicReportCard } from '@/components/reports/PublicReportCard';
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

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}



export default async function PublicReportsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1);

  // Consume central helper (single source of truth)
  const { reports, totalPages } = await listPublicReports({ page: currentPage, limit: 12 });

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
            {reports.map((report) => (
              <PublicReportCard key={report.id} report={report} variant="feed" />
            ))}
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
