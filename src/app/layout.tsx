import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html lang="ro" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
