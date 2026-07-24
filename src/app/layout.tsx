import type { Metadata } from 'next';

// Inter is self-hosted via @fontsource (not next/font/google): this removes
// a network dependency on fonts.googleapis.com at *build time* (which broke
// builds in network-restricted CI/sandbox environments) and stops the
// browser from making a third-party request to Google Fonts on every page
// load — a small privacy win that fits the project's stated confidentiality
// values (see docs/PRD.md).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import './globals.css';
import { Navbar, Footer } from '@/components/layout';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/i18n';
import { createMetadata } from '@/lib/seo/metadata';
import { APP_NAME, APP_DESCRIPTION } from '@/config/branding';

export const metadata: Metadata = createMetadata({
  title: `${APP_NAME} — Inteligență Artificială pentru Verificarea Știrilor și Faptelor`,
  description: APP_DESCRIPTION,
  path: '/',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <I18nProvider>
          <AuthProvider>
            <Navbar />
            <main style={{ flex: 1 }}>{children}</main>
            <Footer />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
