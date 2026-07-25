import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Callout, VerdictLabel } from '@/components/ui';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Rapoarte',
  description:
    'Rapoartele publicate de comunitatea Verifact și istoricul verificărilor tale.',
};

/**
 * Rapoarte publice.
 *
 * TODO(backend): these are placeholder entries describing the intended shape of
 * the feed. There is no reports table or query layer yet (src/lib/verification
 * is empty), so nothing here is read from the database. They are marked as
 * examples in the UI rather than presented as real published reports — a fake
 * report list would itself be misinformation.
 */
const EXAMPLE_ENTRIES = [
  {
    claim: 'Vaccinurile ARNm modifică ADN-ul uman.',
    verdict: 'false' as const,
    score: 6,
    date: '25 iulie 2026',
    sources: 3,
  },
  {
    claim:
      'România a atras în 2025 cea mai mare sumă din PNRR dintre statele membre.',
    verdict: 'partial' as const,
    score: 71,
    date: '24 iulie 2026',
    sources: 5,
  },
  {
    claim: 'Un studiu arată că cititul a 20 de minute pe zi prelungește viața cu 2 ani.',
    verdict: 'unclear' as const,
    score: 48,
    date: '22 iulie 2026',
    sources: 4,
  },
];

export default function RapoartePage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Rapoarte</p>
        <h1 className={shell.title}>Verificări publicate</h1>
        <p className={shell.lead}>
          Rapoartele apar aici doar dacă autorul lor alege să le publice.
          Verificările tale rămân private în mod implicit.
        </p>
      </header>

      <div className={shell.body}>
        <Callout label="În construcție" tone="plain">
          Feed-ul public de rapoarte nu este încă activ — motorul de verificare
          și stocarea rapoartelor sunt în dezvoltare. Mai jos este structura pe
          care o va avea lista, cu exemple ilustrative, nu verificări reale.
        </Callout>

        <ol className={styles.list} aria-label="Exemple de rapoarte">
          {EXAMPLE_ENTRIES.map((entry) => (
            <li key={entry.claim} className={styles.item}>
              <div className={styles.itemMain}>
                <p className={styles.claim}>{entry.claim}</p>
                <p className={styles.itemMeta}>
                  {entry.date} · {entry.sources} surse citate
                </p>
              </div>
              <div className={styles.itemVerdict}>
                <VerdictLabel kind={entry.verdict} score={entry.score} />
              </div>
            </li>
          ))}
        </ol>

        <div className={shell.sectionRule}>
          <h2 className={styles.subhead}>Istoricul tău</h2>
          <p className={styles.subtext}>
            Dacă ai un cont, verificările tale se salvează automat și le vezi
            doar tu. Poți șterge oricare dintre ele, oricând.
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" size="md" href="/cont">
              Intră în cont
            </Button>
            <Link href="/" className={styles.textLink}>
              Verifică o afirmație
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
