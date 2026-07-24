'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReportCard } from '@/components/report/ReportCard';
import styles from './page.module.css';

interface ReportItem {
  id: string;
  verdict: string;
  score: number;
  input_text: string;
  created_at: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter States from URL
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialLanguage = searchParams.get('language') || 'all';
  const initialVerdict = searchParams.get('verdict') || 'all';
  const initialPeriod = searchParams.get('period') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [language, setLanguage] = useState(initialLanguage);
  const [verdict, setVerdict] = useState(initialVerdict);
  const [period, setPeriod] = useState(initialPeriod);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync state to URL
  const updateUrl = useCallback(
    (newParams: {
      page?: number;
      language?: string;
      verdict?: string;
      period?: string;
      search?: string;
    }) => {
      const params = new URLSearchParams();
      const pPage = newParams.page ?? page;
      const pLang = newParams.language ?? language;
      const pVerd = newParams.verdict ?? verdict;
      const pPer = newParams.period ?? period;
      const pSearch = newParams.search ?? debouncedSearch;

      if (pPage > 1) params.set('page', pPage.toString());
      if (pLang !== 'all') params.set('language', pLang);
      if (pVerd !== 'all') params.set('verdict', pVerd);
      if (pPer !== 'all') params.set('period', pPer);
      if (pSearch.trim()) params.set('search', pSearch.trim());

      const query = params.toString();
      router.push(`/reports${query ? `?${query}` : ''}`, { scroll: false });
    },
    [page, language, verdict, period, debouncedSearch, router]
  );

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (language !== 'all') params.set('language', language);
      if (verdict !== 'all') params.set('verdict', verdict);
      if (period !== 'all') params.set('period', period);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setPagination(
          data.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          }
        );
      }
    } catch {
      // Error fetching reports
    } finally {
      setIsLoading(false);
    }
  }, [page, language, verdict, period, debouncedSearch]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFilterChange = (
    type: 'language' | 'verdict' | 'period',
    value: string
  ) => {
    setPage(1);
    if (type === 'language') {
      setLanguage(value);
      updateUrl({ page: 1, language: value });
    } else if (type === 'verdict') {
      setVerdict(value);
      updateUrl({ page: 1, verdict: value });
    } else if (type === 'period') {
      setPeriod(value);
      updateUrl({ page: 1, period: value });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setPage(1);
    updateUrl({ page: 1, search: e.target.value });
  };

  const handleResetFilters = () => {
    setLanguage('all');
    setVerdict('all');
    setPeriod('all');
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
    router.push('/reports', { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters =
    language !== 'all' ||
    verdict !== 'all' ||
    period !== 'all' ||
    debouncedSearch.trim() !== '';

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Rapoarte publice de verificare</h1>
        <p className={styles.subtitle}>
          Vezi ce au verificat alți utilizatori. Fact-checking transparent, rapid și verificabil.
        </p>
      </header>

      {/* Bară Filtre & Căutare */}
      <div className={styles.filterContainer} data-testid="reports-filter-bar">
        <div className={styles.searchBox}>
          <svg
            className={styles.searchIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Caută o afirmație..."
            value={searchInput}
            onChange={handleSearchChange}
            data-testid="search-input"
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            className={styles.select}
            value={language}
            onChange={(e) => handleFilterChange('language', e.target.value)}
            data-testid="filter-language"
          >
            <option value="all">Toate limbile</option>
            <option value="ro">Română</option>
            <option value="en">Engleză</option>
          </select>

          <select
            className={styles.select}
            value={verdict}
            onChange={(e) => handleFilterChange('verdict', e.target.value)}
            data-testid="filter-verdict"
          >
            <option value="all">Toate verdictele</option>
            <option value="true">Adevărat</option>
            <option value="false">Fals</option>
            <option value="partial">Parțial</option>
            <option value="unclear">Neclar</option>
          </select>

          <select
            className={styles.select}
            value={period}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            data-testid="filter-period"
          >
            <option value="all">Toate timpurile</option>
            <option value="24h">Ultimele 24h</option>
            <option value="7d">Ultima săptămână</option>
            <option value="30d">Ultima lună</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleResetFilters}
              data-testid="reset-filters-button"
            >
              Resetează filtrele
            </button>
          )}
        </div>
      </div>

      {/* Grid Rapoarte sau Stări (Loading / Empty) */}
      {isLoading ? (
        <div className={styles.grid} data-testid="reports-loading-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonHeader} />
              <div className={styles.skeletonBody} />
              <div className={styles.skeletonFooter} />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className={styles.emptyState} data-testid="reports-empty-state">
          <svg
            className={styles.emptyIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className={styles.emptyText}>
            Nu am găsit rapoarte publice care să corespundă filtrelor tale.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleResetFilters}
            >
              Resetează filtrele
            </button>
          )}
        </div>
      ) : (
        <main className={styles.grid} data-testid="reports-grid">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              id={report.id}
              verdict={report.verdict}
              score={report.score}
              inputText={report.input_text}
              createdAt={report.created_at}
            />
          ))}
        </main>
      )}

      {/* Paginare */}
      {!isLoading && pagination.totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Paginare rapoarte" data-testid="pagination-nav">
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => handlePageChange(page - 1)}
            disabled={!pagination.hasPrev}
            aria-label="Pagina anterioară"
            data-testid="prev-page-button"
          >
            &larr; Înapoi
          </button>

          {Array.from({ length: pagination.totalPages }).map((_, index) => {
            const pageNum = index + 1;
            // Limit page buttons visible if too many
            if (
              pageNum === 1 ||
              pageNum === pagination.totalPages ||
              (pageNum >= page - 2 && pageNum <= page + 2)
            ) {
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`${styles.pageButton} ${
                    pageNum === page ? styles.activePage : ''
                  }`}
                  onClick={() => handlePageChange(pageNum)}
                  data-testid={`page-button-${pageNum}`}
                >
                  {pageNum}
                </button>
              );
            }
            return null;
          })}

          <button
            type="button"
            className={styles.pageButton}
            onClick={() => handlePageChange(page + 1)}
            disabled={!pagination.hasNext}
            aria-label="Pagina următoare"
            data-testid="next-page-button"
          >
            Înainte &rarr;
          </button>
        </nav>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className={styles.container}>Se încarcă...</div>}>
      <FeedContent />
    </Suspense>
  );
}
