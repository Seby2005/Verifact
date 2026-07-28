import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import RapoarteClient from './RapoarteClient';

export const metadata: Metadata = {
  title: 'Rapoarte Publicate | Verifact',
  description:
    'Rapoartele publicate de comunitatea Verifact și istoricul verificărilor tale.',
  openGraph: {
    title: 'Rapoarte Publicate — Verifact',
    description:
      'Rapoartele publicate de comunitatea Verifact și istoricul verificărilor tale.',
    siteName: 'Verifact',
    locale: 'ro_RO',
    type: 'website',
  },
};

export default function RapoartePage() {
  return (
    <Suspense fallback={null}>
      <RapoarteClient />
    </Suspense>
  );
}
