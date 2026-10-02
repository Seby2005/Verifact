'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import createGlobe from 'cobe';
import {
  NARRATIVES,
  CATEGORY_LABELS,
  VERDICT_LABELS,
  type Narrative,
  type Verdict,
} from '@/lib/observator/seed';
import styles from './ObservatorConsole.module.css';

const VERDICT_COLOR: Record<Verdict, string> = {
  false: '#e0563f',
  partial: '#e0a53a',
  unclear: '#97a2b3',
  true: '#57b98f',
};

type Filter = 'all' | Verdict;

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 96;
  const h = 24;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`)
    .join(' ');
  return (
    <svg className={styles.spark} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ObservatorConsole() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeWrapRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [data, setData] = useState<Narrative[]>(NARRATIVES);
  const [live, setLive] = useState(false);

  // Swap the seed for live, fact-check-enriched narratives once they arrive.
  useEffect(() => {
    let active = true;
    fetch('/api/observator/narratives')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { narratives?: Narrative[] } | null) => {
        if (active && d?.narratives?.length) {
          setData(d.narratives);
          setLive(d.narratives.some((n) => n.live));
        }
      })
      .catch(() => {
        /* keep the seed */
      });
    return () => {
      active = false;
    };
  }, []);

  const narratives = useMemo<Narrative[]>(
    () => (filter === 'all' ? data : data.filter((n) => n.verdict === filter)),
    [filter, data],
  );
  const selected = useMemo(
    () => narratives.find((n) => n.id === selectedId) ?? null,
    [narratives, selectedId],
  );

  // --- globe ---------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = globeWrapRef.current;
    if (!canvas || !wrap) return;

    // Canonical cobe sizing: a fixed 2x buffer over the CSS width, kept square.
    let W = 0;
    const measure = () => {
      const r = wrap.getBoundingClientRect();
      W = Math.max(1, r.width);
    };
    measure();

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let phi = 0; // auto-rotation accumulator
    let r = 0; // horizontal offset added by drag
    let theta = 0.2; // vertical tilt, adjustable by drag
    const pointer = { down: false, x: 0, y: 0, r0: 0, theta0: 0 };

    const markers = narratives.map((n) => ({
      location: [n.origin.lat, n.origin.lon] as [number, number],
      size: 0.03 + Math.min(n.variantCount, 25) / 320,
    }));

    let globe: { update: (state: Record<string, unknown>) => void; destroy: () => void };
    let animId: number | null = null;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: W * 2,
        height: W * 2,
        phi: 2.2,
        theta: 0.2,
        dark: 1,
        diffuse: 1.1,
        mapSamples: 20000,
        mapBrightness: 4.2,
        baseColor: [1, 1, 1],
        markerColor: [0.94, 0.36, 0.26],
        glowColor: [0.55, 0.68, 0.95],
        markers,
      });

      const loop = () => {
        if (!pointer.down && !reduce) phi += 0.0025;
        globe.update({
          width: W * 2,
          height: W * 2,
          phi: 2.2 + phi + r,
          theta,
        });
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    } catch {
      return; // WebGL unavailable — the dark panel remains
    }

    // Drag to spin the globe; auto-rotation pauses while dragging.
    const onDown = (e: PointerEvent) => {
      pointer.down = true;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.r0 = r;
      pointer.theta0 = theta;
      canvas.style.cursor = 'grabbing';
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pointer.down) return;
      r = pointer.r0 + (e.clientX - pointer.x) / 200;
      theta = Math.max(-0.6, Math.min(0.6, pointer.theta0 + (e.clientY - pointer.y) / 320));
    };
    const onUp = () => {
      pointer.down = false;
      canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);

    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onUp);
      window.removeEventListener('resize', onResize);
      globe.destroy();
    };
  }, [narratives]);

  // Deselect if the current selection is filtered out.
  useEffect(() => {
    if (selectedId && !narratives.some((n) => n.id === selectedId)) setSelectedId(null);
  }, [narratives, selectedId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { false: 0, partial: 0, unclear: 0, true: 0 };
    for (const n of data) c[n.verdict] += 1;
    return c;
  }, [data]);

  const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'Toate' },
    { key: 'false', label: 'Fals' },
    { key: 'partial', label: 'Parțial' },
  ];

  return (
    <div className={styles.console}>
      <div className={styles.bar}>
        <span className={styles.brand}>OBSERVATOR</span>
        <span className={styles.sub}>motor ARGUS · narative active</span>
        <span className={styles.live}>
          <span className={styles.liveDot} />
          {narratives.length} narative
        </span>
      </div>

      <div className={styles.body}>
        {/* Globe */}
        <div className={styles.globeCol}>
          <div className={styles.globeWrap} ref={globeWrapRef}>
            <canvas ref={canvasRef} className={styles.globe} aria-label="Glob cu narativele de dezinformare" />
          </div>
          <div className={styles.stats}>
            <div className={styles.statsBar} role="img" aria-label="Distribuția verdictelor">
              {(['false', 'partial', 'unclear', 'true'] as Verdict[]).map((v) =>
                counts[v] ? (
                  <span
                    key={v}
                    style={{ flex: counts[v], background: VERDICT_COLOR[v] }}
                    title={`${VERDICT_LABELS[v]}: ${counts[v]}`}
                  />
                ) : null,
              )}
            </div>
            <span className={styles.statsCap}>
              {data.length} narative urmărite · {live ? 'date live · Google Fact Check' : 'seed demo'}
            </span>
          </div>
        </div>

        {/* HUD */}
        <aside className={styles.hud}>
          <div className={styles.filters}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`${styles.chip} ${filter === f.key ? styles.chipOn : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {selected ? (
            <div className={styles.story}>
              <button type="button" className={styles.back} onClick={() => setSelectedId(null)}>
                ← toate narativele
              </button>
              <span className={styles.storyVerdict} style={{ color: VERDICT_COLOR[selected.verdict] }}>
                <span className={styles.dot} style={{ background: VERDICT_COLOR[selected.verdict] }} />
                {VERDICT_LABELS[selected.verdict]} · {CATEGORY_LABELS[selected.category]}
              </span>
              <h3 className={styles.storyTitle}>{selected.title}</h3>
              <p className={styles.storySummary}>{selected.summary}</p>
              <dl className={styles.meta}>
                <div>
                  <dt>Origine</dt>
                  <dd>{selected.origin.label}</dd>
                </div>
                <div>
                  <dt>Variante</dt>
                  <dd>{selected.variantCount}</dd>
                </div>
                <div>
                  <dt>Prima apariție</dt>
                  <dd>{new Date(selected.firstSeen).toLocaleDateString('ro-RO')}</dd>
                </div>
                <div>
                  <dt>Propagare</dt>
                  <dd className={styles.trend} style={{ color: VERDICT_COLOR[selected.verdict] }}>
                    <Sparkline data={selected.timeline} />
                    <span>{selected.velocity === 'rising' ? '↑ în creștere' : selected.velocity === 'dormant' ? '↓ în scădere' : '→ stabilă'}</span>
                  </dd>
                </div>
              </dl>
              <div className={styles.srcs}>
                <span className={styles.srcsLab}>Surse</span>
                {selected.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className={styles.src}>
                    {s.name}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <ul className={styles.list}>
              {narratives.map((n) => (
                <li key={n.id}>
                  <button type="button" className={styles.row} onClick={() => setSelectedId(n.id)}>
                    <span className={styles.dot} style={{ background: VERDICT_COLOR[n.verdict] }} />
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{n.title}</span>
                      <span className={styles.rowMeta}>
                        {CATEGORY_LABELS[n.category]} · {n.variantCount} variante
                        {n.velocity === 'rising' ? ' · ↑' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
