'use client';

import dynamic from 'next/dynamic';

// The globe is WebGL and touches the DOM/canvas, so it must never render on the
// server. Loaded client-only with a dark placeholder that matches the console.
const ObservatorConsole = dynamic(
  () => import('./ObservatorConsole').then((m) => m.ObservatorConsole),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 520,
          borderRadius: 16,
          border: '1px solid #212834',
          background: 'radial-gradient(120% 120% at 50% 40%, #12161d 0%, #0a0c11 70%)',
        }}
        aria-label="Se încarcă observatorul…"
      />
    ),
  },
);

export function ObservatorClient() {
  return <ObservatorConsole />;
}
