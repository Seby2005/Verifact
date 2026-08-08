'use client';

import React from 'react';
import { ResetPasswordForm } from '@/components/auth';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  const { t } = useLanguage();

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('auth.resetPassword.eyebrow')}</p>
        <h1 className={shell.title}>{t('auth.resetPassword.title')}</h1>
        <p className={shell.lead}>{t('auth.resetPassword.lead')}</p>
      </header>

      <div className={shell.body}>
        <div className={styles.wrap}>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
