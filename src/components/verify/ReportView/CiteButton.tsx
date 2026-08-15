'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui';
import type { VerificationReport } from '@/types/verification';
import { useLanguage } from '@/i18n';
import styles from './CiteButton.module.css';

export interface CiteButtonProps {
  report: VerificationReport;
}

/**
 * Copies the report as a citable block: the claim, the verdict and score, how
 * many evidence layers backed it, and every source with its URL.
 *
 * A fact-check that cannot be quoted does not travel, so this is the component
 * that lets a verdict leave the site intact. It deliberately carries **no
 * permalink**: there is no public per-report route yet, and a citation with a
 * dead link is worse than one without. The report id is included instead, which
 * is traceable without promising a page that does not exist.
 */
export const CiteButton: React.FC<CiteButtonProps> = ({ report }) => {
  const { locale, t } = useLanguage();
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const buildCitation = (): string => {
    const langTag = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ro-RO';
    const dateFormat = new Intl.DateTimeFormat(langTag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const accessed = dateFormat.format(new Date());
    const claim = report.claim ?? report.inputText ?? '';
    const verdict = t(`verdict.copy.${report.verdict}`);
    const layers = report.scoreBreakdown?.availableLayers;

    const sources = report.sources
      .map((source, index) => {
        const year = source.date ? new Date(source.date).getFullYear() : null;
        const year_ = Number.isFinite(year as number) ? ` (${year})` : '';
        return `  ${index + 1}. ${source.title} — ${source.publisher}${year_}\n     ${source.url}`;
      })
      .join('\n');

    return [
      t('cite.heading'),
      `${t('cite.claimLabel')}: „${claim}”`,
      `${t('cite.verdictLabel')}: ${verdict} (${t('cite.scoreLabel')} ${report.score}/100)`,
      layers !== undefined ? `${t('cite.layersLabel')}: ${layers}/4` : null,
      '',
      `${t('cite.sourcesLabel')}:`,
      sources,
      '',
      `${t('cite.reportLabel')} ${report.id} · ${t('cite.accessed')} ${accessed}`,
    ]
      .filter((line) => line !== null)
      .join('\n');
  };

  /** Falls back to a hidden textarea where the async clipboard is unavailable. */
  const copy = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to the legacy path below.
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  };

  const handleClick = async () => {
    const ok = await copy(buildCitation());
    if (!ok) {
      notify(t('cite.failed'), 'error');
      return;
    }
    setCopied(true);
    notify(t('cite.copied'), 'success');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1900);
  };

  return (
    <button
      type="button"
      className={[styles.cite, copied ? styles.isCopied : ''].filter(Boolean).join(' ')}
      onClick={handleClick}
    >
      {/* Both labels are always rendered so the button never changes width as
          it swaps state. */}
      <span className={styles.label}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {t('cite.button')}
      </span>
      <span className={styles.done} aria-hidden="true">
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {t('cite.copiedShort')}
      </span>
    </button>
  );
};
