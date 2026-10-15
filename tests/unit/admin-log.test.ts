import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  VERIFICATION_LOG_PAGE_SIZE,
  getVerificationLog,
  parseVerificationLogQuery,
  verificationLogHref,
  type VerificationLogQuery,
} from '@/lib/verification/admin-log';

interface Call {
  method: string;
  args: unknown[];
}

interface Query {
  table: string;
  calls: Call[];
}

interface Result {
  data?: unknown;
  count?: number | null;
  error?: { message: string } | null;
}

const CHAIN_METHODS = ['select', 'in', 'ilike', 'or', 'eq', 'order', 'range'];

/**
 * A stand-in for the service-role client: every query records the calls made
 * on it and resolves, when awaited, to whatever `resolve` returns for them.
 */
function makeClient(
  resolve: (query: Query) => Result,
  emails: Record<string, string> = {}
) {
  const queries: Query[] = [];
  const from = (table: string) => {
    const query: Query = { table, calls: [] };
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        query.calls.push({ method, args });
        return builder;
      };
    }
    builder.then = (onFulfilled: (r: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(resolve(query)).then(onFulfilled, onRejected);
    return builder;
  };
  const getUserById = jest.fn(async (id: string) => ({
    data: { user: { email: emails[id] ?? null } },
  }));
  const client = { from, auth: { admin: { getUserById } } } as unknown as SupabaseClient<Database>;
  return { client, queries, getUserById };
}

const argsOf = (query: Query, method: string): unknown[][] =>
  query.calls.filter((c) => c.method === method).map((c) => c.args);

const isCount = (query: Query): boolean =>
  (query.calls[0].args[1] as { head?: boolean } | undefined)?.head === true;

const isWeak = (query: Query): boolean =>
  argsOf(query, 'or').some(([expr]) => String(expr).includes('verdict.eq.unclear'));

const COUNTS = { all: 45, true: 10, partial: 5, unclear: 3, false: 7, weak: 9 };

const ROWS = [
  {
    id: 'v1',
    created_at: '2026-10-01T10:00:00Z',
    user_id: 'user-pro',
    input_type: 'text',
    input_text: 'Guvernul a interzis numerarul',
    verdict: 'unclear',
    score: 40,
    language: 'ro',
    processing_time_ms: 8200,
    disputed: true,
    flagged_count: 2,
    verified_claim: 'Guvernul a interzis numerarul',
    poster_commentary: null,
    executive_summary: 'Nu am găsit surse.',
    confidence: 'low',
    ai_available: false,
    key_takeaways: null,
    sources: [],
  },
  {
    id: 'v2',
    created_at: '2026-10-01T09:00:00Z',
    user_id: null,
    input_type: 'url',
    input_text: 'https://example.com/stire',
    verdict: 'true',
    score: 90,
    language: 'ro',
    processing_time_ms: null,
    disputed: false,
    flagged_count: 0,
    verified_claim: null,
    poster_commentary: null,
    executive_summary: null,
    confidence: 'high',
    ai_available: true,
    key_takeaways: ['Confirmat de două surse', 42, null],
    sources: [
      { title: 'Comunicat', publisher: 'gov.ro', url: 'https://gov.ro/a', supports: true },
      { title: 7, supports: 'da' },
    ],
  },
  {
    id: 'v3',
    created_at: '2026-10-01T08:00:00Z',
    user_id: 'staff-1',
    input_type: 'text',
    input_text: 'test intern',
    verdict: 'false',
    score: 10,
    language: 'ro',
    processing_time_ms: 5000,
    disputed: false,
    flagged_count: 0,
    verified_claim: null,
    poster_commentary: null,
    executive_summary: null,
    confidence: 'medium',
    ai_available: true,
    key_takeaways: [],
    sources: [{ title: 'Articol', publisher: 'ziar.ro', url: 'https://ziar.ro/a', supports: false }],
  },
];

/** The log as the database would answer it: one staff account, three saved rows. */
function resolveLog(query: Query): Result {
  if (query.table === 'profiles') {
    const [columns] = query.calls[0].args;
    return columns === 'id'
      ? { data: [{ id: 'staff-1' }] }
      : { data: [{ id: 'user-pro', tier: 'pro' }] };
  }
  if (!isCount(query)) return { data: ROWS, error: null };
  if (isWeak(query)) return { count: COUNTS.weak };
  const verdict = argsOf(query, 'eq').find(([column]) => column === 'verdict');
  return { count: verdict ? COUNTS[verdict[1] as keyof typeof COUNTS] : COUNTS.all };
}

const pageQuery = (queries: Query[]): Query =>
  queries.find((q) => q.table === 'verifications' && !isCount(q)) as Query;

const BASE: VerificationLogQuery = { filter: 'all', search: '', includeStaff: false, page: 1 };

