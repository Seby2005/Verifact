'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { useLanguage } from '@/i18n';

/**
 * Hands the report to the browser's print engine, which is where the "Save as
 * PDF" destination lives on every desktop browser.
 *
 * Deliberately not a PDF generator library: the browser already embeds the
 * page's fonts, so Romanian diacritics and clickable links survive into the
 * file, and the app ships no extra dependency to get there. The print
 * stylesheet in globals.css decides what actually reaches paper — this
 * component only triggers it, which is why it takes no report prop.
 */
export const DownloadButton: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => window.print()}>
      {t('reportView.downloadBtn')}
    </Button>
  );
};
