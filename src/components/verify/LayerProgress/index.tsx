'use client';

import React from 'react';
import type { LayerStatus, VerificationReport } from '@/types/verification';
import { useLanguage } from '@/i18n';
import styles from './LayerProgress.module.css';

export type LayerPhase = 'streaming' | 'resolved';

/** Live per-step state, keyed by the event `step` the server streams. */
export type LiveStep = { status: LayerStatus; count?: number };
export type LiveSteps = Partial<
  Record<'layer1' | 'layer2' | 'layer3' | 'layer4' | 'analysis', LiveStep>
>;

export interface LayerProgressProps {
  /**
   * `streaming` while the request is open: each row advances on its own as the
   * server reports that layer settling (via `live`). `resolved` once the report
   * is back, when each row shows what that layer actually returned.
   */
  phase: LayerPhase;
  /** Present in the resolved phase. */
  report?: VerificationReport;
  /** Present in the streaming phase — the latest status streamed per step. */
  live?: LiveSteps;
}

// Row 04 shows layer4 (the social-media search); the AI assessment is its own
// row, mapped to the streamed `analysis` step and, once resolved, to the score
// on the report rather than to report.layers.
const LAYERS = [
  { key: 'layer1', liveKey: 'layer1', labelKey: 'transparentaPage.layers.0.title' },
  { key: 'layer2', liveKey: 'layer2', labelKey: 'transparentaPage.layers.1.title' },
  { key: 'layer3', liveKey: 'layer3', labelKey: 'transparentaPage.layers.2.title' },
  { key: 'layer4', liveKey: 'layer4', labelKey: 'transparentaPage.layers.3.title' },
  { key: 'ai', liveKey: 'analysis', labelKey: 'transparentaPage.layers.4.title' },
] as const;

type RowState = 'pending' | 'ok' | 'empty' | 'failed';

/** The four layer result types carry differently-typed `results` arrays. */
type LayerSummary = { status?: LayerStatus; results?: readonly unknown[] };

const isDone = (status: LayerStatus | undefined): boolean =>
  status === 'success' || status === 'done';

export const LayerProgress: React.FC<LayerProgressProps> = ({ phase, report, live }) => {
  const { t } = useLanguage();

  const foundLabel = (count: number): string =>
    count > 0
      ? t(count === 1 ? 'verifyTool.layers.foundOne' : 'verifyTool.layers.found', {
          count: String(count),
        })
      : t('verifyTool.layers.empty');

  const describe = (
    row: (typeof LAYERS)[number]
  ): { state: RowState; label: string } => {
    if (phase === 'resolved') {
      if (row.key === 'ai') {
        const aiScore = report?.scoreBreakdown?.aiScore;
        if (report?.aiAvailable !== false && typeof aiScore === 'number') {
          return { state: 'ok', label: t('verifyTool.layers.aiScored', { score: String(aiScore) }) };
        }
        return { state: 'failed', label: t('verifyTool.layers.unavailable') };
      }
      const layerMap = report?.layers as Record<string, LayerSummary> | undefined;
      const result = layerMap?.[row.key];
      const status = result?.status;
      const count = result?.results?.length ?? 0;
      if (status === 'skipped') return { state: 'empty', label: t('verifyTool.layers.notApplicable') };
      if (isDone(status)) {
        return { state: count > 0 ? 'ok' : 'empty', label: foundLabel(count) };
      }
      return { state: 'failed', label: t('verifyTool.layers.unavailable') };
    }

    // Streaming: advance from whatever the server has reported for this step.
    const s = live?.[row.liveKey];
    if (!s) return { state: 'pending', label: t('verifyTool.layers.searching') };
    if (row.key === 'ai') {
      return isDone(s.status)
        ? { state: 'ok', label: t('verifyTool.layers.done') }
        : { state: 'failed', label: t('verifyTool.layers.unavailable') };
    }
    if (s.status === 'skipped') return { state: 'empty', label: t('verifyTool.layers.notApplicable') };
    if (isDone(s.status)) {
      const count = s.count ?? 0;
      return { state: count > 0 ? 'ok' : 'empty', label: foundLabel(count) };
    }
    if (s.status === 'unavailable' || s.status === 'error') {
      return { state: 'failed', label: t('verifyTool.layers.unavailable') };
    }
    return { state: 'pending', label: t('verifyTool.layers.searching') };
  };

  const rows = LAYERS.map((layer, index) => ({ layer, index, ...describe(layer) }));
  const done = rows.filter((r) => r.state !== 'pending').length;
  const overallPct = Math.round((done / LAYERS.length) * 100);

  return (
    <div className={styles.wrap}>
      {phase === 'streaming' ? (
        <div className={styles.overall}>
          <div className={styles.overallHead}>
            <span className={styles.overallLabel}>{t('verifyTool.actions.pending')}</span>
            <span className={styles.overallCount}>
              {done}/{LAYERS.length}
            </span>
          </div>
          <div className={styles.overallTrack}>
            <div className={styles.overallFill} style={{ transform: `scaleX(${overallPct / 100})` }} />
          </div>
        </div>
      ) : null}

      <ol className={styles.layers} aria-label={t('verifyTool.layers.ariaLabel')}>
        {rows.map(({ layer, index, state, label }) => {
          const pending = state === 'pending';
          return (
            <li
              key={layer.key}
              className={[
                styles.layer,
                pending ? styles.isSearching : '',
                state === 'ok' ? styles.isOk : '',
                state === 'empty' ? styles.isEmpty : '',
                state === 'failed' ? styles.isFailed : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={phase === 'resolved' ? { transitionDelay: `${index * 90}ms` } : undefined}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.body}>
                <span className={styles.head}>
                  <span className={styles.name}>{t(layer.labelKey)}</span>
                </span>
                {/* One bar per component: indeterminate while pending, then a
                    filled bar coloured by the outcome. */}
                <span className={`${styles.bar} ${pending ? styles.barPending : styles.barDone}`} aria-hidden="true">
                  <span className={styles.barFill} />
                </span>
              </span>
              <span className={styles.state}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
