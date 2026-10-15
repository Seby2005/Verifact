import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, VerdictType, InputType } from '@/types/database';

/**
 * Admin-only log of every saved verification: what the reader asked and what
 * the pipeline answered, plus the signals that say the pipeline struggled.
 *
 * Only completed, non-cached verifications are stored (see /api/verify), so a
 * request that errored out never reaches this log.
 */

export type VerificationLogFilter = 'all' | VerdictType | 'weak';

export interface VerificationLogQuery {
  filter: VerificationLogFilter;
  search: string;
  /** Include verifications run by admin/moderator accounts (usually tests). */
  includeStaff: boolean;
  page: number;
}

export interface VerificationLogSource {
  title: string;
  publisher: string;
  url: string;
  supports: boolean | null;
}

export interface VerificationLogEntry {
  id: string;
  createdAt: string;
  inputType: InputType;
  inputText: string;
  verifiedClaim: string | null;
  posterCommentary: string | null;
  verdict: VerdictType | null;
  score: number | null;
  confidence: string | null;
  executiveSummary: string | null;
  keyTakeaways: string[];
  sources: VerificationLogSource[];
  language: string;
  processingTimeMs: number | null;
  /** Who asked: account email + tier, or null for an anonymous reader. */
  author: { email: string | null; tier: string; isStaff: boolean } | null;
  /** Human-readable reasons this verification looks weak; empty when fine. */
  weakSignals: string[];
}

export interface VerificationLogPage {
  entries: VerificationLogEntry[];
  total: number;
  page: number;
  pageCount: number;
  counts: Record<VerificationLogFilter, number>;
}

export const VERIFICATION_LOG_PAGE_SIZE = 30;

const FILTERS: VerificationLogFilter[] = ['all', 'true', 'partial', 'unclear', 'false', 'weak'];

/**
 * The "weak" filter, as a PostgREST or() expression. Must stay in step with
 * weakSignalsFor() below, which labels the same conditions on each row
 * (except the unclear verdict, which the row already shows as its verdict).
 */
const WEAK_FILTER =
  'verdict.eq.unclear,report_json->>confidenceLevel.eq.low,report_json->sources.eq.[],report_json->>aiAvailable.eq.false,disputed.is.true,flagged_count.gt.0';

interface RawLogRow {
  id: string;
  created_at: string;
  user_id: string | null;
  input_type: InputType;
  input_text: string;
  verdict: VerdictType | null;
  score: number | null;
  language: string;
  processing_time_ms: number | null;
  disputed: boolean;
  flagged_count: number;
  verified_claim: string | null;
  poster_commentary: string | null;
  executive_summary: string | null;
  confidence: string | null;
  ai_available: boolean | null;
  key_takeaways: unknown;
  sources: unknown;
}

const LOG_COLUMNS = [
  'id',
  'created_at',
  'user_id',
  'input_type',
  'input_text',
  'verdict',
  'score',
  'language',
  'processing_time_ms',
  'disputed',
  'flagged_count',
  'verified_claim:report_json->>verifiedClaim',
  'poster_commentary:report_json->>posterCommentary',
  'executive_summary:report_json->>executiveSummary',
  'confidence:report_json->>confidenceLevel',
  'ai_available:report_json->aiAvailable',
  'key_takeaways:report_json->keyTakeaways',
  'sources:report_json->sources',
].join(', ');

