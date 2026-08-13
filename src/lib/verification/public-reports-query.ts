import { createClient as createServerClient } from '@/lib/supabase/server';
import type { Verdict, VerificationReport } from '@/types/verification';

/**
 * =============================================================================
 * SINGLE SOURCE OF TRUTH FOR READING PUBLIC REPORTS
 * =============================================================================
 * IMPORTANT ARCHITECTURAL RULE:
 * This module is the SINGLE AUTHORIZED SOURCE OF TRUTH for reading public
 * verification data. All public components, feed pages (/rapoarte), detail
 * pages (/rapoarte/[id]), and sitemap generators MUST consume these functions
 * rather than creating ad-hoc Supabase queries.
 *
 * GUARANTEED SECURITY & PRIVACY CONTRACT:
 * 1. Queries strictly filter for `visibility_status = 'public'`.
 * 2. NEVER exposes internal fields: `user_id`, `email`, `tier`,
 *    `verifications_count`, `reviewed_by`, or monthly counters.
 * 3. Includes `authorName` ONLY if `show_author === true` on the verification;
 *    otherwise `authorName` is set to null.
 * =============================================================================
 */

/**
 * Public-safe summary of a verification report for feed listing.
 * Strictly excludes internal metadata.
 */
export interface PublicReportSummary {
  id: string;
  inputText: string;
  verdict: Verdict | null;
  score: number | null;
  publishedAt: string;
  createdAt: string;
  showAuthor: boolean;
  authorName: string | null;
}

/**
 * Public-safe detail of a verification report for public report page.
 * Strictly excludes internal metadata.
 */
export interface PublicReportDetail {
  id: string;
  inputText: string;
  verdict: Verdict | null;
  score: number | null;
  publishedAt: string;
  createdAt: string;
  language: string;
  showAuthor: boolean;
  authorName: string | null;
  reportJson: VerificationReport | null;
}

export interface ListPublicReportsOptions {
  page?: number;
  limit?: number;
}

export interface ListPublicReportsResult {
  reports: PublicReportSummary[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Retrieves a single public verification report by ID.
 * Returns null if the report does not exist, is private, pending_review, taken_down, or rejected.
 */
export async function getPublicReportById(id: string): Promise<PublicReportDetail | null> {
  if (!id) return null;

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('verifications')
      .select('id, input_text, verdict, score, visibility_status, show_author, language, created_at, published_at, report_json, profiles(username)')
      .eq('id', id)
      .eq('visibility_status', 'public')
      .single();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;
    if (row.visibility_status !== 'public') return null;

    const profile = row.profiles as { username: string | null } | null;
    const showAuthor = Boolean(row.show_author);
    const authorName = showAuthor && profile?.username ? profile.username : null;

    const detail: PublicReportDetail = {
      id: String(row.id),
      inputText: String(row.input_text || ''),
      verdict: (row.verdict as Verdict) || null,
      score: typeof row.score === 'number' ? row.score : null,
      publishedAt: String(row.published_at || row.created_at),
      createdAt: String(row.created_at),
      language: String(row.language || 'ro'),
      showAuthor,
      authorName,
      reportJson: (row.report_json as VerificationReport | null) || null,
    };

    return detail;
  } catch {
    return null;
  }
}

/**
 * Retrieves a paginated list of public verification reports.
 * Queries ONLY reports with visibility_status = 'public'.
 */
export async function listPublicReports({
  page = 1,
  limit = 12,
}: ListPublicReportsOptions = {}): Promise<ListPublicReportsResult> {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

  try {
    const supabase = await createServerClient();
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, count, error } = await supabase
      .from('verifications')
      .select('id, input_text, verdict, score, created_at, published_at, show_author, profiles(username)', { count: 'exact' })
      .eq('visibility_status', 'public')
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error || !data) {
      return { reports: [], totalCount: 0, page: safePage, limit: safeLimit, totalPages: 0 };
    }

    const reports: PublicReportSummary[] = data.map((item: Record<string, unknown>) => {
      const profile = item.profiles as { username: string | null } | null;
      const showAuthor = Boolean(item.show_author);
      const authorName = showAuthor && profile?.username ? profile.username : null;

      return {
        id: String(item.id),
        inputText: String(item.input_text || ''),
        verdict: (item.verdict as Verdict) || null,
        score: typeof item.score === 'number' ? item.score : null,
        publishedAt: String(item.published_at || item.created_at),
        createdAt: String(item.created_at),
        showAuthor,
        authorName,
      };
    });

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / safeLimit);

    return {
      reports,
      totalCount,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  } catch {
    return { reports: [], totalCount: 0, page: safePage, limit: safeLimit, totalPages: 0 };
  }
}
