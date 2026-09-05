'use client';

import React, { useState } from 'react';
import { Button, Modal, VerdictLabel, useToast } from '@/components/ui';
import { useLanguage } from '@/i18n';
import type { VerificationReport } from '@/types/verification';
import { getReportFilename } from '@/lib/pdf/ReportDocument';
import { sourceHref } from './sourceLink';
import { fetchIsPremium } from './useUserTier';
import styles from './DownloadButton.module.css';

export interface DownloadButtonProps {
  report: VerificationReport;
  /** Pro/Business get the full PDF; everyone else gets the paywall preview. */
  isPremium: boolean;
  /** False until the tier fetch settles; gates the click on an authoritative answer. */
  ready: boolean;
}

/**
 * Downloads the report as a real PDF file: posts the report to /api/report/pdf,
 * which synthesizes it and renders a server-side PDF, then saves the returned
 * blob. Free/anonymous readers get the upgrade preview instead — the same gate
 * the API enforces server-side.
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({ report, isPremium, ready }) => {
  const { t } = useLanguage();
  const { notify } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (res.status === 401) {
          notify(t('reportView.errorLoginPdf'), 'error');
          return;
        }
        if (res.status === 500) {
          notify(data?.error || t('reportView.errorPdfFailed'), 'error');
          return;
        }
        setPreviewOpen(true);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getReportFilename(report);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify(t('reportView.errorPdfConnect'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleClick = async () => {
    const premium = ready ? isPremium : await fetchIsPremium();
    if (premium) {
      await handleDownload();
    } else {
      try {
        const usageRes = await fetch('/api/user/usage');
        if (usageRes.status === 401) {
          notify(t('reportView.errorLoginDownload'), 'error');
          return;
        }
      } catch {
        /* ignore */
      }
      setPreviewOpen(true);
    }
  };

  const previewSummary =
    report.executiveSummary.length > 220
      ? `${report.executiveSummary.slice(0, 220).replace(/\s+\S*$/, '')}…`
      : report.executiveSummary;
  const previewSources = report.sources.slice(0, 3);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={downloading}
        isLoading={downloading}
      >
        {t('reportView.downloadBtn')}
      </Button>

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('reportView.premiumModalTitle')}
      >
        <p className={styles.lead}>{t('reportView.premiumModalLead')}</p>

        <div className={styles.previewCard}>
          <VerdictLabel kind={report.verdict} score={report.score} />
          <p className={styles.previewSummary}>{previewSummary}</p>
        </div>

        {previewSources.length > 0 ? (
          <div className={styles.previewSources}>
            <p className={styles.previewSourcesLabel}>{t('reportView.premiumSourcesLabel')}</p>
            <ol className={styles.sourceList}>
              {previewSources.map((source) => (
                <li key={source.url} className={styles.sourceItem}>
                  <a
                    href={sourceHref(source.url, source.excerpt, true)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.sourceLink}
                  >
                    {source.title}
                  </a>
                  <span className={styles.sourceMeta}>{source.publisher}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className={styles.actions}>
          <Button variant="ghost" size="md" onClick={() => setPreviewOpen(false)}>
            {t('reportView.premiumCloseCta')}
          </Button>
          <Button variant="primary" size="md" href="/preturi">
            {t('reportView.premiumUpgradeCta')}
          </Button>
        </div>
      </Modal>
    </>
  );
};