describe('parseVerificationLogQuery', () => {
  it('defaults to the first page of everything, staff hidden', () => {
    expect(parseVerificationLogQuery({})).toEqual(BASE);
  });

  it('reads filter, search, staff toggle and page from the URL', () => {
    expect(
      parseVerificationLogQuery({ filtru: 'weak', q: '  vaccin  ', echipa: '1', pagina: '3' })
    ).toEqual({ filter: 'weak', search: 'vaccin', includeStaff: true, page: 3 });
  });

  it('falls back to defaults for an unknown filter or a bad page number', () => {
    expect(parseVerificationLogQuery({ filtru: 'orice', pagina: '0' })).toEqual(BASE);
    expect(parseVerificationLogQuery({ pagina: 'abc' }).page).toBe(1);
  });

  it('takes the first value of a repeated param and caps the search length', () => {
    const query = parseVerificationLogQuery({ filtru: ['false', 'true'], q: 'x'.repeat(300) });
    expect(query.filter).toBe('false');
    expect(query.search).toHaveLength(200);
  });
});

describe('verificationLogHref', () => {
  it('links to the bare page when nothing differs from the defaults', () => {
    expect(verificationLogHref(BASE, {})).toBe('/admin/verificari');
  });

  it('keeps the current query and applies the changes on top', () => {
    const current: VerificationLogQuery = { filter: 'weak', search: 'vaccin', includeStaff: true, page: 2 };
    const href = verificationLogHref(current, { page: 3 });
    expect(parseVerificationLogQuery(Object.fromEntries(new URL(href, 'http://x').searchParams))).toEqual({
      ...current,
      page: 3,
    });
  });
});

describe('getVerificationLog', () => {
  it('returns each verification with who asked and why it looks weak', async () => {
    const { client } = makeClient(resolveLog, { 'user-pro': 'ana@example.com' });

    const log = await getVerificationLog(client, BASE);

    const [weak, anonymous, staff] = log.entries;
    expect(weak.author).toEqual({ email: 'ana@example.com', tier: 'pro', isStaff: false });
    expect(weak.weakSignals).toEqual([
      'Încredere scăzută',
      'Fără surse',
      'AI indisponibil',
      'Contestat',
      'Raportat ×2',
    ]);
    expect(weak.keyTakeaways).toEqual([]);

    expect(anonymous.author).toBeNull();
    expect(anonymous.weakSignals).toEqual([]);
    expect(anonymous.keyTakeaways).toEqual(['Confirmat de două surse']);
    expect(anonymous.sources).toEqual([
      { title: 'Comunicat', publisher: 'gov.ro', url: 'https://gov.ro/a', supports: true },
      { title: '', publisher: '', url: '', supports: null },
    ]);

    // No profile row and no auth email: still listed, as a free account.
    expect(staff.author).toEqual({ email: null, tier: 'free', isStaff: true });
  });

  it('reports the count behind every filter chip and pages the selected one', async () => {
    const { client } = makeClient(resolveLog);

    const log = await getVerificationLog(client, { ...BASE, filter: 'weak' });

    expect(log.counts).toEqual(COUNTS);
    expect(log.total).toBe(COUNTS.weak);
    expect(log.pageCount).toBe(1);
    expect((await getVerificationLog(client, BASE)).pageCount).toBe(2);
  });

  it('hides staff verifications unless asked to include them', async () => {
    const hidden = makeClient(resolveLog);
    await getVerificationLog(hidden.client, BASE);
    expect(argsOf(pageQuery(hidden.queries), 'or')).toEqual([
      ['user_id.is.null,user_id.not.in.(staff-1)'],
    ]);

    const shown = makeClient(resolveLog);
    await getVerificationLog(shown.client, { ...BASE, includeStaff: true });
    expect(argsOf(pageQuery(shown.queries), 'or')).toEqual([]);
  });

  it('searches the input text literally, escaping LIKE wildcards', async () => {
    const { client, queries } = makeClient(resolveLog);

    await getVerificationLog(client, { ...BASE, search: '50%_a\\b' });

    expect(argsOf(pageQuery(queries), 'ilike')).toEqual([['input_text', '%50\\%\\_a\\\\b%']]);
  });

  it('narrows the page to the selected verdict and to the requested page', async () => {
    const { client, queries } = makeClient(resolveLog);

    await getVerificationLog(client, { ...BASE, filter: 'false', page: 2 });

    const page = pageQuery(queries);
    expect(argsOf(page, 'eq')).toEqual([['verdict', 'false']]);
    expect(argsOf(page, 'range')).toEqual([
      [VERIFICATION_LOG_PAGE_SIZE, 2 * VERIFICATION_LOG_PAGE_SIZE - 1],
    ]);
  });

  it('skips the account lookups when every verification is anonymous', async () => {
    const { client, queries, getUserById } = makeClient((query) =>
      query.table === 'verifications' && !isCount(query)
        ? { data: [ROWS[1]], error: null }
        : resolveLog(query)
    );

    const log = await getVerificationLog(client, BASE);

    expect(log.entries).toHaveLength(1);
    expect(getUserById).not.toHaveBeenCalled();
    expect(queries.filter((q) => q.table === 'profiles')).toHaveLength(1);
  });

  it('throws when the page cannot be loaded', async () => {
    const { client } = makeClient((query) =>
      query.table === 'verifications' && !isCount(query)
        ? { data: null, error: { message: 'boom' } }
        : resolveLog(query)
    );

    await expect(getVerificationLog(client, BASE)).rejects.toThrow(
      'Nu am putut încărca verificările: boom'
    );
  });
});
