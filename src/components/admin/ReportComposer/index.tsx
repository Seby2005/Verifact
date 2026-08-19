'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Callout, useToast } from '@/components/ui';
import type { Verdict } from '@/types/verification';
import styles from './ReportComposer.module.css';

const VERDICT_OPTIONS: { value: Verdict; label: string }[] = [
  { value: 'false', label: 'Probabil Fals' },
  { value: 'true', label: 'Probabil Adevărat' },
  { value: 'partial', label: 'Parțial / Context lipsă' },
  { value: 'unclear', label: 'Neclar / Dovezi insuficiente' },
];

const MAX_IMAGES = 6;

interface Preview {
  file: File;
  url: string;
}

export const ReportComposer: React.FC = () => {
  const router = useRouter();
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputText, setInputText] = useState('');
  const [verdict, setVerdict] = useState<Verdict>('false');
  const [score, setScore] = useState('20');
  const [analysis, setAnalysis] = useState('');
  const [sourcesText, setSourcesText] = useState('');
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    setPreviews((prev) => {
      const next = [...prev];
      for (const file of Array.from(incoming)) {
        if (next.length >= MAX_IMAGES) break;
        if (!file.type.startsWith('image/')) continue;
        next.push({ file, url: URL.createObjectURL(file) });
      }
      return next;
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    setPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const parseSources = (): { url: string; publisher: string }[] =>
    sourcesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((url) => {
        let publisher = '';
        try {
          publisher = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          publisher = '';
        }
        return { url, publisher };
      });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const scoreNum = Number(score);
    if (!Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      notify('Scorul trebuie să fie un întreg între 0 și 100.', 'error');
      return;
    }
    if (inputText.trim().length < 10) {
      notify('Afirmația trebuie să aibă cel puțin 10 caractere.', 'error');
      return;
    }
    if (analysis.trim().length < 10) {
      notify('Analiza trebuie să aibă cel puțin 10 caractere.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.set('inputText', inputText.trim());
      form.set('verdict', verdict);
      form.set('score', String(scoreNum));
      form.set('analysis', analysis.trim());
      form.set('language', 'ro');
      form.set('sources', JSON.stringify(parseSources()));
      for (const { file } of previews) {
        form.append('images', file);
      }

      const res = await fetch('/api/admin/reports/create', { method: 'POST', body: form });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        notify(data.error || 'Publicarea a eșuat.', 'error');
        setSubmitting(false);
        return;
      }

      notify('Raport publicat.', 'success');
      router.push(data.url);
    } catch {
      notify('Eroare de rețea.', 'error');
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Textarea
        fullWidth
        label="Afirmația verificată"
        helperText="Textul care apare ca titlu al raportului public."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={3}
        placeholder="Ex: „Vaccinul X conține cipuri de urmărire.”"
      />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="verdict-select">Verdict</label>
          <select
            id="verdict-select"
            className={styles.select}
            value={verdict}
            onChange={(e) => setVerdict(e.target.value as Verdict)}
          >
            {VERDICT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <Input
          type="number"
          label="Scor de veridicitate (0–100)"
          helperText="≥85 = adevărat, ≤39 = fals."
          value={score}
          onChange={(e) => setScore(e.target.value)}
          min={0}
          max={100}
        />
      </div>

      <Textarea
        fullWidth
        label="Analiză / rezumat"
        helperText="Explicația verdictului, afișată pe pagina raportului."
        value={analysis}
        onChange={(e) => setAnalysis(e.target.value)}
        rows={6}
      />

      <Textarea
        fullWidth
        label="Surse (opțional)"
        helperText="Un URL pe linie."
        value={sourcesText}
        onChange={(e) => setSourcesText(e.target.value)}
        rows={3}
        placeholder="https://exemplu.ro/articol"
      />

      <div className={styles.field}>
        <span className={styles.label}>Imagini ({previews.length}/{MAX_IMAGES})</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className={styles.fileInput}
          onChange={(e) => {
            addFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
        {previews.length > 0 && (
          <ul className={styles.thumbs}>
            {previews.map((p, i) => (
              <li key={p.url} className={styles.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Previzualizare ${i + 1}`} />
                <button type="button" onClick={() => removeImage(i)} aria-label="Elimină imaginea">×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Callout label="Doar admin" tone="plain">
        Rapoartele cu imagini pot fi publicate exclusiv din acest panou. Se publică imediat pe /rapoarte.
      </Callout>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" disabled={submitting}>
          {submitting ? 'Se publică…' : 'Publică raportul'}
        </Button>
      </div>
    </form>
  );
};
