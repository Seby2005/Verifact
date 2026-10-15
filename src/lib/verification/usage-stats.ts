import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, InputType, VerdictType } from '@/types/database';

/**
 * Admin-only statistics on who uses the product, computed from the database:
 * verifications and accounts over a period, set against the period before it.
 *
 * What it can and cannot see:
 *  - Only saved verifications exist here. One answered from the cache is not
 *    saved, and a visit that never ran a verification leaves no row at all, so
 *    these are counts of people who used the tool, not of visitors.
 *  - Verifications by admin and moderator accounts are left out everywhere.
 *  - A "person" is an account, or an anonymous reader's hash. The same reader
 *    on two networks counts twice; that is the price of not tracking them.
 *
 * Days are calendar days in Romania, so a verification at 00:30 local time
 * belongs to the day its reader was living in, not to the UTC day before.
 */

export const USAGE_PERIODS = [7, 30, 90] as const;
export type UsagePeriod = (typeof USAGE_PERIODS)[number];

export interface UsageTotals {
  verifications: number;
  /** Distinct people who ran at least one verification. */
  people: number;
  /** Of those, the ones who verified on two or more different days. */
  returning: number;
  /** Accounts created. */
  signups: number;
}

export interface UsageDay {
  /** YYYY-MM-DD, Romanian calendar day. */
  date: string;
  verifications: number;
  people: number;
  signups: number;
}

export interface UsageShare<K extends string = string> {
  key: K;
  count: number;
}

export interface UsagePerson {
  /** The account, or null for a reader without one. */
  userId: string | null;
  /** Account email, or "Anonim · a1b2c3" for a reader without an account. */
  label: string;
  /** Subscription tier, or null for an anonymous reader. */
  tier: string | null;
  verifications: number;
  activeDays: number;
  lastSeen: string;
}

export interface UsageStats {
  days: UsagePeriod;
  current: UsageTotals;
  /** The same totals for the equally long period just before. */
  previous: UsageTotals;
  /** One entry per day of the current period, oldest first, empty days included. */
  daily: UsageDay[];
  /** Current-period verifications run while signed in. */
  fromAccounts: number;
  byInputType: UsageShare<InputType>[];
  byVerdict: UsageShare<VerdictType>[];
  byLanguage: UsageShare[];
  /** The most active people of the current period, busiest first. */
  topPeople: UsagePerson[];
  /** Every account that exists today, staff excluded. */
  accounts: { total: number; byTier: UsageShare[] };
}

/** A verification, reduced to what the statistics read. */
export interface UsageVerification {
  id: string;
  created_at: string;
  user_id: string | null;
  anonymous_hash: string | null;
  input_type: InputType;
  verdict: VerdictType | null;
  language: string;
}

/** An account, reduced to what the statistics read. */
export interface UsageAccount {
  id: string;
  created_at: string;
  tier: string | null;
  role: string | null;
}

const DAY_MS = 86_400_000;
const TOP_PEOPLE = 10;
const PAGE_SIZE = 1000;

const romanianDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Bucharest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dayOf(instant: string | Date): string {
  return romanianDay.format(typeof instant === 'string' ? new Date(instant) : instant);
}

