import type { Metadata } from 'next';
import { ObservatorClient } from '@/components/observator/ObservatorClient';
import shell from '../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Observator — Verifact',
  description:
    'Harta narativelor de dezinformare: vezi de unde pornesc, cum se răspândesc și ce verdict au — pe un glob interactiv.',
};

export default function ObservatorPage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Observator · preview</p>
        <h1 className={shell.title}>Harta narativelor de dezinformare</h1>
        <p style={{ maxWidth: '60ch', color: 'var(--color-ink-secondary)' }}>
          Fiecare punct e o narativă reală: de unde a pornit, cât s-a răspândit, ce verdict are.
          Alege o narativă din listă pentru povestea completă. Deocamdată pe date demonstrative —
          se va alimenta din verificările Verifact.
        </p>
      </header>

      <div className={shell.body}>
        <ObservatorClient />
      </div>
    </div>
  );
}
