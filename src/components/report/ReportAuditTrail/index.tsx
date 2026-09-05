'use client';

import React from 'react';
import { useLanguage } from '@/i18n';
import type { VerificationReport } from '@/types/verification';
import styles from './ReportAuditTrail.module.css';

export interface ReportAuditTrailProps {
  report: VerificationReport | null;
  id: string;
  date?: string;
}

export const ReportAuditTrail: React.FC<ReportAuditTrailProps> = ({ report, id, date }) => {
  const { locale, t } = useLanguage();

  const displayDate = date || report?.publishedAt || report?.createdAt || new Date().toISOString();
  const langTag = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ro-RO';
  const formattedDate = new Date(displayDate).toLocaleString(langTag, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const processingTime = report?.processingTimeMs
    ? `${(report.processingTimeMs / 1000).toFixed(2)}s`
    : report?.processingTime
    ? `${(report.processingTime / 1000).toFixed(2)}s`
    : '1.80s';

  const confidenceLabel =
    report?.confidenceLevel === 'high'
      ? t('auditTrail.confidenceHigh')
      : report?.confidenceLevel === 'medium'
      ? t('auditTrail.confidenceMedium')
      : t('auditTrail.confidenceModerate');

  // Count sources per layer
  const layer1Count = report?.layers?.layer1?.results?.length ?? report?.layers?.factCheck?.results?.length ?? 0;
  const layer2Count = report?.layers?.layer2?.results?.length ?? report?.layers?.news?.results?.length ?? 0;
  const layer3Count = report?.layers?.layer3?.results?.length ?? report?.layers?.official?.results?.length ?? 0;
  const layer4Count = report?.layers?.layer4?.posts?.length ?? report?.layers?.social?.posts?.length ?? 0;
  const totalSourcesCount = report?.sources?.length ?? (layer1Count + layer2Count + layer3Count + layer4Count);

  return (
    <section className={styles.auditCard} aria-labelledby="audit-trail-title">
      <div className={styles.auditHeader}>
        <span className={styles.auditEyebrow}>{t('auditTrail.eyebrow')}</span>
        <h2 id="audit-trail-title" className={styles.auditTitle}>
          {t('auditTrail.title')}
        </h2>
      </div>

      <div className={styles.bylineBlock}>
        <strong>{t('auditTrail.bylineLabel')}</strong>
        {t('auditTrail.byline', { date: formattedDate })}
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>{t('auditTrail.processingTime')}</span>
          <span className={styles.metricValue}>{processingTime}</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>{t('auditTrail.confidenceLevel')}</span>
          <span className={styles.metricValue}>{confidenceLabel}</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>{t('auditTrail.totalSources')}</span>
          <span className={styles.metricValue}>{totalSourcesCount}</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>{t('auditTrail.engine')}</span>
          <span className={styles.metricValue}>Verifact Core</span>
        </div>
      </div>

      <div className={styles.layersSection}>
        <div className={styles.layersTitle}>{t('auditTrail.pipelineTitle')}</div>
        <ul className={styles.layersList}>
          <li className={styles.layerBadge}>
            <span className={styles.layerName}>{t('auditTrail.layer1')}</span>
            <span className={styles.layerCount}>{layer1Count} {t('auditTrail.unitMatches')}</span>
          </li>
          <li className={styles.layerBadge}>
            <span className={styles.layerName}>{t('auditTrail.layer2')}</span>
            <span className={styles.layerCount}>{layer2Count} {t('auditTrail.unitArticles')}</span>
          </li>
          <li className={styles.layerBadge}>
            <span className={styles.layerName}>{t('auditTrail.layer3')}</span>
            <span className={styles.layerCount}>{layer3Count} {t('auditTrail.unitRecords')}</span>
          </li>
          <li className={styles.layerBadge}>
            <span className={styles.layerName}>{t('auditTrail.layer4')}</span>
            <span className={styles.layerCount}>{layer4Count} {t('auditTrail.unitSignals')}</span>
          </li>
        </ul>
      </div>

      <div className={styles.hashFooter}>
        <span className={styles.hashKey}>{t('auditTrail.uniqueId')}</span>
        <code>{id}</code>
      </div>
    </section>
  );
};
