import type { Metadata } from 'next';
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

import { Header, Footer } from '@/components/layout';
import './globals.css';

// Sans — carries the interface and the headlines.
const hanken = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
  display: 'swap',
});

// Serif accent — the claim under review, pull-quotes, the wordmark.
// Only the two weights the design actually uses: 400 for quoted text and the
// italic hero accent, 700 for the wordmark. 500 and 600 were being downloaded
// and never referenced, and 700 was referenced without being downloaded, which
// left the wordmark faux-bolded by the browser on every page.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Mono — scores, timestamps, data labels ("instrument" figures).
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Verifact — Verificare independentă a informației',
    template: '%s — Verifact',
  },
  description:
    'Verifact verifică afirmații, articole și postări din social media pe baza unor surse publice verificabile. Algoritm open source, surse citate integral, rapoarte private.',
  openGraph: {
    title: 'Verifact — Verificare independentă a informației',
    description:
      'Verifact verifică afirmații, articole și postări din social media pe baza unor surse publice verificabile.',
    siteName: 'Verifact',
    locale: 'ro_RO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verifact — Verificare independentă a informației',
    description:
      'Verifact verifică afirmații, articole și postări din social media pe baza unor surse publice verificabile.',
  },
  other: {
    google: 'notranslate',
  },
};

import { LanguageProvider } from '@/i18n';
import { ToastProvider } from '@/components/ui';
import { THEME_SCRIPT } from '@/components/layout/ThemeToggle/theme-script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ro"
      translate="no"
      className={`${hanken.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="google" content="notranslate" />
        {/* Resolves the theme before first paint, so the page never flashes
            the wrong one. Runs ahead of hydration and is deliberately tiny;
            THEME_SCRIPT is a constant string, never user input. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <LanguageProvider>
          <ToastProvider>
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
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

