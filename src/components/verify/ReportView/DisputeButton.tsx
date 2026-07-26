'use client';

import React, { useState } from 'react';
import { Button, Modal, Textarea, Input, Callout } from '@/components/ui';
import styles from './ReportView.module.css';

export interface DisputeButtonProps {
  reportId: string;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export const DisputeButton: React.FC<DisputeButtonProps> = ({ reportId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const close = () => {
    setIsOpen(false);
    // Reset after the close animation-free unmount so a re-open starts fresh.
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
      setErrorMessage(`Descrie eroarea în cel puțin ${MIN_REASON_LENGTH} caractere.`);
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
        setErrorMessage(data.error || 'A apărut o eroare. Te rugăm să încerci din nou.');
        return;
      }

      setState('success');
    } catch {
      setState('error');
      setErrorMessage('Nu am putut contacta serverul. Verifică conexiunea și încearcă din nou.');
    }
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        Raportează eroare
      </Button>

      <Modal isOpen={isOpen} onClose={close} title="Raportează o eroare">
        {state === 'success' ? (
          <Callout label="Trimis" tone="plain">
            Mulțumim. Contestația a fost înregistrată și raportul a fost marcat pentru
            reverificare.
          </Callout>
        ) : (
          <form onSubmit={handleSubmit} className={styles.disputeForm}>
            <Textarea
              label="Ce e greșit în acest raport?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={MIN_REASON_LENGTH}
              maxLength={MAX_REASON_LENGTH}
              rows={4}
              required
              fullWidth
              helperText={`Minimum ${MIN_REASON_LENGTH} caractere.`}
              error={state === 'error' ? errorMessage : undefined}
              disabled={state === 'submitting'}
            />
            <Input
              label="Email (opțional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@exemplu.ro"
              helperText="Doar dacă vrei să te contactăm în legătură cu această contestație."
              fullWidth
              disabled={state === 'submitting'}
            />
            {/* TODO_LEGAL_COPY: placeholder for the legal disclaimer that
                should appear next to the dispute submit button — out of
                scope for this change, legal content is handled separately. */}
            <p className={styles.disputeLegalPlaceholder}>TODO_LEGAL_COPY</p>
            <Button type="submit" variant="primary" isLoading={state === 'submitting'} fullWidth>
              Trimite contestația
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
};
