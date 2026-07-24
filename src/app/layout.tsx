import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { Navbar, Footer } from '@/components/layout';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/i18n';
import { createMetadata } from '@/lib/seo/metadata';
import { APP_NAME, APP_DESCRIPTION } from '@/config/branding';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

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
    <html lang="ro" className={inter.className}>
      <body className="app-body">
        <I18nProvider>
          <AuthProvider>
            <Navbar />
            <main className="app-main">{children}</main>
            <Footer />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
