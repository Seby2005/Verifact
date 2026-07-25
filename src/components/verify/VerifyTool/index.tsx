'use client';

import React, { useRef, useState } from 'react';
import { Button, Tabs, Textarea, Input, Callout, type TabItem } from '@/components/ui';
import type { VerificationInputKind, VerificationReport, VerifyResponse } from '@/types/verification';
import { ReportView } from '../ReportView';
import styles from './VerifyTool.module.css';

const TABS: ReadonlyArray<TabItem<VerificationInputKind>> = [
  { id: 'text', label: 'Text' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'url', label: 'URL' },
];

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'report'; report: VerificationReport }
  | { state: 'unavailable'; message: string }
  | { state: 'error'; message: string };

export const VerifyTool: React.FC = () => {
  const [kind, setKind] = useState<VerificationInputKind>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentValue = kind === 'text' ? text : kind === 'url' ? url : (file?.name ?? '');
  const canSubmit = currentValue.trim().length > 0 && status.state !== 'loading';

  const handleTabChange = (next: VerificationInputKind) => {
    setKind(next);
    setStatus({ state: 'idle' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus({ state: 'loading' });

    try {
      // TODO(backend): screenshot verification needs multipart upload + OCR
      // once the pipeline exists; for now the filename is sent so the request
      // shape and validation path are exercised end to end.
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, value: currentValue }),
      });
      const data = (await res.json()) as VerifyResponse;

      if (data.status === 'ok') {
        setStatus({ state: 'report', report: data.report });
      } else if (data.status === 'not_implemented') {
        setStatus({ state: 'unavailable', message: data.message });
      } else {
        setStatus({ state: 'error', message: data.message });
      }
    } catch {
      setStatus({
        state: 'error',
        message: 'Nu am putut contacta serverul. Verifică conexiunea și încearcă din nou.',
      });
    }
  };

  return (
    <section className={styles.tool} aria-labelledby="verify-heading">
      <h2 id="verify-heading" className="label-caps">
        Verifică o afirmație
      </h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.panel}>
          <Tabs
            items={TABS}
            value={kind}
            onChange={handleTabChange}
            ariaLabel="Tip de conținut de verificat"
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
                label="Afirmația de verificat"
                placeholder="Lipește aici textul sau afirmația pe care vrei să o verifici."
                value={text}
                onChange={(e) => setText(e.target.value)}
                helperText="Minimum 10 caractere. Funcționează cel mai bine cu o singură afirmație concretă."
                fullWidth
              />
            </div>
          ) : null}

          {kind === 'screenshot' ? (
            <div className={styles.field}>
              {/* TODO(backend): OCR extraction (Google Cloud Vision per PRD §3.2)
                  is not wired up — the file is not uploaded anywhere yet. */}
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
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <span className={styles.dropzoneTitle}>Alege o imagine sau trage-o aici</span>
                <span className={styles.dropzoneHint}>PNG, JPG sau WebP — maximum 10 MB</span>
              </label>
              {file ? <p className={styles.fileName}>Fișier selectat: {file.name}</p> : null}
            </div>
          ) : null}

          {kind === 'url' ? (
            <div className={styles.field}>
              <Input
                label="Link către articol sau postare"
                type="url"
                inputMode="url"
                placeholder="https://exemplu.ro/articol"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                helperText="Extragem textul articolului și verificăm afirmațiile principale."
                fullWidth
              />
            </div>
          ) : null}

          <div className={styles.actions}>
            <Button type="submit" variant="primary" size="lg" disabled={!canSubmit} isLoading={status.state === 'loading'}>
              Verifică acum
            </Button>
            <span className={styles.actionHint}>
              Rapoartele tale rămân private până când alegi tu să le publici.
            </span>
          </div>
        </div>
      </form>

      <div aria-live="polite">
        {status.state === 'loading' ? (
          <p className={styles.pending}>Se verifică…</p>
        ) : null}

        {status.state === 'unavailable' ? (
          <div className={styles.status}>
            <Callout label="Momentan indisponibil" tone="plain">
              {status.message}
            </Callout>
          </div>
        ) : null}

        {status.state === 'error' ? (
          <div className={styles.status}>
            <Callout label="Eroare" tone="plain">
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
