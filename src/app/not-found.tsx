'use client';

import { Button } from '@/components/ui';
import { useLanguage } from '@/i18n';
import styles from './not-found.module.css';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className={styles.wrap}>
      <span className={styles.code}>{t('notFound.code')}</span>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p className={styles.lead}>{t('notFound.lead')}</p>
      <Button href="/" variant="primary" size="lg">
        {t('notFound.back')}
      </Button>
    </div>
  );
}
