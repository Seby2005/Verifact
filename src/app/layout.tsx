import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

import { Header, Footer } from '@/components/layout';
import './globals.css';

// Sans — carries the interface and body copy. Self-hosted (Fontshare).
const generalSans = localFont({
  src: [
    { path: './fonts/generalsans-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/generalsans-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/generalsans-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/generalsans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-general',
  display: 'swap',
});

// Serif display — headlines, the claim under review, pull-quotes. Self-hosted.
const zodiak = localFont({
  src: [
    { path: './fonts/zodiak-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/zodiak-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-zodiak',
  display: 'swap',
});

// Logo serif — the bracket wordmark only. Self-hosted.
const boska = localFont({
  src: [
    { path: './fonts/boska-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/boska-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-boska',
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro'),
  alternates: {
    canonical: './',
  },
  title: {
    default: 'Verifact — Verificare independentă a informației',
    template: '%s — Verifact',
  },
  description:
    'Verifact verifică afirmații, articole și postări din social media pe baza unor surse publice verificabile. Algoritm open source, surse citate integral, rapoarte private.',
  keywords: [
    'verificare stiri',
    'fact checker romania',
    'verificare informatie',
    'fake news romania',
    'dezinformare',
    'verifact',
    'inteligenta artificiala',
    'fact checking AI',
  ],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo/verifact-v-logo-red.svg', type: 'image/svg+xml' },
      { url: '/logo/verifact-v-logo-red.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo/verifact-v-logo-red.png',
  },
  openGraph: {
    title: 'Verifact — Verificare independentă a informației',
    description:
      'Verifact verifică afirmații, articole și postări din social media pe baza unor surse publice verificabile.',
    siteName: 'Verifact',
    locale: 'ro_RO',
    type: 'website',
    url: '/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Verifact — Verificare independentă a informației',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verifact — Verificare independentă a informației',
    description:
      'Verifact verifică afirmații, articole și postări din social media pe baza unor surse publice verificabile.',
    images: ['/og-image.png'],
  },
};

import { LanguageProvider } from '@/i18n';
import { ToastProvider } from '@/components/ui';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { THEME_SCRIPT } from '@/components/layout/ThemeToggle/theme-script';
import { JsonLd } from '@/components/JsonLd';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Verifact',
  url: 'https://www.verifact.ro',
  logo: 'https://www.verifact.ro/logo/verifact-v-logo-transparent.png',
  sameAs: [],
};

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Verifact',
  url: 'https://www.verifact.ro',
  inLanguage: 'ro-RO',
};

const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Verifact',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro',
  applicationCategory: 'FactCheckingApplication',
  operatingSystem: 'All',
  description:
    'Platformă AI independentă de verificare a știrilor și informațiilor din mediul online.',
  inLanguage: 'ro-RO',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'RON',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ro"
      suppressHydrationWarning
      className={`${generalSans.variable} ${zodiak.variable} ${boska.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <JsonLd data={[organizationSchema, webSiteSchema, webApplicationSchema]} />
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
            <FeedbackWidget />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

