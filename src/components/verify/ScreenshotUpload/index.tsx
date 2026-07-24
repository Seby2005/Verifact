'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import styles from './ScreenshotUpload.module.css';

export interface ScreenshotUploadProps {
  onTextExtracted?: (text: string, confidence: number) => void;
  onError?: (error: string) => void;
  onFileSelected?: (file: File | null) => void;
}

export const ScreenshotUpload: React.FC<ScreenshotUploadProps> = ({
  onTextExtracted,
  onError,
  onFileSelected,
}) => {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [hasExtracted, setHasExtracted] = useState<boolean>(false);
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateAndSelectFile = (selectedFile: File): void => {
    setErrorMsg(null);
    setExtractedText('');
    setConfidence(null);
    setHasExtracted(false);

    // Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      const err = `Fișierul încărcat are ${formatFileSize(selectedFile.size)}. Dimensiunea maximă permisă este 10 MB.`;
      setErrorMsg(err);
      onError?.(err);
      return;
    }

    // Validate MIME type strictly
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const fileNameLower = selectedFile.name.toLowerCase();
    const hasValidExt = fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg') || fileNameLower.endsWith('.png') || fileNameLower.endsWith('.webp');

    if (!allowedTypes.includes(selectedFile.type) && !hasValidExt) {
      const err = 'Format fișier nepermis. Vă rugăm încărcați doar imagini JPEG, PNG sau WEBP.';
      setErrorMsg(err);
      onError?.(err);
      return;
    }

    setFile(selectedFile);
    onFileSelected?.(selectedFile);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const runOCR = async (): Promise<void> => {
    if (!file) return;

    setIsExtracting(true);
    setErrorMsg(null);

    try {
      const base64Str = await fileToBase64(file);
      const pureBase64 = base64Str.replace(/^data:image\/\w+;base64,/, '');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          image: pureBase64,
          mimeType: file.type || 'image/jpeg',
        }),
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Nu s-a putut extrage textul din imagine.');
      }

      const text = data.text?.trim() || '';
      if (!text) {
        throw new Error('Nu am putut detecta text în această imagine. Vă rugăm încercați o altă imagine sau introduceți textul manual.');
      }

      const conf = data.confidence ?? 0.85;
      setExtractedText(text);
      setConfidence(conf);
      setHasExtracted(true);
      onTextExtracted?.(text, conf);
    } catch (err: unknown) {
      let message = 'A apărut o eroare la extragerea textului din imagine.';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          message = 'Procesarea OCR a depășit timpul maxim (10s). Reîncercați sau introduceți textul manual.';
        } else {
          message = err.message;
        }
      }
      setErrorMsg(message);
      onError?.(message);
    } finally {
      setIsExtracting(false);
    }
  };

  const fileToBase64 = (fileObj: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileObj);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleRemove = (): void => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setExtractedText('');
    setConfidence(null);
    setHasExtracted(false);
    setErrorMsg(null);
    onFileSelected?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const val = e.target.value;
    setExtractedText(val);
    onTextExtracted?.(val, confidence ?? 1);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-testid="screenshot-input"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        aria-label="Selectează fișier screenshot"
      />

      {!file ? (
        <div
          className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Zona de încărcare screenshot prin drag and drop sau click"
        >
          <svg
            className={styles.uploadIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          <p className={styles.primaryText}>
            {dragOver ? 'Eliberează fișierul aici' : 'Trage screenshot-ul aici (desktop)'}
          </p>
          <p className={styles.secondaryText}>sau</p>

          <div className={styles.selectBtn}>
            <Button variant="outline" size="sm" type="button" onClick={(e) => e.stopPropagation()}>
              Alege fișier din telefon/PC
            </Button>
          </div>

          <p className={styles.hintText}>Acceptăm imagini JPEG, PNG, WEBP · Maxim 10MB</p>
        </div>
      ) : (
        <div className={styles.previewCard} data-testid="screenshot-preview">
          <div className={styles.previewHeader}>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview screenshot încărcat"
                className={styles.previewImage}
              />
            )}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={handleRemove}
              aria-label="Șterge și încarcă alta"
              title="Șterge și încarcă alta"
            >
              ✕
            </button>
          </div>

          <div className={styles.fileMetaRow}>
            <div className={styles.successStatus}>
              <span>✓ Screenshot selectat</span>
              <span className={styles.fileSize}>({file.name} · {formatFileSize(file.size)})</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" size="sm" type="button" onClick={handleRemove}>
                Șterge și încarcă alta
              </Button>
              {!hasExtracted && !isExtracting && (
                <Button variant="primary" size="sm" type="button" onClick={runOCR}>
                  🔍 Extrage text
                </Button>
              )}
            </div>
          </div>

          {isExtracting && (
            <div className={styles.ocrLoading}>
              <span className={styles.spinner} />
              <span>Extrag textul din imagine (Google Cloud Vision API)...</span>
            </div>
          )}

          {hasExtracted && (
            <div className={styles.ocrSection}>
              <button
                type="button"
                className={styles.collapsibleToggle}
                onClick={() => setIsCollapsibleOpen(!isCollapsibleOpen)}
                aria-expanded={isCollapsibleOpen}
              >
                <span>Text extras din imagine (editabil)</span>
                <span>{isCollapsibleOpen ? '▲' : '▼'}</span>
              </button>

              {isCollapsibleOpen && (
                <>
                  <Textarea
                    label="Text extras din imagine"
                    data-testid="ocr-text-area"
                    className={styles.ocrTextarea}
                    value={extractedText}
                    onChange={handleTextChange}
                    aria-label="Text extras din imagine editabil"
                    placeholder="Textul extras va apărea aici..."
                  />
                  <p className={styles.ocrNote}>
                    Textul a fost extras automat. Poți corecta eventualele greșeli înainte de verificare.
                  </p>
                  {confidence !== null && confidence < 0.7 && (
                    <div className={styles.confidenceWarning} role="alert">
                      <span>⚠️ Calitate OCR: {Math.round(confidence * 100)}% — Verifică textul extras, calitatea imaginii pare scăzută.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className={styles.errorBanner} role="alert">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}
    </div>
  );
};
