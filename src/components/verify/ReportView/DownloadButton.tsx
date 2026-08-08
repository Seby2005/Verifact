'use client';

import React, { useState } from 'react';
import { Button, Modal, VerdictLabel } from '@/components/ui';
import { useLanguage } from '@/i18n';
import type { VerificationReport, Verdict } from '@/types/verification';
import { sourceHref } from './sourceLink';
import { fetchIsPremium } from './useUserTier';
import { buildReportHtml, printReportDocument, type ReportDocSource } from './reportDocument';
import styles from './DownloadButton.module.css';

export interface DownloadButtonProps {
  report: VerificationReport;
  /** Pro/Business get the full PDF; everyone else gets the paywall preview. */
  isPremium: boolean;
  /** False until the tier fetch settles; gates the click on an authoritative answer. */
  ready: boolean;
}

/**
 * The verdict palette, needed as literal hex only for the standalone PDF, which
 * renders outside the app and cannot read its CSS tokens. Values mirror the
 * light-theme verdict scale in DESIGN.md; the on-page/modal verdict colour still
 * comes from VerdictLabel, so this is the single exception, not a second source.
 */
const VERDICT_COLOR: Record<Verdict, string> = {
  true: '#1a6b54',
  partial: '#986516',
  unclear: '#4d5866',
  false: '#a63a39',
};

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ report, isPremium, ready }) => {
  const { locale, t } = useLanguage();
  const [previewOpen, setPreviewOpen] = useState(false);

  const claim = report.claim ?? report.inputText ?? '';
  const verdictWord = t(`verdict.copy.${report.verdict}`);

  const handleDownload = () => {
    const sources: ReportDocSource[] = report.sources.map((source) => ({
      title: source.title,
      href: sourceHref(source.url, source.excerpt, true),
      meta: [source.publisher, formatDate(source.date, locale)].filter(Boolean).join(' · '),
      excerpt: source.excerpt ? source.excerpt.slice(0, 300) : undefined,
    }));

    const html = buildReportHtml({
      lang: locale,
      brand: 'Verifact',
      docTitle: t('reportView.downloadDocTitle'),
      generatedOnLabel: t('reportView.downloadGeneratedOn'),
      dateStr: formatDate(new Date().toISOString(), locale),
      reportIdLabel: t('reportView.printId'),
      reportId: report.id,
      claimLabel: t('reportView.claimLabel'),
      claim,
      verdictWord,
      verdictColor: VERDICT_COLOR[report.verdict] ?? '#16181c',
      scoreLabel: t('reportView.downloadScoreLabel'),
      score: report.score,
      summaryLabel: t('reportView.summaryLabel'),
      summary: report.executiveSummary,
      sourcesLabel: t('reportView.sourcesLabel', { count: report.sources.length }),
      sources,
      disclaimerLabel: t('reportView.disclaimerLabel'),
      disclaimerText: t('reportView.disclaimerText'),
    });

    printReportDocument(html);
  };

  const handleClick = async () => {
    // If the tier fetch hasn't settled yet, resolve it authoritatively before
    // deciding — otherwise a Pro user who clicks on first render (isPremium
    // still on its free default) would wrongly get the paywall.
    const premium = ready ? isPremium : await fetchIsPremium();
    if (premium) {
      handleDownload();
    } else {
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
      <Button type="button" variant="ghost" size="sm" onClick={handleClick}>
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
