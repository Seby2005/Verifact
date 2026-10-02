import bankJson from './bank.json';

/**
 * The Academy question bank: real claims that fact-checkers have already
 * ruled on, harvested at build time (see scripts/academy/*).
 *
 * Build-time rather than live because a teaching game needs a curated,
 * balanced, reliably-verdicted pool — live search is thin in Romanian, skewed
 * to whatever is trending, and can't be quality-checked before a player sees it.
 */

export type Verdict = 'false' | 'partial' | 'true';
export type Region = 'ro' | 'eu' | 'world';
export type Category = 'health' | 'science' | 'climate' | 'money' | 'security' | 'politics';

export interface BankItem {
  claim: string;
  /** Romanian translation, when the original was in another language. */
  claimRo?: string;
  verdict: Verdict;
  rating: string;
  publisher: string;
  url: string;
  date: string;
  lang: string;
  region: Region;
  category: Category;
}

interface Bank {
  generatedAt: string;
  counts: Record<string, number>;
  items: BankItem[];
}

const BANK = bankJson as unknown as Bank;

export const REGION_LABELS: Record<Region, string> = {
  ro: 'România',
  eu: 'Europa',
  world: 'Restul lumii',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  health: 'Sănătate',
  science: 'Știință',
  climate: 'Climă & natură',
  money: 'Bani & escrocherii',
  security: 'Război & securitate',
  politics: 'Politică & societate',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  health: '🧬',
  science: '🔭',
  climate: '🌍',
  money: '💸',
  security: '🛰️',
  politics: '🗳️',
};

/**
 * The claim as a Romanian player should read it. Publishers quote claims
 * inconsistently, so surrounding quote marks are stripped — the card adds its
 * own, and leaving theirs in renders doubled («„…"»).
 */
export function claimText(item: BankItem): string {
  return (item.claimRo || item.claim)
    .trim()
    .replace(/^["'“”„«»‘’]+/, '')
    .replace(/["'“”„«»‘’]+$/, '')
    .trim();
}

export function bankCounts(): { ro: number; eu: number; world: number; total: number } {
  const c = { ro: 0, eu: 0, world: 0, total: BANK.items.length };
  for (const it of BANK.items) c[it.region] += 1;
  return c;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draws a round of questions for the chosen regions and categories.
 *
 * Deals verdicts round-robin so a player can never win by always answering
 * "false" — the harvested pool is ~2/3 false, which would make that a winning
 * strategy and teach exactly the wrong reflex.
 */
export function drawRound(opts: {
  regions?: Region[];
  categories?: Category[];
  count?: number;
  exclude?: string[];
}): BankItem[] {
  const { regions = [], categories = [], count = 12, exclude = [] } = opts;
  const skip = new Set(exclude);

  let pool = BANK.items.filter((it) => !skip.has(it.url));
  if (regions.length) pool = pool.filter((it) => regions.includes(it.region));
  if (categories.length) pool = pool.filter((it) => categories.includes(it.category));
  if (pool.length < count) pool = BANK.items.filter((it) => !skip.has(it.url));

  const byVerdict: Record<Verdict, BankItem[]> = {
    false: shuffle(pool.filter((i) => i.verdict === 'false')),
    partial: shuffle(pool.filter((i) => i.verdict === 'partial')),
    true: shuffle(pool.filter((i) => i.verdict === 'true')),
  };

  const order: Verdict[] = ['false', 'partial', 'true'];
  const out: BankItem[] = [];
  let i = 0;
  while (out.length < count && order.some((v) => byVerdict[v].length)) {
    const v = order[i % order.length];
    const next = byVerdict[v].shift();
    if (next) out.push(next);
    i += 1;
  }
  return shuffle(out);
}
