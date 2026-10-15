'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CATEGORY_LABELS,
  REGION_LABELS,
  claimText,
  type BankItem,
  type Category,
  type Region,
  type Verdict,
} from '@/lib/academy/bank';
import styles from './Trainer.module.css';

const REGIONS = Object.keys(REGION_LABELS) as Region[];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const V_LABEL: Record<Verdict, string> = { true: 'Adevărat', partial: 'Parțial', false: 'Fals' };
const V_COLOR: Record<Verdict, string> = {
  true: 'var(--verdict-true)',
  partial: 'var(--verdict-partial)',
  false: 'var(--verdict-false)',
};
const ANSWERS: Array<{ v: Verdict; key: string }> = [
  { v: 'true', key: '1' },
  { v: 'partial', key: '2' },
  { v: 'false', key: '3' },
];

const ROUND = 12;
const LS_PREFS = 'verifact_academy_prefs';

type Phase = 'intro' | 'loading' | 'playing' | 'result';

/** How the final accuracy is said back to the player, in the product's voice. */
function verdictOnYou(pct: number): string {
  if (pct >= 90) return 'Ești greu de păcălit.';
  if (pct >= 70) return 'Ai instinct bun. Încă se poate strecura ceva.';
  if (pct >= 50) return 'Prinzi jumătate. Restul trece pe lângă tine.';
  return 'Aici te-ar prinde dezinformarea.';
}

