'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ScreenshotUpload } from '../ScreenshotUpload';
import styles from './VerifyForm.module.css';

export type InputType = 'screenshot' | 'text' | 'url';
export type Language = 'ro' | 'en' | 'unknown';

export interface VerifyFormData {
  type: InputType;
  text: string;
  language: Language;
  isPublic: boolean;
  url?: string;
  file?: File | null;
}

export interface VerifyFormProps {
  onSubmit?: (data: VerifyFormData) => Promise<void>;
}

interface URLPreview {
  domain: string;
  title: string;
  publishDate: string;
}

export const VerifyForm: React.FC<VerifyFormProps> = ({ onSubmit }) => {
  const [activeTab, setActiveTab] = useState<InputType>('text');
  const [textInput, setTextInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isUrlValid, setIsUrlValid] = useState<boolean | null>(null);
  const [isExtractingUrl, setIsExtractingUrl] = useState<boolean>(false);
  const [urlPreview, setUrlPreview] = useState<URLPreview | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotText, setScreenshotText] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<Language>('unknown');
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Language detection helper heuristic
  const detectLanguage = (str: string): Language => {
    if (!str || str.length < 10) return 'unknown';
    const roWords = ['și', 'sau', 'este', 'sunt', 'pentru', 'despre', 'după', 'care', 'stire', 'guvern'];
    const enWords = ['the', 'is', 'are', 'and', 'for', 'about', 'after', 'which', 'news', 'government'];

    const lower = str.toLowerCase();
    let roCount = 0;
    let enCount = 0;

    roWords.forEach((w) => {
      if (lower.includes(` ${w} `) || lower.startsWith(`${w} `)) roCount++;
    });
    enWords.forEach((w) => {
      if (lower.includes(` ${w} `) || lower.startsWith(`${w} `)) enCount++;
    });

    if (roCount > enCount) return 'ro';
    if (enCount > roCount) return 'en';
    return 'ro'; // Default to RO for regional context
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const val = e.target.value;
    if (val.length <= 2000) {
      setTextInput(val);
      setDetectedLanguage(detectLanguage(val));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setUrlInput(val);
    setUrlPreview(null);

    if (!val) {
      setIsUrlValid(null);
      return;
    }

    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
    const isValid = urlPattern.test(val);
    setIsUrlValid(isValid);
  };

  const handleExtractUrl = (): void => {
    if (!isUrlValid || !urlInput) return;
    setIsExtractingUrl(true);

    setTimeout(() => {
      let domain = 'stiri.ro';
      try {
        const parsed = new URL(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`);
        domain = parsed.hostname.replace('www.', '');
      } catch {
        domain = 'stiri.ro';
      }

      const extractedTitle = `Articol extras de pe ${domain}: Știre verificată de interes public`;
      setUrlPreview({
        domain,
        title: extractedTitle,
        publishDate: new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }),
      });
      setDetectedLanguage('ro');
      setIsExtractingUrl(false);
    }, 1200);
  };

  const isFormValid = (): boolean => {
    if (isSubmitting) return false;

    if (activeTab === 'text') {
      return textInput.trim().length >= 10;
    }
    if (activeTab === 'url') {
      return !!isUrlValid && (!!urlPreview || urlInput.trim().length > 10);
    }
    if (activeTab === 'screenshot') {
      return !!screenshotFile && screenshotText.trim().length >= 5;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);

    let finalPayloadText = '';
    if (activeTab === 'text') finalPayloadText = textInput;
    if (activeTab === 'url') finalPayloadText = urlPreview ? urlPreview.title : urlInput;
    if (activeTab === 'screenshot') finalPayloadText = screenshotText;

    const payload: VerifyFormData = {
      type: activeTab,
      text: finalPayloadText,
      language: detectedLanguage === 'unknown' ? 'ro' : detectedLanguage,
      isPublic,
      url: activeTab === 'url' ? urlInput : undefined,
      file: activeTab === 'screenshot' ? screenshotFile : undefined,
    };

    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        // Fallback simulation if no onSubmit prop passed
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="verify-section" className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Ce vrei să verifici?</span>
        {detectedLanguage !== 'unknown' && (
          <div className={styles.languageIndicator}>
            <span>{detectedLanguage === 'ro' ? '🇷🇴 Română' : '🇬🇧 Engleză'}</span>
          </div>
        )}
      </div>

      {/* Tabs list */}
      <div className={styles.tabsList} role="tablist" aria-label="Opțiuni de introducere conținut">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'screenshot'}
          className={`${styles.tabBtn} ${activeTab === 'screenshot' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('screenshot')}
        >
          <span>📷 Screenshot</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'text'}
          className={`${styles.tabBtn} ${activeTab === 'text' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('text')}
        >
          <span>✏️ Text</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'url'}
          className={`${styles.tabBtn} ${activeTab === 'url' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('url')}
        >
          <span>🔗 URL</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tab 1: Screenshot */}
        {activeTab === 'screenshot' && (
          <div className={styles.tabContent} role="tabpanel">
            <ScreenshotUpload
              onFileSelected={(file) => setScreenshotFile(file)}
              onTextExtracted={(extracted) => {
                setScreenshotText(extracted);
                setDetectedLanguage(detectLanguage(extracted));
              }}
            />
          </div>
        )}

        {/* Tab 2: Text */}
        {activeTab === 'text' && (
          <div className={styles.tabContent} role="tabpanel">
            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.textarea}
                placeholder={
                  detectedLanguage === 'en'
                    ? 'Paste the news headline, claim, or quote you want to verify...'
                    : 'Lipește titlul știrii, afirmația sau citatul pe care vrei să îl verifici...'
                }
                value={textInput}
                onChange={handleTextChange}
                aria-label="Text de verificat"
              />
              <span
                className={`${styles.charCounter} ${textInput.length > 1800 ? styles.charWarning : ''}`}
              >
                {textInput.length} / 2000
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: URL */}
        {activeTab === 'url' && (
          <div className={styles.tabContent} role="tabpanel">
            <div className={styles.urlInputWrapper}>
              <div className={styles.urlInputRow}>
                <svg
                  className={styles.urlIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <input
                  type="url"
                  className={`${styles.urlInput} ${
                    isUrlValid === true ? styles.urlValid : isUrlValid === false ? styles.urlInvalid : ''
                  }`}
                  placeholder="https://www.digi24.ro/stiri/..."
                  value={urlInput}
                  onChange={handleUrlChange}
                  aria-label="URL articol de verificat"
                />
              </div>

              {isUrlValid === false && (
                <span className={styles.urlFeedback}>Vă rugăm introduceți un URL valid (ex: https://...)</span>
              )}

              {isUrlValid && !urlPreview && !isExtractingUrl && (
                <Button variant="outline" size="sm" type="button" onClick={handleExtractUrl}>
                  Extrage articol
                </Button>
              )}

              {isExtractingUrl && (
                <div className={styles.skeletonCard}>
                  <div className={styles.skeletonLine} style={{ width: '40%' }} />
                  <div className={styles.skeletonLine} style={{ width: '85%' }} />
                  <div className={styles.skeletonLine} style={{ width: '30%' }} />
                </div>
              )}

              {urlPreview && (
                <div className={styles.urlPreviewCard}>
                  <div className={styles.urlDomain}>
                    <span>🌐 {urlPreview.domain}</span>
                  </div>
                  <div className={styles.urlTitle}>{urlPreview.title}</div>
                  <div className={styles.urlMeta}>Data publicării: {urlPreview.publishDate}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Action */}
        <Button
          variant="primary"
          size="lg"
          type="submit"
          disabled={!isFormValid()}
          isLoading={isSubmitting}
          className={styles.submitBtn}
        >
          {isSubmitting ? (
            'Se procesează...'
          ) : (
            <>
              <span>Verifică acum</span>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </Button>

        <label className={styles.visibilityCheckbox}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span>Raportul va fi public în comunitate (îl poți seta privat dacă ai cont)</span>
        </label>
      </form>
    </div>
  );
};
