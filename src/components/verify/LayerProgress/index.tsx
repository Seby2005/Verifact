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

const LAYERS = [
  { key: 'layer1', labelKey: 'transparentaPage.layers.0.title', weight: '35%' },
  { key: 'layer2', labelKey: 'transparentaPage.layers.1.title', weight: '30%' },
  { key: 'layer3', labelKey: 'transparentaPage.layers.2.title', weight: '25%' },
  { key: 'layer4', labelKey: 'transparentaPage.layers.3.title', weight: '10%' },
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
        const layerMap = report?.layers as Record<string, LayerSummary> | undefined;
        const result = layerMap?.[layer.key];
        const status = result?.status;
        const count = result?.results?.length ?? 0;

        const resolved = phase === 'resolved';
        const ok = resolved && isSuccess(status) && count > 0;
        const empty = resolved && isSuccess(status) && count === 0;
        const failed = resolved && !isSuccess(status);

        const state = !resolved
          ? t('verifyTool.layers.searching')
          : ok
            ? t(count === 1 ? 'verifyTool.layers.foundOne' : 'verifyTool.layers.found', {
                count: String(count),
              })
            : empty
              ? t('verifyTool.layers.empty')
              : t('verifyTool.layers.unavailable');

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
