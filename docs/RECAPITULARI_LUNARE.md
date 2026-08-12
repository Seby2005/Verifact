# Ghid Pas cu Pas: Cum adaugi o nouă Recapitulare Lunarǎ în Verifact

Acest ghid explică modul simplu prin care poți adăuga o nouă recapitulare lunară (ex. `recapitulare-august-2026`) în aplicația Verifact cu date reale verificate de tine.

---

## Pasul 1: Adaugă metadatele articolului în `src/content/resurse.ts`

Deschide fișierul `src/content/resurse.ts` și adaugă un obiect nou în lista `RESOURCE_ARTICLES`:

```typescript
{
  slug: 'recapitulare-august-2026',
  title: 'Recapitulare lunară — Cele mai virale știri false din August 2026',
  description: 'Sintetizarea și analiza celor mai propagate dezinformări din luna august 2026.',
  category: 'Recapitulare Lunarǎ',
  publishedAt: '2026-09-01',
  readingTime: '6 min',
  author: 'Verifact',
},
```

> **Notă**: Articolul va apărea automat pe pagina de index `/resurse` și va fi inclus automat în `sitemap.xml`!

---

## Pasul 2: Creează folderul și pagina noii recapitulări

1. Creează un folder nou în `src/app/resurse/`:
   `src/app/resurse/recapitulare-august-2026/`
2. Creează fișierul `page.tsx` în interiorul acelui folder:
   `src/app/resurse/recapitulare-august-2026/page.tsx`
3. Opțional: creează fișierul de stiluri `src/app/resurse/recapitulare.module.css` dacă dorești stilizare dedicată pentru carduri.

---

## Pasul 3: Copiază și adaptează șablonul (Template)

Copiază codul de mai jos în fișierul `page.tsx` creat și înlocuiește parantezele cu datele tale reale:

```tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { JsonLd } from '@/components/JsonLd';
import shell from '../../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Recapitulare lunară — Cele mai virale știri false din August 2026 — Verifact',
  description:
    'Sintetizarea și analiza celor mai propagate dezinformări din luna august 2026 pe rețelele sociale din România.',
  openGraph: {
    title: 'Recapitulare lunară — Cele mai virale știri false din August 2026',
    description: 'Top dezinformări demontate în luna august 2026.',
    url: 'https://verifact.ro/resurse/recapitulare-august-2026',
    type: 'article',
  },
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifact.ro';

// Adaugă aici 5-8 cazuri reale verificate
const RECAP_CASES = [
  {
    id: 'cazul-1',
    number: '01',
    title: '[TITLU CAZ REAL 1]',
    claimedText: '[Ce s-a susținut pe rețelele sociale - text real]',
    verdict: 'Probabil fals' as const,
    explanation: '[Explicația factuală bazată pe surse reale]',
    source: '[Numele sursei oficiale / verificabile]',
  },
];

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Recapitulare lunară — Cele mai virale știri false din August 2026',
  description: 'Sintetizarea celor mai virale dezinformări din august 2026.',
  url: `${baseUrl}/resurse/recapitulare-august-2026`,
  datePublished: '2026-09-01',
  inLanguage: 'ro-RO',
  author: { '@type': 'Organization', name: 'Verifact', url: baseUrl },
};

export default function MonthlyRecapAugust2026Page() {
  return (
    <div className={`container ${shell.page}`}>
      <JsonLd data={articleSchema} />
      <header className={shell.head}>
        <p className="eyebrow">Centru de resurse · Recapitulare lunară</p>
        <h1 className={shell.title}>Cele mai virale știri false din August 2026</h1>
        <p className={shell.lead}>Analiza lunară Verifact a falsurilor din luna august 2026.</p>
      </header>

      <div className={shell.body}>
        <Callout label="Despre această recapitulare">
          Analizăm lunar tendințele de dezinformare din România pe baza cazurilor reale verificate.
        </Callout>

        <section aria-label="Lista cazurilor" style={{ marginTop: '2rem', marginBottom: '2.5rem' }}>
          {RECAP_CASES.map((item) => (
            <article key={item.id} style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid var(--color-line)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Cazul {item.number}</span>
                <span>{item.verdict}</span>
              </div>
              <h3>{item.title}</h3>
              <p><strong>Ce s-a susținut: </strong>{item.claimedText}</p>
              <p><strong>Realitatea factuală: </strong>{item.explanation}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>{item.source}</p>
            </article>
          ))}
        </section>

        <section className={shell.sectionRule}>
          <p>
            Vezi și <Link href="/resurse" className={shell.textLink}>Toate resursele Verifact</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
```

După salvare, noua recapitulare va deveni vizibilă pe site cu cazurile tale reale.
