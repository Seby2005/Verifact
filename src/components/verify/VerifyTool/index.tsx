'use client';

import React, { useRef, useState } from 'react';
import { Button, Tabs, Textarea, Input, Callout, type TabItem } from '@/components/ui';
import type { InputType, VerificationReport, VerifyAPIError } from '@/types/verification';
import { useLanguage } from '@/i18n';
import { ReportView } from '../ReportView';
import styles from './VerifyTool.module.css';

type VerificationInputKind = InputType;

type VerifyResponse =
  | { success: true; report: VerificationReport }
  | ({ success?: false } & VerifyAPIError);

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'report'; report: VerificationReport }
  | { state: 'unavailable'; message: string }
  | { state: 'error'; message: string };

export const VerifyTool: React.FC = () => {
  const { locale, t } = useLanguage();
  const [kind, setKind] = useState<VerificationInputKind>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: ReadonlyArray<TabItem<VerificationInputKind>> = [
    { id: 'text', label: t('verifyTool.tabs.text') },
    { id: 'screenshot', label: t('verifyTool.tabs.screenshot') },
    { id: 'url', label: t('verifyTool.tabs.url') },
  ];

  const currentValue = kind === 'text' ? text : kind === 'url' ? url : (file?.name ?? '');
  const isEmpty = currentValue.trim().length === 0;

  const handleTabChange = (next: VerificationInputKind) => {
    setKind(next);
    setStatus({ state: 'idle' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.state === 'loading') return;

    if (isEmpty) {
      setStatus({
        state: 'error',
        message:
          kind === 'screenshot'
            ? t('verifyTool.errors.emptyImage')
            : t('verifyTool.errors.emptyText'),
      });
      return;
    }

    setStatus({ state: 'loading' });

    try {
      let claimText = text.trim();

      if (kind === 'screenshot' && file) {
        const ocrText = await runOcr(file);
        if (!ocrText || ocrText.trim().length < 10) {
          setStatus({
            state: 'error',
            message: t('verifyTool.errors.ocrFailed'),
          });
          return;
        }
        claimText = ocrText.trim();
      }

      if (kind === 'url') claimText = url.trim();

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: claimText,
          url: kind === 'url' ? url.trim() : undefined,
          inputType: kind,
          language: locale,
          isPublic: false,
        }),
      });

      const data = (await res.json()) as VerifyResponse;

      if (res.ok && data.success && 'report' in data) {
        setStatus({ state: 'report', report: data.report });
      } else {
        const err = data as VerifyAPIError;
        setStatus({
          state: err.code === 'ALL_LAYERS_FAILED' ? 'unavailable' : 'error',
          message: err.error || t('verifyTool.errors.generic'),
        });
      }
    } catch {
      setStatus({
        state: 'error',
        message: t('verifyTool.errors.network'),
      });
    }
  };

  async function runOcr(image: File): Promise<string> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(image);
    });

    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mimeType: image.type }),
    });
    const data = (await res.json()) as { success?: boolean; text?: string };
    return data.text ?? '';
  }

  return (
    <section className={styles.tool} aria-labelledby="verify-heading">
      <h2 id="verify-heading" className="label-caps">
        {t('verifyTool.heading')}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.panel}>
          <Tabs
            items={tabs}
            value={kind}
            onChange={handleTabChange}
            ariaLabel={t('verifyTool.ariaTabContent')}
          />
        </div>

        <div
          className={styles.panel}
          role="tabpanel"
          id={`tabpanel-${kind}`}
          aria-labelledby={`tab-${kind}`}
        >
          {kind === 'text' ? (
            <div className={styles.field}>
              <Textarea
                label={t('verifyTool.textarea.label')}
                placeholder={t('verifyTool.textarea.placeholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                helperText={t('verifyTool.textarea.helper')}
                fullWidth
              />
            </div>
          ) : null}

          {kind === 'screenshot' ? (
            <div className={styles.field}>
              <label
                className={styles.dropzone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) setFile(dropped);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={styles.fileInput}
                  aria-label={t('verifyTool.dropzone.title')}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <span className={styles.dropzoneTitle}>{t('verifyTool.dropzone.title')}</span>
                <span className={styles.dropzoneHint}>{t('verifyTool.dropzone.hint')}</span>
              </label>
              {file ? (
                <p className={styles.fileName}>
                  {t('verifyTool.dropzone.fileSelected', { name: file.name })}
                </p>
              ) : null}
            </div>
          ) : null}

          {kind === 'url' ? (
            <div className={styles.field}>
              <Input
                label={t('verifyTool.urlInput.label')}
                type="url"
                inputMode="url"
                placeholder={t('verifyTool.urlInput.placeholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                helperText={t('verifyTool.urlInput.helper')}
                fullWidth
              />
            </div>
          ) : null}

          <div className={styles.actions}>
            <Button type="submit" variant="primary" size="lg" isLoading={status.state === 'loading'}>
              {t('verifyTool.actions.submit')}
            </Button>
            <span className={styles.actionHint}>{t('verifyTool.actions.privacyHint')}</span>
          </div>
        </div>
      </form>

      <div aria-live="polite">
        {status.state === 'loading' ? (
          <p className={styles.pending}>{t('verifyTool.actions.pending')}</p>
        ) : null}

        {status.state === 'unavailable' ? (
          <div className={styles.status}>
            <Callout label={t('verifyTool.errors.unavailableLabel')} tone="plain">
              {status.message}
            </Callout>
          </div>
        ) : null}

        {status.state === 'error' ? (
          <div className={styles.status}>
            <Callout label={t('verifyTool.errors.errorLabel')} tone="plain">
              {status.message}
            </Callout>
          </div>
        ) : null}

        {status.state === 'report' ? (
          <div className={styles.status}>
            <ReportView report={status.report} />
          </div>
        ) : null}
      </div>
    </section>
  );
};