/** The `count` calendar days ending on `lastDay`, oldest first. */
function daysEndingOn(lastDay: string, count: number): string[] {
  const end = Date.parse(`${lastDay}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => new Date(end - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

function personKey(row: UsageVerification): string {
  // A reader saved before hashes existed has neither id: count each as its own person.
  return row.user_id ?? `anon:${row.anonymous_hash ?? row.id}`;
}

function shares<K extends string>(keys: K[]): UsageShare<K>[] {
  const counts = new Map<K, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

function totals(rows: UsageVerification[], signups: number): UsageTotals {
  const daysByPerson = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = personKey(row);
    if (!daysByPerson.has(key)) daysByPerson.set(key, new Set());
    daysByPerson.get(key)!.add(dayOf(row.created_at));
  }
  return {
    verifications: rows.length,
    people: daysByPerson.size,
    returning: [...daysByPerson.values()].filter((days) => days.size >= 2).length,
    signups,
  };
}

/** Reads the page's `zile` search param, falling back to 30 days. */
export function parseUsagePeriod(params: Record<string, string | string[] | undefined>): UsagePeriod {
  const raw = Array.isArray(params.zile) ? params.zile[0] : params.zile;
  const days = Number.parseInt(raw ?? '', 10);
  return (USAGE_PERIODS as readonly number[]).includes(days) ? (days as UsagePeriod) : 30;
}

/**
 * The statistics for the `days` ending today, from already loaded rows. Rows
 * outside the two periods and rows by staff are ignored, so callers may pass
 * more than is needed. People are labelled by `emailOf`, which may not know
 * an account.
 */
export function summarizeUsage(
  verifications: UsageVerification[],
  accounts: UsageAccount[],
  days: UsagePeriod,
  now: Date,
  emailOf: (userId: string) => string | null = () => null
): UsageStats {
  const staff = new Set(accounts.filter((a) => a.role === 'admin' || a.role === 'moderator').map((a) => a.id));
  const readers = accounts.filter((a) => !staff.has(a.id));
  const tierOf = new Map(readers.map((a) => [a.id, a.tier ?? 'free']));

  const both = daysEndingOn(dayOf(now), days * 2);
  const previousDays = new Set(both.slice(0, days));
  const currentDays = both.slice(days);
  const inCurrent = new Set(currentDays);

  const fromReaders = verifications.filter((v) => !v.user_id || !staff.has(v.user_id));
  const current = fromReaders.filter((v) => inCurrent.has(dayOf(v.created_at)));
  const previous = fromReaders.filter((v) => previousDays.has(dayOf(v.created_at)));
  const signupDays = readers.map((a) => dayOf(a.created_at));

  const daily = currentDays.map((date): UsageDay => {
    const rows = current.filter((v) => dayOf(v.created_at) === date);
    return {
      date,
      verifications: rows.length,
      people: new Set(rows.map(personKey)).size,
      signups: signupDays.filter((d) => d === date).length,
    };
  });

  const byPerson = new Map<string, UsageVerification[]>();
  for (const row of current) {
    const key = personKey(row);
    byPerson.set(key, [...(byPerson.get(key) ?? []), row]);
  }
  const topPeople = [...byPerson.values()]
    .map((rows): UsagePerson => {
      const { user_id: userId, anonymous_hash: hash } = rows[0];
      return {
        userId,
        label: userId ? (emailOf(userId) ?? 'cont fără email') : `Anonim · ${(hash ?? '').slice(0, 6) || 'necunoscut'}`,
        tier: userId ? (tierOf.get(userId) ?? 'free') : null,
        verifications: rows.length,
        activeDays: new Set(rows.map((r) => dayOf(r.created_at))).size,
        lastSeen: rows.map((r) => r.created_at).sort().at(-1)!,
      };
    })
    .sort((a, b) => b.verifications - a.verifications || b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, TOP_PEOPLE);

  return {
    days,
    current: totals(current, signupDays.filter((d) => inCurrent.has(d)).length),
    previous: totals(previous, signupDays.filter((d) => previousDays.has(d)).length),
    daily,
    fromAccounts: current.filter((v) => v.user_id).length,
    byInputType: shares(current.map((v) => v.input_type)),
    byVerdict: shares(current.flatMap((v) => (v.verdict ? [v.verdict] : []))),
    byLanguage: shares(current.map((v) => v.language)),
    topPeople,
    accounts: { total: readers.length, byTier: shares(readers.map((a) => a.tier ?? 'free')) },
  };
}

/** Every row of a query, read page by page past the API's 1,000-row cap. */
async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Nu am putut încărca statisticile: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

/** Loads and computes the statistics for the `days` ending today. */
export async function getUsageStats(
  adminClient: SupabaseClient<Database>,
  days: UsagePeriod,
  now: Date = new Date()
): Promise<UsageStats> {
  // One day of slack: the Romanian day the window starts on began before UTC midnight.
  const since = new Date(now.getTime() - (days * 2 + 1) * DAY_MS).toISOString();

  const [verifications, accounts] = await Promise.all([
    readAll<UsageVerification>((from, to) =>
      adminClient
        .from('verifications')
        .select('id, created_at, user_id, anonymous_hash, input_type, verdict, language')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .range(from, to)
    ),
    readAll<UsageAccount>((from, to) =>
      adminClient.from('profiles').select('id, created_at, tier, role').order('created_at', { ascending: true }).range(from, to)
    ),
  ]);

  // Emails live in the auth schema; only the people about to be listed are looked up.
  const draft = summarizeUsage(verifications, accounts, days, now);
  const listedIds = draft.topPeople.flatMap((p) => (p.userId ? [p.userId] : []));
  const users = await Promise.all(listedIds.map((id) => adminClient.auth.admin.getUserById(id)));
  const emails = new Map(listedIds.map((id, i) => [id, users[i].data?.user?.email ?? null]));

  return summarizeUsage(verifications, accounts, days, now, (id) => emails.get(id) ?? null);
}
