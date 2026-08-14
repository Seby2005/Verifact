'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout, useToast } from '@/components/ui';
import { useLanguage } from '@/i18n';
import type { VerificationReport } from '@/types/verification';
import { useUserTier, fetchIsPremium } from '@/components/verify/ReportView/useUserTier';
import styles from './ReportDeepDive.module.css';

type DeepDiveAction =
  | 'explain_simple'
  | 'counter_arguments'
  | 'manipulation_techniques'
  | 'custom_question';

const MAX_QUESTION_LENGTH = 300;
const MIN_QUESTION_LENGTH = 5;

interface PresetDef {
  action: Exclude<DeepDiveAction, 'custom_question'>;
  icon: React.ReactNode;
}

const PRESETS: PresetDef[] = [
  {
    action: 'explain_simple',
    icon: (
      <svg viewBox="0 0 24 24" className={styles.presetIcon} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a9 9 0 0 0-9 9c0 1.7.5 3.3 1.3 4.7L3 21l4.6-1.1A9 9 0 1 0 12 3Z" />
        <path d="M9 10h.01M12 10h.01M15 10h.01" />
      </svg>
    ),
  },
  {
    action: 'counter_arguments',
    icon: (
      <svg viewBox="0 0 24 24" className={styles.presetIcon} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" />
        <path d="M8 21h8" />
        <path d="M5 7l-2 5h4l-2-5Z" />
        <path d="M19 7l-2 5h4l-2-5Z" />
        <path d="M5 7h14" />
      </svg>
    ),
  },
  {
    action: 'manipulation_techniques',
    icon: (
      <svg viewBox="0 0 24 24" className={styles.presetIcon} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
        <path d="M8.5 11.5h5" />
      </svg>
    ),
  },
];

export interface ReportDeepDiveProps {
  report: VerificationReport;
}

export const ReportDeepDive: React.FC<ReportDeepDiveProps> = ({ report }) => {
  const { t } = useLanguage();
  const { notify } = useToast();
  const router = useRouter();
  const { isPremium, ready } = useUserTier();

  const [question, setQuestion] = useState('');
  const [activeAction, setActiveAction] = useState<DeepDiveAction | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [copied, setCopied] = useState(false);

  const locked = ready && !isPremium;

  const run = async (action: DeepDiveAction, customQuestion?: string) => {
    setLoading(true);
    setError(null);
    setAnswer(null);
    setCopied(false);
    try {
      const res = await fetch('/api/report/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          actionType: action,
          customQuestion: action === 'custom_question' ? customQuestion : undefined,
        }),
      });

      if (res.status === 401) {
        notify(t('reportDeepDive.errorAuth'), 'error');
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setRequiresUpgrade(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(t('reportDeepDive.errorGeneric'));
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { answer?: string; actionType?: DeepDiveAction };
      if (typeof data.answer === 'string' && data.answer.length > 0) {
        setAnswer(data.answer);
        setActiveAction(data.actionType ?? action);
      } else {
        setError(t('reportDeepDive.errorGeneric'));
      }
    } catch {
      setError(t('reportDeepDive.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (action: Exclude<DeepDiveAction, 'custom_question'>) => {
    void run(action);
  };

  const handleCustomSubmit = () => {
    const trimmed = question.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH) {
      setError(t('reportDeepDive.questionTooShort'));
      return;
    }
    if (trimmed.length > MAX_QUESTION_LENGTH) {
      setError(t('reportDeepDive.questionTooLong'));
      return;
    }
    void run('custom_question', trimmed);
  };

  const handleCopy = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify(t('reportDeepDive.copyFailed'), 'error');
    }
  };

  const handleUpgradeClick = () => {
    // Authoritative check before sending the user away: an admin or an
    // already-Premium user whose tier fetch raced should not be upsold.
    void fetchIsPremium().then((premium) => {
      if (premium) {
        setRequiresUpgrade(false);
      } else {
        router.push('/preturi');
      }
    });
  };

  // While the tier fetch is in flight, render the shell with a skeleton.
  if (!ready) {
    return (
      <section className={styles.section} aria-busy="true">
        <div className={styles.head}>
          <span className={styles.title}>{t('reportDeepDive.title')}</span>
          <span className={styles.proBadge}>PRO</span>
        </div>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </section>
    );
  }

  if (locked || requiresUpgrade) {
    return (
      <section className={styles.section}>
        <div className={styles.head}>
          <span className={styles.title}>{t('reportDeepDive.title')}</span>
          <span className={styles.proBadge}>PRO</span>
        </div>
        <Callout label={t('reportDeepDive.teaserLead')} tone="plain">
          {t('reportDeepDive.teaserText')}
        </Callout>
        <div className={styles.teaserCta}>
          <Button variant="primary" size="md" onClick={handleUpgradeClick}>
            {t('reportDeepDive.unlockBtn')}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-busy={loading}>
      <div className={styles.head}>
        <span className={styles.title}>{t('reportDeepDive.title')}</span>
        <span className={styles.proBadge}>PRO</span>
      </div>

      {loading ? (
        <div className={styles.skeleton} role="status" aria-label={t('reportDeepDive.loading')}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      ) : answer ? (
        <div className={styles.answerBlock}>
          <div className={styles.answerHead}>
            <span className={styles.answerLabel}>
              {activeAction === 'custom_question'
                ? t('reportDeepDive.answerCustomLabel')
                : t(`reportDeepDive.presets.${activeAction ?? 'explain_simple'}.label`)}
            </span>
            <button type="button" className={styles.copyBtn} onClick={handleCopy}>
              {copied ? t('reportDeepDive.copied') : t('reportDeepDive.copyBtn')}
            </button>
          </div>
          <p className={styles.answerText}>{answer}</p>
          <button type="button" className={styles.askAgain} onClick={() => setAnswer(null)}>
            {t('reportDeepDive.askAgain')}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.presets}>
            {PRESETS.map(({ action, icon }) => (
              <button
                key={action}
                type="button"
                className={styles.preset}
                onClick={() => handlePreset(action)}
                disabled={loading}
              >
                {icon}
                <span className={styles.presetBody}>
                  <span className={styles.presetLabel}>
                    {t(`reportDeepDive.presets.${action}.label`)}
                  </span>
                  <span className={styles.presetDesc}>
                    {t(`reportDeepDive.presets.${action}.description`)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className={styles.custom}>
            <label className={styles.customLabel} htmlFor="deep-dive-question">
              {t('reportDeepDive.customLabel')}
            </label>
            <textarea
              id="deep-dive-question"
              className={styles.customInput}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('reportDeepDive.customPlaceholder')}
              maxLength={MAX_QUESTION_LENGTH}
              rows={3}
            />
            <div className={styles.customRow}>
              <span className={styles.customHelper}>{t('reportDeepDive.customHelper')}</span>
              <Button variant="secondary" size="md" onClick={handleCustomSubmit} disabled={loading}>
                {loading ? t('reportDeepDive.askBtnLoading') : t('reportDeepDive.askBtn')}
              </Button>
            </div>
          </div>
        </>
      )}

      {error ? (
        <div className={styles.error}>
          <Callout label={t('reportDeepDive.errorLabel')} tone="plain">
            {error}
          </Callout>
        </div>
      ) : null}

      {!loading && !answer ? (
        <p className={styles.footnote}>{t('reportDeepDive.footnote')}</p>
      ) : null}
    </section>
  );
};
