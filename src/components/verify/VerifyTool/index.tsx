'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Tabs, Textarea, Input, Callout, type TabItem } from '@/components/ui';
import type {
  InputType,
  VerificationReport,
  VerifyAPIError,
  VerifyStreamEvent,
} from '@/types/verification';
import { useLanguage } from '@/i18n';
import { ReportView } from '../ReportView';
import { LayerProgress, type LiveSteps } from '../LayerProgress';
import { useTypedPlaceholder } from './useTypedPlaceholder';
import styles from './VerifyTool.module.css';

type VerificationInputKind = InputType;

/**
 * Carries the server's own failure message instead of collapsing every OCR
 * error into an empty string — a rate limit and a blank image are not the
 * same thing to the visitor.
 */
type OcrOutcome = { ok: true; text: string } | { ok: false; message: string };

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'report'; report: VerificationReport }
  | { state: 'unavailable'; message: string }
  | { state: 'error'; message: string };

export interface VerifyToolProps {
  /**
   * Sample claims offered as one-tap chips under the text field. They exist to
   * give a first-time visitor something to run without composing a claim, so
   * they must stay politically neutral — settled science and folklore only.
   */
  examples?: ReadonlyArray<string>;
}

export const VerifyTool: React.FC<VerifyToolProps> = ({ examples }) => {
  const { locale, t } = useLanguage();
  const searchParams = useSearchParams();
  const [kind, setKind] = useState<VerificationInputKind>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  // Per-layer progress streamed from the server while a verification runs.
  const [liveSteps, setLiveSteps] = useState<LiveSteps>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill input if claim query parameter is passed (e.g. from /admin/oportunitati)
  useEffect(() => {
    const claimParam = searchParams?.get('claim') || searchParams?.get('q') || searchParams?.get('text');
    if (claimParam && claimParam.trim().length > 0) {
      setText(claimParam.trim());
      setKind('text');
      setStatus({ state: 'idle' });
    }
  }, [searchParams]);

  const tabs: ReadonlyArray<TabItem<VerificationInputKind>> = [
    { id: 'text', label: t('verifyTool.tabs.text') },
    { id: 'screenshot', label: t('verifyTool.tabs.screenshot') },
    { id: 'url', label: t('verifyTool.tabs.url') },
  ];

  const currentValue = kind === 'text' ? text : kind === 'url' ? url : (file?.name ?? '');
  const isEmpty = currentValue.trim().length === 0;

  // The placeholder demonstrates the tool until the visitor takes over.
  const demo = useTypedPlaceholder(
    examples ?? [],
    Boolean(examples?.length) && kind === 'text' && text.length === 0,
  );

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
    setLiveSteps({});

    try {
      let claimText = text.trim();

      if (kind === 'screenshot' && file) {
        const ocr = await runOcr(file);
        if (!ocr.ok) {
          setStatus({ state: 'error', message: ocr.message });
          return;
        }
        if (ocr.text.trim().length < 10) {
          setStatus({
            state: 'error',
            message: t('verifyTool.errors.ocrFailed'),
          });
          return;
        }
        claimText = ocr.text.trim();
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

      // Pre-flight failures (validation, rate limit, usage) come back as plain
      // JSON with a real status code; a started verification streams NDJSON.
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => null)) as VerifyAPIError | null;
        setStatus({
          state: err?.code === 'ALL_LAYERS_FAILED' ? 'unavailable' : 'error',
          message: err?.error || t('verifyTool.errors.generic'),
        });
        return;
      }

      await consumeStream(res.body);
    } catch {
      setStatus({
        state: 'error',
        message: t('verifyTool.errors.network'),
      });
    }
  };

  /**
   * Reads the server's NDJSON progress stream: each `progress` event advances a
   * layer's bar as it settles; the terminal `report`/`error` event resolves the
   * view. Returns once a terminal event arrives or the stream ends.
   */
  async function consumeStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const handle = (event: VerifyStreamEvent): boolean => {
      if (event.type === 'progress') {
        if (event.step !== 'report') {
          setLiveSteps((prev) => ({
            ...prev,
            [event.step]: { status: event.status, count: event.count },
          }));
        }
        return false;
      }
      if (event.type === 'report') {
        setStatus({ state: 'report', report: event.report });
        return true;
      }
      setStatus({
        state: event.code === 'ALL_LAYERS_FAILED' ? 'unavailable' : 'error',
        message: event.error || t('verifyTool.errors.generic'),
      });
      return true;
    };

    const parseLine = (line: string): boolean => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      try {
        return handle(JSON.parse(trimmed) as VerifyStreamEvent);
      } catch {
        return false;
      }
    };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (parseLine(line)) {
          await reader.cancel().catch(() => undefined);
          return;
        }
      }
    }
    // Flush a final line that arrived without a trailing newline.
    if (buffer) parseLine(buffer);
  }

  /**
   * Extracts the claim text from a screenshot. readAsDataURL yields a
   * `data:image/...;base64,` string, and the API contract is bare base64, so
   * the prefix is dropped here.
   */
  async function runOcr(image: File): Promise<OcrOutcome> {
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
    const data = (await res.json()) as { success?: boolean; text?: string; error?: string };

    if (!res.ok || !data.success) {
      return { ok: false, message: data.error || t('verifyTool.errors.ocrFailed') };
    }
    return { ok: true, text: data.text ?? '' };
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
                placeholder={demo.text || t('verifyTool.textarea.placeholder')}
                value={text}
                onChange={(e) => {
                  demo.stop();
                  setText(e.target.value);
                }}
                onFocus={demo.stop}
                helperText={t('verifyTool.textarea.helper')}
                fullWidth
              />

              {examples && examples.length > 0 ? (
                <div className={styles.examples}>
                  <span className={styles.examplesLabel}>{t('home.try.label')}</span>
                  {examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className={styles.chip}
                      onClick={() => {
                        demo.stop();
                        setText(example);
                        setStatus({ state: 'idle' });
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              ) : null}
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
        {/* The wait is the one moment the method is visible, so it shows the
            four layers being searched rather than a bare spinner. */}
        {status.state === 'loading' ? (
          <div className={styles.progress}>
            <LayerProgress phase="streaming" live={liveSteps} />
          </div>
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
            {/* Each layer now reports what it actually returned, including the
                ones that found nothing or failed. */}
            <div className={styles.resolvedLayers}>
              <LayerProgress phase="resolved" report={status.report} />
            </div>
            <ReportView report={status.report} />
          </div>
        ) : null}
      </div>
    </section>
  );
};
