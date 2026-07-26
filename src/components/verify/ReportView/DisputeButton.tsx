'use client';

import React, { useState } from 'react';
import { Button, Modal, Textarea, Input, Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import styles from './ReportView.module.css';

export interface DisputeButtonProps {
  reportId: string;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export const DisputeButton: React.FC<DisputeButtonProps> = ({ reportId }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const close = () => {
    setIsOpen(false);
    setReason('');
    setEmail('');
    setState('idle');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReason = reason.trim();

    if (trimmedReason.length < MIN_REASON_LENGTH) {
      setState('error');
      setErrorMessage(t('dispute.reasonMinError'));
      return;
    }

    setState('submitting');
    setErrorMessage('');

    try {
      const res = await fetch(`/api/reports/${reportId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: trimmedReason,
          email: email.trim() || undefined,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        setState('error');
        setErrorMessage(data.error || t('dispute.errorGeneric'));
        return;
      }

      setState('success');
    } catch {
      setState('error');
      setErrorMessage(t('dispute.errorNetwork'));
    }
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        {t('dispute.reportErrorBtn')}
      </Button>

      <Modal isOpen={isOpen} onClose={close} title={t('dispute.modalTitle')}>
        {state === 'success' ? (
          <Callout label={t('dispute.sentLabel')} tone="plain">
            {t('dispute.sentText')}
          </Callout>
        ) : (
          <form onSubmit={handleSubmit} className={styles.disputeForm}>
            <Textarea
              label={t('dispute.reasonLabel')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={MIN_REASON_LENGTH}
              maxLength={MAX_REASON_LENGTH}
              rows={4}
              required
              fullWidth
              helperText={t('dispute.reasonHelper')}
              error={state === 'error' ? errorMessage : undefined}
              disabled={state === 'submitting'}
            />
            <Input
              label={t('dispute.emailLabel')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('dispute.emailPlaceholder')}
              helperText={t('dispute.emailHelper')}
              fullWidth
              disabled={state === 'submitting'}
            />
            <p className={styles.disputeLegalPlaceholder}>{t('dispute.legalNote')}</p>
            <Button type="submit" variant="primary" isLoading={state === 'submitting'} fullWidth>
              {t('dispute.submitBtn')}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
};