export function Trainer() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [regions, setRegions] = useState<Set<Region>>(new Set());
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [items, setItems] = useState<BankItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<Verdict | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [copied, setCopied] = useState('');

  const seenRef = useRef<string[]>([]);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const item = items[idx];
  const correct = results.filter(Boolean).length;
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0;
  const bestRun = results.reduce(
    (acc, hit) => {
      const run = hit ? acc.run + 1 : 0;
      return { run, best: Math.max(acc.best, run) };
    },
    { run: 0, best: 0 },
  ).best;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PREFS);
      if (raw) {
        const p = JSON.parse(raw) as { regions?: Region[]; cats?: Category[] };
        if (p.regions?.length) setRegions(new Set(p.regions));
        if (p.cats?.length) setCats(new Set(p.cats));
      }
    } catch {
      /* first run */
    }
    fetch('/api/academy/round?count=4')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.counts && setCounts(d.counts))
      .catch(() => {});
  }, []);

  const start = useCallback(async () => {
    setPhase('loading');
    try {
      localStorage.setItem(LS_PREFS, JSON.stringify({ regions: [...regions], cats: [...cats] }));
    } catch {
      /* ignore */
    }
    const qs = new URLSearchParams({ count: String(ROUND) });
    if (regions.size) qs.set('regions', [...regions].join(','));
    if (cats.size) qs.set('categories', [...cats].join(','));
    if (seenRef.current.length) qs.set('exclude', seenRef.current.slice(-120).join(','));
    try {
      const res = await fetch(`/api/academy/round?${qs}`);
      const data = (await res.json()) as { items?: BankItem[] };
      const next = data.items ?? [];
      if (!next.length) {
        setPhase('intro');
        return;
      }
      seenRef.current.push(...next.map((i) => i.url));
      setItems(next);
      setIdx(0);
      setAnswered(null);
      setResults([]);
      setPhase('playing');
    } catch {
      setPhase('intro');
    }
  }, [regions, cats]);

  const answer = useCallback(
    (guess: Verdict) => {
      if (answered || !item) return;
      setAnswered(guess);
      setResults((r) => [...r, guess === item.verdict]);
    },
    [answered, item],
  );

  const next = useCallback(() => {
    setAnswered(null);
    if (idx + 1 >= items.length) setPhase('result');
    else setIdx((i) => i + 1);
  }, [idx, items.length]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (!answered) {
        const found = ANSWERS.find((a) => a.key === e.key);
        if (found) {
          e.preventDefault();
          answer(found.v);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, answered, answer, next]);

  // Swipe mirrors the on-screen order: right = true, up = partial, left = false.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchRef.current;
    touchRef.current = null;
    if (!s || answered) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 60 && Math.abs(dy) < 60) return;
    if (Math.abs(dx) > Math.abs(dy)) answer(dx > 0 ? 'true' : 'false');
    else if (dy < 0) answer('partial');
  };

  const share = async () => {
    const text = `Am recunoscut ${correct} din ${results.length} afirmații verificate pe Verifact Academy. Tu câte prinzi?`;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/academy` : '';
    try {
      if (navigator.share) await navigator.share({ title: 'Verifact Academy', text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied('Link copiat');
        window.setTimeout(() => setCopied(''), 2200);
      }
    } catch {
      /* dismissed */
    }
  };

  const toggle = <T,>(set: Set<T>, val: T, apply: (s: Set<T>) => void) => {
    const n = new Set(set);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    apply(n);
  };

  return (
    <div className={styles.stage}>
      <div className={styles.inner}>
        {/* ---------- INTRO ---------- */}
        {phase === 'intro' && (
          <div className={styles.intro}>
            <div>
              <p className={styles.kicker}>Verifact Academy</p>
              <h1 className={styles.title}>Dezinformarea funcționează pentru că e credibilă.</h1>
              <p className={styles.lede}>
                {counts.total ?? 500} de afirmații care au circulat în realitate, fiecare verificată deja de
                o redacție de fact-checking. Tu dai verdictul înainte să-l vezi pe al lor.
              </p>
            </div>

            <div>
              <p className={styles.pickHead}>Unde a circulat</p>
              <div className={styles.regions}>
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`${styles.region} ${regions.has(r) ? styles.regionOn : ''}`}
                    onClick={() => toggle(regions, r, setRegions)}
                    aria-pressed={regions.has(r)}
                  >
                    <span className={styles.mark} aria-hidden="true" />
                    <span className={styles.regionName}>{REGION_LABELS[r]}</span>
                    <span className={styles.regionCount}>{counts[r] ?? '—'} afirmații</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={styles.pickHead}>Subiect</p>
              <div className={styles.cats}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.cat} ${cats.has(c) ? styles.catOn : ''}`}
                    onClick={() => toggle(cats, c, setCats)}
                    aria-pressed={cats.has(c)}
                  >
                    <span className={styles.mark} aria-hidden="true" />
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.startRow}>
              <button type="button" className={styles.start} onClick={start}>
                Începe
              </button>
              <p className={styles.note}>{ROUND} afirmații · tastele 1 2 3</p>
            </div>
          </div>
        )}

        {/* ---------- LOADING ---------- */}
        {phase === 'loading' && (
          <div className={styles.loading}>
            <span className={styles.dot} />
            <span>Se pregătește runda</span>
          </div>
        )}

        {/* ---------- PLAYING ---------- */}
        {phase === 'playing' && item && (
          <>
            <div className={styles.hud}>
              <span className={styles.count}>
                {String(idx + 1).padStart(2, '0')} / {items.length}
              </span>
              <span className={styles.track}>
                <span
                  className={styles.trackFill}
                  style={{ width: `${(results.length / items.length) * 100}%` }}
                />
              </span>
              <span className={`${styles.score} ${accuracy >= 70 && results.length > 2 ? styles.scoreHot : ''}`}>
                {correct} corecte
              </span>
              <button type="button" className={styles.exit} onClick={() => setPhase('intro')}>
                ieși
              </button>
            </div>

            <div className={styles.round} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div className={styles.tags}>
                <span>{CATEGORY_LABELS[item.category]}</span>
                <span className={styles.tagDot} aria-hidden="true" />
                <span>{REGION_LABELS[item.region]}</span>
              </div>

              <p className={styles.claim} key={item.url}>
                {claimText(item)}
              </p>

              {!answered ? (
                <div className={styles.answers}>
                  {ANSWERS.map((a) => (
                    <button
                      key={a.v}
                      type="button"
                      className={styles.answer}
                      style={{ ['--vc' as string]: V_COLOR[a.v] }}
                      onClick={() => answer(a.v)}
                    >
                      {V_LABEL[a.v]}
                      <span className={styles.answerKey}>{a.key}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.reveal}>
                  <div className={styles.judgement}>
                    <span
                      className={`${styles.callWord} ${
                        answered === item.verdict ? styles.callHit : styles.callMiss
                      }`}
                    >
                      {answered === item.verdict ? 'Ai avut dreptate.' : 'Ai greșit.'}
                    </span>
                    <div className={styles.verdicts}>
                      <span className={styles.vpair}>
                        <span className={styles.vpairLabel}>Verdictul real</span>
                        <span className={styles.vpairValue} style={{ color: V_COLOR[item.verdict] }}>
                          {V_LABEL[item.verdict]}
                        </span>
                      </span>
                      {answered !== item.verdict && (
                        <span className={styles.vpair}>
                          <span className={styles.vpairLabel}>Răspunsul tău</span>
                          <span className={styles.vpairValue} style={{ color: V_COLOR[answered] }}>
                            {V_LABEL[answered]}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.sourceRow}>
                    {item.rating && <span className={styles.ratingText}>Eticheta sursei: {item.rating}</span>}
                    <a className={styles.source} href={item.url} target="_blank" rel="noopener noreferrer">
                      Verificat de {item.publisher} ↗
                    </a>
                  </div>

                  <button type="button" className={styles.next} onClick={next}>
                    {idx + 1 >= items.length ? 'Vezi rezultatul' : 'Continuă'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------- RESULT ---------- */}
        {phase === 'result' && (
          <div className={styles.result}>
            <p className={styles.kicker}>Runda s-a încheiat</p>
            <p className={styles.resultScore}>
              {accuracy}
              <span>%</span>
            </p>
            <p className={styles.resultLine}>{verdictOnYou(accuracy)}</p>

            <div className={styles.breakdown}>
              <span className={styles.breakItem}>
                <span className={styles.breakNum}>
                  {correct}/{results.length}
                </span>
                <span className={styles.breakLabel}>corecte</span>
              </span>
              <span className={styles.breakItem}>
                <span className={styles.breakNum}>{bestRun}</span>
                <span className={styles.breakLabel}>la rând</span>
              </span>
            </div>

            <div className={styles.resultActions}>
              <button type="button" className={styles.start} onClick={start}>
                Încă o rundă
              </button>
              <button type="button" className={styles.ghost} onClick={share}>
                Trimite mai departe
              </button>
              <button type="button" className={styles.ghost} onClick={() => setPhase('intro')}>
                Schimbă filtrele
              </button>
              {copied && <span className={styles.copied}>{copied}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