function weakSignalsFor(row: RawLogRow, sourceCount: number): string[] {
  const signals: string[] = [];
  if (row.confidence === 'low') signals.push('Încredere scăzută');
  if (sourceCount === 0) signals.push('Fără surse');
  if (row.ai_available === false) signals.push('AI indisponibil');
  if (row.disputed) signals.push('Contestat');
  if (row.flagged_count > 0) signals.push(`Raportat ×${row.flagged_count}`);
  return signals;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads the page's URL search params into a query, defaulting anything invalid. */
export function parseVerificationLogQuery(
  params: Record<string, string | string[] | undefined>
): VerificationLogQuery {
  const rawFilter = first(params.filtru);
  const page = Number.parseInt(first(params.pagina) ?? '1', 10);
  return {
    filter: FILTERS.includes(rawFilter as VerificationLogFilter) ? (rawFilter as VerificationLogFilter) : 'all',
    search: (first(params.q) ?? '').trim().slice(0, 200),
    includeStaff: first(params.echipa) === '1',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Builds the URL for the log page with some query fields changed. */
export function verificationLogHref(
  query: VerificationLogQuery,
  changes: Partial<VerificationLogQuery>
): string {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();
  if (next.filter !== 'all') params.set('filtru', next.filter);
  if (next.search) params.set('q', next.search);
  if (next.includeStaff) params.set('echipa', '1');
  if (next.page > 1) params.set('pagina', String(next.page));
  const qs = params.toString();
  return qs ? `/admin/verificari?${qs}` : '/admin/verificari';
}

function asSources(value: unknown): VerificationLogSource[] {
  if (!Array.isArray(value)) return [];
  return value.map((s: Record<string, unknown>) => ({
    title: typeof s.title === 'string' ? s.title : '',
    publisher: typeof s.publisher === 'string' ? s.publisher : '',
    url: typeof s.url === 'string' ? s.url : '',
    supports: typeof s.supports === 'boolean' ? s.supports : null,
  }));
}

/** Loads one page of the log, the per-filter counts, and who asked each question. */
export async function getVerificationLog(
  adminClient: SupabaseClient<Database>,
  query: VerificationLogQuery
): Promise<VerificationLogPage> {
  const { data: staffRows } = await adminClient
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'moderator']);
  const staffIds = ((staffRows ?? []) as { id: string }[]).map((r) => r.id);

  // Every count and the page itself share the search + staff scope, so the
  // numbers on the filter chips always add up to what the list can show.
  const scoped = (columns: string, head: boolean) => {
    let q = adminClient.from('verifications').select(columns, { count: 'exact', head });
    if (query.search) {
      const escaped = query.search.replace(/[\\%_]/g, (c) => `\\${c}`);
      q = q.ilike('input_text', `%${escaped}%`);
    }
    if (!query.includeStaff && staffIds.length > 0) {
      q = q.or(`user_id.is.null,user_id.not.in.(${staffIds.join(',')})`);
    }
    return q;
  };

  const withFilter = <T extends ReturnType<typeof scoped>>(q: T, filter: VerificationLogFilter): T => {
    if (filter === 'weak') return q.or(WEAK_FILTER) as T;
    if (filter !== 'all') return q.eq('verdict', filter) as T;
    return q;
  };

  const from = (query.page - 1) * VERIFICATION_LOG_PAGE_SIZE;
  const [pageRes, ...countRes] = await Promise.all([
    withFilter(scoped(LOG_COLUMNS, false), query.filter)
      .order('created_at', { ascending: false })
      .range(from, from + VERIFICATION_LOG_PAGE_SIZE - 1),
    ...FILTERS.map((f) => withFilter(scoped('id', true), f)),
  ]);

  if (pageRes.error) {
    throw new Error(`Nu am putut încărca verificările: ${pageRes.error.message}`);
  }

  const counts = Object.fromEntries(
    FILTERS.map((f, i) => [f, countRes[i].count ?? 0])
  ) as Record<VerificationLogFilter, number>;

  const rows = (pageRes.data ?? []) as unknown as RawLogRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id))];

  const [profilesRes, ...userRes] = await Promise.all([
    userIds.length > 0
      ? adminClient.from('profiles').select('id, tier').in('id', userIds)
      : Promise.resolve({ data: [] }),
    ...userIds.map((id) => adminClient.auth.admin.getUserById(id)),
  ]);

  const tierById = new Map(
    ((profilesRes.data ?? []) as { id: string; tier: string | null }[]).map((p) => [p.id, p.tier ?? 'free'])
  );
  const emailById = new Map(userIds.map((id, i) => [id, userRes[i].data?.user?.email ?? null]));

  const entries = rows.map((row): VerificationLogEntry => {
    const sources = asSources(row.sources);
    return {
      id: row.id,
      createdAt: row.created_at,
      inputType: row.input_type,
      inputText: row.input_text,
      verifiedClaim: row.verified_claim,
      posterCommentary: row.poster_commentary,
      verdict: row.verdict,
      score: row.score,
      confidence: row.confidence,
      executiveSummary: row.executive_summary,
      keyTakeaways: Array.isArray(row.key_takeaways)
        ? row.key_takeaways.filter((t): t is string => typeof t === 'string')
        : [],
      sources,
      language: row.language,
      processingTimeMs: row.processing_time_ms,
      author: row.user_id
        ? {
            email: emailById.get(row.user_id) ?? null,
            tier: tierById.get(row.user_id) ?? 'free',
            isStaff: staffIds.includes(row.user_id),
          }
        : null,
      weakSignals: weakSignalsFor(row, sources.length),
    };
  });

  const total = counts[query.filter];
  return {
    entries,
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / VERIFICATION_LOG_PAGE_SIZE)),
    counts,
  };
}
