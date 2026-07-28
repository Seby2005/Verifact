'use client';

import React from 'react';
import type { LayerStatus, VerificationReport } from '@/types/verification';
import { useLanguage } from '@/i18n';
import styles from './LayerProgress.module.css';

export type LayerPhase = 'searching' | 'resolved';

export interface LayerProgressProps {
  /**
   * `searching` while the request is open — every layer runs concurrently on
   * the server, so all four are shown searching and none is claimed complete.
   * `resolved` once the report is back, when each row shows what that layer
   * actually returned.
   */
  phase: LayerPhase;
  /** Present only in the resolved phase. */
  report?: VerificationReport;
}

// Row 04 used to be labelled with the methodology's AI entry while showing
// layer4's status — but layer4 is the social-media search, not the AI. The AI
// assessment had no row at all, so a claim naming no public figure rendered as
// "AI Contextual Analysis — unavailable" while the model was in fact running
// and scoring the claim. The two are separate rows now.
const LAYERS = [
  { key: 'layer1', labelKey: 'transparentaPage.layers.0.title', weight: '35%' },
  { key: 'layer2', labelKey: 'transparentaPage.layers.1.title', weight: '30%' },
  { key: 'layer3', labelKey: 'transparentaPage.layers.2.title', weight: '25%' },
  { key: 'layer4', labelKey: 'transparentaPage.layers.3.title', weight: '10%' },
  { key: 'ai', labelKey: 'transparentaPage.layers.4.title', weight: '10%' },
] as const;

/** Layers that produced evidence are the only ones marked as such. */
function isSuccess(status: LayerStatus | undefined): boolean {
  return status === 'success' || status === 'done';
}

/**
 * The four layer result types carry differently-typed `results` arrays, so
 * indexing the report's `layers` by key widens to `never`. This view only ever
 * needs the status and how many items came back.
 */
type LayerSummary = { status?: LayerStatus; results?: readonly unknown[] };

/**
 * The four evidence layers, shown while a verification runs and after it
 * returns. Nothing here simulates progress: during the request every layer is
 * simply "searching", and once the report arrives each row reports that
 * layer's real status and result count. A layer that failed or found nothing
 * says so — that is the point of showing the work at all.
 */
export const LayerProgress: React.FC<LayerProgressProps> = ({ phase, report }) => {
  const { t } = useLanguage();

  return (
    <ol className={styles.layers} aria-label={t('verifyTool.layers.ariaLabel')}>
      {LAYERS.map((layer, index) => {
        const resolved = phase === 'resolved';

        let ok = false;
        let empty = false;
        let failed = false;
        let state: string;

        if (!resolved) {
          state = t('verifyTool.layers.searching');
        } else if (layer.key === 'ai') {
          // The AI assessment is not one of report.layers: it runs across all
          // of them and reports a score, not a list of documents.
          const aiScore = report?.scoreBreakdown?.aiScore;
          if (report?.aiAvailable !== false && typeof aiScore === 'number') {
            ok = true;
            state = t('verifyTool.layers.aiScored', { score: String(aiScore) });
          } else {
            failed = true;
            state = t('verifyTool.layers.unavailable');
          }
        } else {
          const layerMap = report?.layers as Record<string, LayerSummary> | undefined;
          const result = layerMap?.[layer.key];
          const status = result?.status;
          const count = result?.results?.length ?? 0;

          if (status === 'skipped') {
            // A layer the algorithm deliberately did not apply — layer4 when
            // the claim names no public figure. Reporting that as
            // "unavailable" made a correct decision look like a malfunction.
            empty = true;
            state = t('verifyTool.layers.notApplicable');
          } else if (isSuccess(status)) {
            ok = count > 0;
            empty = count === 0;
            state = ok
              ? t(count === 1 ? 'verifyTool.layers.foundOne' : 'verifyTool.layers.found', {
                  count: String(count),
                })
              : t('verifyTool.layers.empty');
          } else {
            failed = true;
            state = t('verifyTool.layers.unavailable');
          }
        }

        return (
          <li
            key={layer.key}
            className={[
              styles.layer,
              !resolved ? styles.isSearching : '',
              ok ? styles.isOk : '',
              empty ? styles.isEmpty : '',
              failed ? styles.isFailed : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={resolved ? { transitionDelay: `${index * 90}ms` } : undefined}
          >
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.body}>
              <span className={styles.name}>{t(layer.labelKey)}</span>
              <span className={styles.weight}>
                {t('transparentaPage.layersWeight', { weight: layer.weight })}
              </span>
            </span>
            <span className={styles.state}>{state}</span>
          </li>
        );
      })}
    </ol>
  );
};
