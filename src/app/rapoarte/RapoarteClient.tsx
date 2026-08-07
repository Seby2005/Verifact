'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Callout, VerdictLabel, type VerdictKind } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

/** The subset of a `verifications` row the list actually renders. */
interface ReportRow {
  id: string;
  input_text: string;
  verdict: VerdictKind | null;
  score: number | null;
  created_at: string;
  is_public: boolean;
  report_json: { sources?: unknown[] } | null;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; reports: ReportRow[]; pagination: Pagination };

interface Filters {
  verdict: string;
  language: string;
  period: string;
  search: string;
}

const EMPTY_FILTERS: Filters = {
  verdict: 'all',
  language: 'all',
  period: 'all',
  search: '',
};

function hasActiveFilter(filters: Filters): boolean {
  return (
    filters.verdict !== 'all' ||
    filters.language !== 'all' ||
    filters.period !== 'all' ||
    filters.search.trim() !== ''
  );
}

/**
 * Builds the /api/reports query string. Kept in one place so the public feed
 * and the personal history differ only by `userOnly`.
 */
function buildQuery(filters: Filters, page: number, userOnly: boolean): string {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (filters.verdict !== 'all') params.set('verdict', filters.verdict);
  if (filters.language !== 'all') params.set('language', filters.language);
  if (filters.period !== 'all') params.set('period', filters.period);
  if (filters.search.trim() !== '') params.set('search', filters.search.trim());
  if (userOnly) params.set('user_only', 'true');
  return params.toString();
}

/**
 * Fetches a page of reports. `reloadKey` re-runs an identical query, which is
 * what the retry button needs after a failed fetch.
 */
