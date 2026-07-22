import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'AI Fact-Checker — Verifică știrile cu inteligență artificială',
  description:
    'Aplicație open source de verificare a știrilor și conținutului de pe rețelele sociale, folosind inteligență artificială. Upload screenshot sau text și primești un raport detaliat.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
