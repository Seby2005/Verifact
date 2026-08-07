'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import styles from './WaitlistForm.module.css';

/**
 * Minimal waitlist signup — posts to /api/waitlist, which forwards to Listmonk.
 * Self-contained and unmounted by default; drop it into any page (e.g. the
 * homepage hero or /preturi) where a waitlist CTA belongs.
 */
export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return <p className={styles.done}>Mulțumim! Ești pe listă. 📨</p>;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <Input
        type="email"
        name="email"
        required
        fullWidth
        label="Email"
        placeholder="nume@exemplu.ro"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={state === 'error' ? 'Nu am putut te înscrie. Încearcă din nou.' : undefined}
      />
      <Button type="submit" isLoading={state === 'loading'}>
        Înscrie-mă pe listă
      </Button>
    </form>
  );
}
