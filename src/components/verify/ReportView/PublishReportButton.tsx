'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Modal, Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import type { VerificationReport } from '@/types/verification';
import { createClient } from '@/lib/supabase/client';
import { isScoreDecisive } from '@/lib/verification/public-reports';

export interface PublishReportButtonProps {
  report: VerificationReport;
}

export const PublishReportButton: React.FC<PublishReportButtonProps> = ({ report }) => {
  const router = useRouter();
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthor, setShowAuthor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    isPublic?: boolean;
    visibilityStatus?: string;
    message?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setIsAuthenticated(true);
      }
    });
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  const score = report.score;
  const isAlreadyPublic = report.isPublic || report.visibilityStatus === 'public';
  const isScreenshot = report.inputType === 'screenshot' || (report as unknown as Record<string, unknown>).input_type === 'screenshot';

  const close = () => {
    setIsOpen(false);
    setResult(null);
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch(`/api/user/verifications/${report.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublic: true,
          showAuthor,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setResult({
          success: false,
          error: data.error || 'A apărut o eroare la publicarea raportului.',
        });
      } else {
        setResult({
          success: true,
          isPublic: data.isPublic,
          visibilityStatus: data.visibilityStatus,
          message: data.message,
        });
        router.refresh();
      }
    } catch {
      setResult({
        success: false,
        error: 'A apărut o eroare de rețea. Te rugăm să reîncerci.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAlreadyPublic) {
    return (
      <Link href={`/rapoarte/${report.id}`} style={{ textDecoration: 'none' }}>
        <Button type="button" variant="secondary" size="sm">
          {t('publishModal.seePublicBtn')}
        </Button>
      </Link>
    );
  }

  if (isScreenshot) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }} title={t('publishModal.screenshotDisabledTitle')}>
        <Button type="button" variant="secondary" size="sm" disabled>
          {t('publishModal.makePublicBtn')}
        </Button>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted, #71717a)' }}>
          {t('publishModal.screenshotDisabledNote')}
        </span>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'inline-block' }}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          {t('publishModal.makePublicBtn')}
        </Button>
      </div>

      <Modal isOpen={isOpen} onClose={close} title={t('publishModal.title')}>
        {result?.success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Callout label={result.visibilityStatus === 'public' ? 'Publicat' : 'Moderare'} tone="plain">
              {result.visibilityStatus === 'public' ? (
                <>
                  {t('publicReports.publishedSuccess')}
                  <div style={{ marginTop: '0.75rem' }}>
                    <Link href={`/rapoarte/${report.id}`} style={{ textDecoration: 'underline', fontWeight: 600 }}>
                      {t('publicReports.openPublicPage')} &rarr;
                    </Link>
                  </div>
                </>
              ) : (
                <>{t('publicReports.pendingNotice')}</>
              )}
            </Callout>
            <Button type="button" variant="ghost" onClick={close} fullWidth>
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-ink-secondary)', lineHeight: 1.5 }}>
              {t('publishModal.lead')}
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                fontSize: '0.95rem',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={showAuthor}
                onChange={(e) => setShowAuthor(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>{t('publishModal.showAuthor')}</span>
            </label>

            {result?.error && (
              <Callout label={t('publishModal.errorLabel')} tone="plain">
                <span style={{ color: 'var(--color-danger)' }}>{result.error}</span>
              </Callout>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="ghost" onClick={close} disabled={isSubmitting} fullWidth>
                {t('publishModal.cancelBtn')}
              </Button>
              <Button type="button" variant="primary" onClick={handlePublish} isLoading={isSubmitting} fullWidth>
                {t('publishModal.confirmBtn')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
