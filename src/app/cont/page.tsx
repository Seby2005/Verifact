'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPanel } from '@/components/auth';
import { DashboardView } from '@/components/dashboard';
import { Callout } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

interface UserSession {
  id: string;
  email: string | null;
}

function ContContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') === 'oauth_failed';

  const [session, setSession] = useState<UserSession | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSession({ id: data.user.id, email: data.user.email ?? null });
      } else {
        setSession(null);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.user) {
        setSession({ id: newSession.user.id, email: newSession.user.email ?? null });
      } else {
        setSession(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Initial loading state
  if (session === undefined) {
    return (
      <div className={`container ${shell.page}`}>
        <header className={shell.head}>
          <p className="eyebrow">{t('contPage.eyebrow')}</p>
          <h1 className={shell.title}>{t('contPage.title')}</h1>
          <p className={shell.lead}>{t('contPage.lead')}</p>
        </header>
        <div className={shell.body}>
          <div
            style={{
              height: '320px',
              background: 'var(--color-surface)',
              border: 'var(--border-width-hairline) solid var(--color-line)',
              borderRadius: 'var(--radius-lg)',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        </div>
      </div>
    );
  }

  // Authenticated Dashboard View
  if (session) {
    return (
      <div className={`container ${shell.page}`}>
        <header className={shell.head}>
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h1 className={shell.title}>{t('dashboard.title')}</h1>
          <p className={shell.lead}>{t('dashboard.lead')}</p>
        </header>

        <div className={shell.body}>
          <DashboardView user={session} onSignOut={() => setSession(null)} />
        </div>
      </div>
    );
  }

  // Unauthenticated Auth View
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('contPage.eyebrow')}</p>
        <h1 className={shell.title}>{t('contPage.title')}</h1>
        <p className={shell.lead}>{t('contPage.lead')}</p>
      </header>

      <div className={shell.body}>
        <div className={styles.layout}>
          <div className={styles.formSide}>
            {oauthError && (
              <Callout label={t('contPage.oauthError.label')} tone="plain">
                {t('contPage.oauthError.message')}
              </Callout>
            )}
            <AuthPanel />
          </div>

          <aside className={styles.aside}>
            <h2 className={styles.asideTitle}>{t('contPage.aside.title')}</h2>
            <ul className={styles.asideList}>
              <li className={styles.asideItem}>
                <span>
                  <strong className={styles.asideStrong}>
                    {t('contPage.aside.bullet1Strong')}
                  </strong>
                  {t('contPage.aside.bullet1Text')}
                </span>
              </li>
              <li className={styles.asideItem}>
                <span>
                  <strong className={styles.asideStrong}>
                    {t('contPage.aside.bullet2Strong')}
                  </strong>
                  {t('contPage.aside.bullet2Text')}
                </span>
              </li>
              <li className={styles.asideItem}>
                <span>
                  <strong className={styles.asideStrong}>
                    {t('contPage.aside.bullet3Strong')}
                  </strong>
                  {t('contPage.aside.bullet3Text')}
                </span>
              </li>
              <li className={styles.asideItem}>
                <span>
                  <strong className={styles.asideStrong}>
                    {t('contPage.aside.bullet4Strong')}
                  </strong>
                  {t('contPage.aside.bullet4Text')}
                </span>
              </li>
            </ul>
            <p className={styles.asideNote}>
              {t('contPage.aside.noteText')}
              <a href="/open-source" className={styles.textLink}>
                {t('contPage.aside.noteLink')}
              </a>
              .
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function ContPage() {
  return (
    <Suspense fallback={null}>
      <ContContent />
    </Suspense>
  );
}
