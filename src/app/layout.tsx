import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';

import { Header, Footer } from '@/components/layout';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-source-serif',
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
    <html lang="ro" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className={inter.className}>
        <div className="app-shell">
          <Header />
          <main className="app-shell__main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
