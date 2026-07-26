import type { Metadata } from 'next';
import { Newsreader, IBM_Plex_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

import { Header, Footer } from '@/components/layout';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
  adjustFontFallback: false,
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Verifact — Verificare independentă a informației',
    template: '%s — Verifact',
  },
  description:
    'Verifact verifică afirmații, articole și postări din social media pe baza unor surse publice verificabile. Algoritm open source, surse citate integral, rapoarte private.',
  other: {
    google: 'notranslate',
  },
};

import { LanguageProvider } from '@/i18n';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" translate="no" className={`${newsreader.variable} ${plexSans.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>
        <LanguageProvider>
          <a href="#main-content" className="skip-link">
            Sari la conținut
          </a>
          <div className="app-shell">
            <Header />
            <main id="main-content" className="app-shell__main" tabIndex={-1}>
              {children}
            </main>
            <Footer />
          </div>
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  );
}