function useReports(query: string, reloadKey: number): ListState {
  const [state, setState] = useState<ListState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`/api/reports?${query}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          reports: (data.reports ?? []) as ReportRow[],
          pagination: data.pagination as Pagination,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [query, reloadKey]);

  return state;
}

function formatDate(iso: string, locale: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function ReportItem({ row }: { row: ReportRow }) {
  const { locale, t } = useLanguage();
  const sourceCount = row.report_json?.sources?.length ?? 0;

  return (
    <li className={styles.item}>
      <div className={styles.itemMain}>
        <Link href={`/rapoarte/${row.id}`} className={styles.claimLink}>
          <span className={styles.claim}>{row.input_text}</span>
        </Link>
        <p className={styles.itemMeta}>
          {formatDate(row.created_at, locale)} ·{' '}
          {t('rapoartePage.sourcesCount', { count: sourceCount })}
          {row.is_public ? null : (
            <>
              {' · '}
              <span className={styles.privateBadge}>
                {t('rapoartePage.privateBadge')}
              </span>
            </>
          )}
        </p>
      </div>
      <div className={styles.itemVerdict}>
        <VerdictLabel kind={row.verdict ?? 'unclear'} score={row.score ?? undefined} />
      </div>
    </li>
  );
}

function ListSkeleton() {
  const { t } = useLanguage();
  return (
    <div className={styles.skeletonList} role="status" aria-live="polite">
      <span className={styles.srOnly}>{t('rapoartePage.loading')}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.skeletonItem} aria-hidden="true">
          <span className={styles.skeletonLine} />
          <span className={styles.skeletonLineShort} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{text}</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className={styles.stateBlock} role="alert">
      <Callout label={t('rapoartePage.errorLabel')} tone="plain">
        {t('rapoartePage.errorText')}
      </Callout>
      <div className={styles.stateActions}>
        <Button variant="secondary" size="md" onClick={onRetry}>
          {t('rapoartePage.retryBtn')}
        </Button>
      </div>
    </div>
  );
}

/** The signed-in user's own verifications, private ones included. */
function HistoryList() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const query = useMemo(() => buildQuery(EMPTY_FILTERS, page, true), [page]);
  const state = useReports(query, reloadKey);

  if (state.status === 'loading') return <ListSkeleton />;
  if (state.status === 'error') {
    return <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  if (state.reports.length === 0) {
    return (
      <EmptyState
        title={t('rapoartePage.historyEmptyTitle')}
        text={t('rapoartePage.historyEmptyText')}
      />
    );
  }

  return (
    <>
      <ol className={styles.list} aria-label={t('rapoartePage.yourHistoryTitle')}>
        {state.reports.map((row) => (
          <ReportItem key={row.id} row={row} />
        ))}
      </ol>
      <Pager pagination={state.pagination} onChange={setPage} />
    </>
  );
}

function Pager({
  pagination,
  onChange,
}: {
  pagination: Pagination;
  onChange: (page: number) => void;
}) {
  const { t } = useLanguage();
  if (pagination.totalPages <= 1) return null;

  return (
    <nav className={styles.pager} aria-label={t('rapoartePage.paginationAriaLabel')}>
      <Button
        variant="secondary"
        size="md"
        disabled={!pagination.hasPrev}
        onClick={() => onChange(pagination.page - 1)}
      >
        {t('rapoartePage.prevPage')}
      </Button>
      <span className={styles.pagerStatus} aria-live="polite">
        {t('rapoartePage.pagePosition', {
          page: pagination.page,
          total: pagination.totalPages,
        })}
      </span>
      <Button
        variant="secondary"
        size="md"
        disabled={!pagination.hasNext}
        onClick={() => onChange(pagination.page + 1)}
      >
        {t('rapoartePage.nextPage')}
      </Button>
    </nav>
  );
}

export default function RapoarteClient() {
  const { t } = useLanguage();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  // Typing should not fire a request per keystroke; the committed value in
  // `filters.search` is what the query is built from.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput ? prev : { ...prev, search: searchInput }
      );
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setIsSignedIn(Boolean(data.user)));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const query = useMemo(() => buildQuery(filters, page, false), [filters, page]);
  const state = useReports(query, reloadKey);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('rapoartePage.eyebrow')}</p>
        <h1 className={shell.title}>{t('rapoartePage.title')}</h1>
        <p className={shell.lead}>{t('rapoartePage.lead')}</p>
      </header>

      <div className={shell.body}>
        <div
          className={styles.filters}
          role="group"
          aria-label={t('rapoartePage.filters.ariaLabel')}
        >
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {t('rapoartePage.filters.searchLabel')}
            </span>
            <input
              type="search"
              className={styles.textInput}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('rapoartePage.filters.searchPlaceholder')}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {t('rapoartePage.filters.verdictLabel')}
            </span>
            <select
              className={styles.select}
              value={filters.verdict}
              onChange={(e) => setFilter('verdict', e.target.value)}
            >
              <option value="all">{t('rapoartePage.filters.optionAll')}</option>
              <option value="true">{t('verdict.copy.true')}</option>
              <option value="partial">{t('verdict.copy.partial')}</option>
              <option value="unclear">{t('verdict.copy.unclear')}</option>
              <option value="false">{t('verdict.copy.false')}</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {t('rapoartePage.filters.languageLabel')}
            </span>
            <select
              className={styles.select}
              value={filters.language}
              onChange={(e) => setFilter('language', e.target.value)}
            >
              <option value="all">{t('rapoartePage.filters.optionAll')}</option>
              <option value="ro">{t('rapoartePage.filters.languageRo')}</option>
              <option value="en">{t('rapoartePage.filters.languageEn')}</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {t('rapoartePage.filters.periodLabel')}
            </span>
            <select
              className={styles.select}
              value={filters.period}
              onChange={(e) => setFilter('period', e.target.value)}
            >
              <option value="all">{t('rapoartePage.filters.optionAll')}</option>
              <option value="24h">{t('rapoartePage.filters.period24h')}</option>
              <option value="7d">{t('rapoartePage.filters.period7d')}</option>
              <option value="30d">{t('rapoartePage.filters.period30d')}</option>
            </select>
          </label>
        </div>

        {state.status === 'loading' ? <ListSkeleton /> : null}

        {state.status === 'error' ? (
          <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
        ) : null}

        {state.status === 'ready' && state.reports.length === 0 ? (
          <EmptyState
            title={t(
              hasActiveFilter(filters)
                ? 'rapoartePage.emptyFilteredTitle'
                : 'rapoartePage.emptyTitle'
            )}
            text={t(
              hasActiveFilter(filters)
                ? 'rapoartePage.emptyFilteredText'
                : 'rapoartePage.emptyText'
            )}
          />
        ) : null}

        {state.status === 'ready' && state.reports.length > 0 ? (
          <>
            <p className={styles.resultsCount}>
              {t('rapoartePage.resultsCount', { count: state.pagination.total })}
            </p>
            <ol className={styles.list} aria-label={t('rapoartePage.listAriaLabel')}>
              {state.reports.map((row) => (
                <ReportItem key={row.id} row={row} />
              ))}
            </ol>
            <Pager pagination={state.pagination} onChange={setPage} />
          </>
        ) : null}

        <div className={shell.sectionRule}>
          <h2 className={styles.subhead}>{t('rapoartePage.yourHistoryTitle')}</h2>
          <p className={styles.subtext}>{t('rapoartePage.yourHistoryText')}</p>

          {isSignedIn ? (
            <div className={styles.historyBlock}>
              <HistoryList />
            </div>
          ) : (
            <div className={styles.actions}>
              <Button variant="secondary" size="md" href="/cont">
                {t('rapoartePage.loginBtn')}
              </Button>
              <Link href="/" className={styles.textLink}>
                {t('rapoartePage.verifyLink')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
