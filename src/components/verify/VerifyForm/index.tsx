'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ScreenshotUpload } from '../ScreenshotUpload';
import type { VerificationInput } from '@/types/verification';
import styles from './VerifyForm.module.css';

export type VerifyFormData = VerificationInput;

export interface VerifyFormProps {
  onSubmit: (input: VerificationInput) => void;
  isLoading?: boolean;
}

export const VerifyForm: React.FC<VerifyFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab persistence via URL search param ?tab=screenshot|text|url
  const initialTabParam = searchParams.get('tab');
  const validTabs: Array<'screenshot' | 'text' | 'url'> = ['screenshot', 'text', 'url'];
  const defaultTab = validTabs.includes(initialTabParam as 'screenshot' | 'text' | 'url')
    ? (initialTabParam as 'screenshot' | 'text' | 'url')
    : 'screenshot';

  const [activeTab, setActiveTab] = useState<'screenshot' | 'text' | 'url'>(defaultTab);

  // Input states
  const [screenshotText, setScreenshotText] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');

  // UI / Validation states
  const [detectedLanguage, setDetectedLanguage] = useState<'ro' | 'en' | 'unknown'>('ro');
  const [isDetectingLang, setIsDetectingLang] = useState<boolean>(false);
  const [urlMetadata, setUrlMetadata] = useState<{ title?: string; publisher?: string; isBlocked?: boolean } | null>(null);
  const [isLoadingUrlMeta, setIsLoadingUrlMeta] = useState<boolean>(false);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync tab with URL search params
  const handleTabChange = (tab: 'screenshot' | 'text' | 'url'): void => {
    setActiveTab(tab);
    setErrorMessage(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Debounced Language Detection (400ms)
  const detectLanguage = useCallback((text: string) => {
    if (!text || text.trim().length < 10) {
      setDetectedLanguage('ro');
      setIsDetectingLang(false);
      return;
    }

    setIsDetectingLang(true);
    const timer = setTimeout(() => {
      const sample = text.toLowerCase();
      // Simple heuristic for RO vs EN
      const roWords = ['si', 'sau', 'nu', 'este', 'sunt', 'din', 'care', 'pentru', 'cu', 'pe', 'in', 'despre', 'romania'];
      const enWords = ['the', 'and', 'is', 'are', 'in', 'at', 'that', 'with', 'from', 'this', 'for', 'about'];

      let roCount = 0;
      let enCount = 0;

      const words = sample.split(/\s+/);
      words.forEach((w) => {
        if (roWords.includes(w)) roCount++;
        if (enWords.includes(w)) enCount++;
      });

      if (enCount > roCount) {
        setDetectedLanguage('en');
      } else {
        setDetectedLanguage('ro');
      }
      setIsDetectingLang(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Handle text change with character limits (min 10, max 2000)
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    if (value.length <= 2000) {
      setTextInput(value);
      setErrorMessage(null);
      detectLanguage(value);
    }
  };

  // Debounced URL Preview Fetch (600ms)
  useEffect(() => {
    if (activeTab !== 'url' || !urlInput.trim()) {
      setUrlMetadata(null);
      setIsLoadingUrlMeta(false);
      return;
    }

    // Validate URL syntax
    let validUrlObj: URL | null = null;
    try {
      validUrlObj = new URL(urlInput.trim());
      if (validUrlObj.protocol !== 'http:' && validUrlObj.protocol !== 'https:') {
        validUrlObj = null;
      }
    } catch {
      validUrlObj = null;
    }

    if (!validUrlObj) {
      setUrlMetadata(null);
      return;
    }

    setIsLoadingUrlMeta(true);
    const timer = setTimeout(async () => {
      try {
        const hostname = validUrlObj?.hostname || '';
        setUrlMetadata({
          title: `Articol / Pagina de pe ${hostname}`,
          publisher: hostname.replace(/^www\./, ''),
          isBlocked: false,
        });
      } catch {
        setUrlMetadata({
          isBlocked: true,
        });
      } finally {
        setIsLoadingUrlMeta(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [urlInput, activeTab]);

  // Form submit handler with strict validation per tab
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setErrorMessage(null);

    let finalInputText = '';
    let finalUrl = '';

    if (activeTab === 'screenshot') {
      if (!screenshotFile && !screenshotText.trim()) {
        setErrorMessage('Vă rugăm să încărcați o imagine screenshot sau să extrageți textul.');
        return;
      }
      if (screenshotText.trim().length < 10) {
        setErrorMessage('Textul extras din imagine trebuie să aibă minim 10 caractere.');
        return;
      }
      finalInputText = screenshotText.trim();
    } else if (activeTab === 'text') {
      const trimmed = textInput.trim();
      if (!trimmed) {
        setErrorMessage('Vă rugăm să introduceți textul sau știrea pe care doriți să o verificați.');
        return;
      }
      if (trimmed.length < 10) {
        setErrorMessage('Textul introdus este prea scurt. Minim 10 caractere necesare pentru o verificare relevantă.');
        return;
      }
      if (trimmed.length > 2000) {
        setErrorMessage('Textul introdus depășește limita maximă de 2000 de caractere.');
        return;
      }
      finalInputText = trimmed;
    } else if (activeTab === 'url') {
      const trimmedUrl = urlInput.trim();
      if (!trimmedUrl) {
        setErrorMessage('Vă rugăm să introduceți un link (URL) valid.');
        return;
      }
      try {
        const urlObj = new URL(trimmedUrl);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          throw new Error('Protocol invalid');
        }
      } catch {
        setErrorMessage('URL invalid. Introduceți o adresă completă care începe cu http:// sau https://');
        return;
      }
      finalUrl = trimmedUrl;
      finalInputText = trimmedUrl;
    }

    const payload: VerificationInput = {
      type: activeTab,
      inputType: activeTab,
      text: finalInputText,
      url: finalUrl || undefined,
      file: screenshotFile,
      language: detectedLanguage,
      isPublic,
    };

    onSubmit(payload);
  };

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit} noValidate>
      {/* Navigation Tabs */}
      <div className={styles.tabList} role="tablist" aria-label="Opțiuni de verificare">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'screenshot'}
          className={`${styles.tabButton} ${activeTab === 'screenshot' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('screenshot')}
        >
          📷 Screenshot
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'text'}
          className={`${styles.tabButton} ${activeTab === 'text' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('text')}
        >
          📝 Text / Știre
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'url'}
          className={`${styles.tabButton} ${activeTab === 'url' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('url')}
        >
          🔗 Link (URL)
        </button>
      </div>

      {/* Tab Contents */}
      <div className={styles.tabBody}>
        {/* Tab 1: Screenshot */}
        {activeTab === 'screenshot' && (
          <div className={styles.tabContent} role="tabpanel">
            <ScreenshotUpload
              onFileSelected={(file) => setScreenshotFile(file)}
              onTextExtracted={(extracted) => setScreenshotText(extracted)}
            />
          </div>
        )}

        {/* Tab 2: Text */}
        {activeTab === 'text' && (
          <div className={styles.tabContent} role="tabpanel">
            <div className={styles.textareaWrapper}>
              <Textarea
                label="Text de verificat"
                className={styles.textarea}
                data-testid="text-input"
                placeholder={
                  detectedLanguage === 'en'
                    ? 'Paste the news headline, claim, or quote you want to verify (min 10 characters)...'
                    : 'Lipește titlul știrii, afirmația sau citatul pe care vrei să îl verifici (minim 10 caractere)...'
                }
                value={textInput}
                onChange={handleTextChange}
                aria-label="Text de verificat"
              />
              <div className={styles.textareaFooter}>
                {textInput.length > 0 && textInput.trim().length < 10 && (
                  <span className={styles.charError}>Minim 10 caractere necesare pentru verificare</span>
                )}
                <span
                  className={`${styles.charCounter} ${textInput.length > 1800 ? styles.charWarning : ''}`}
                >
                  {textInput.length} / 2000
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: URL */}
        {activeTab === 'url' && (
          <div className={styles.tabContent} role="tabpanel">
            <div className={styles.urlInputWrapper}>
              <Input
                type="url"
                data-testid="url-input"
                placeholder="https://exemplu.ro/stire-sau-postare"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setErrorMessage(null);
                }}
                aria-label="Adresă URL articol sau postare"
              />
            </div>

            {isLoadingUrlMeta && (
              <div className={styles.metaLoading}>
                <span className={styles.spinner} />
                <span>Extrag date despre pagina web...</span>
              </div>
            )}

            {urlMetadata && !isLoadingUrlMeta && (
              <div className={styles.urlPreviewCard}>
                {urlMetadata.isBlocked ? (
                  <div className={styles.blockedNotice}>
                    ⚠️ Dacă site-ul blochează scraping-ul, vom analiza domeniul și metadatele publice disponibile.
                  </div>
                ) : (
                  <div className={styles.previewMetaContent}>
                    <div className={styles.previewTitle}>{urlMetadata.title}</div>
                    <div className={styles.previewPublisher}>Sursă: {urlMetadata.publisher}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <div className={styles.errorAlert} role="alert">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Footer Controls: Language Indicator, Visibility Toggle, Submit Button */}
      <div className={styles.formFooter}>
        <div className={styles.footerLeft}>
          {/* Debounced Language Badge */}
          <div className={styles.languageBadge} title="Limba detectată automat">
            {isDetectingLang ? (
              <span className={styles.detectingLang}>Detectez...</span>
            ) : detectedLanguage === 'en' ? (
              <span className={styles.langItem}>🇬🇧 Engleză</span>
            ) : (
              <span className={styles.langItem}>🇷🇴 Română</span>
            )}
          </div>

          {/* Public / Private Toggle */}
          <label className={styles.privacyCheckboxLabel}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span>Raport public (vizibil în comunitate)</span>
          </label>
        </div>

        <Button
          variant="primary"
          size="lg"
          type="submit"
          disabled={isLoading}
          className={styles.submitBtn}
        >
          {isLoading ? (
            <>
              <span className={styles.btnSpinner} />
              <span>Se verifică...</span>
            </>
          ) : (
            <>
              <span>🔍 Verifică acum</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
