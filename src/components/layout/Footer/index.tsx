'use client';

import React from 'react';
import Link from 'next/link';
import { REPO_URL } from '../routes';
import { useLanguage } from '@/i18n';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  const sections = [
    {
      title: t('footer.sections.product.title'),
      links: [
        { href: '/', label: t('footer.sections.product.verify') },
        { href: '/preturi', label: t('footer.sections.product.pricing') },
        { href: '/cont', label: t('footer.sections.product.account') },
      ],
    },
    {
      title: t('footer.sections.project.title'),
      links: [
        { href: '/despre-dezinformare', label: t('footer.sections.project.disinformation') },
        { href: '/misiune', label: t('footer.sections.project.mission') },
        { href: '/transparenta', label: t('footer.sections.project.transparency') },
        { href: '/open-source', label: t('footer.sections.project.openSource') },
      ],
    },
    {
      title: t('footer.sections.legal.title'),
      links: [
        { href: '/termeni', label: t('footer.sections.legal.terms') },
        { href: '/confidentialitate', label: t('footer.sections.legal.privacy') },
      ],
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <p className={styles.wordmark}>Verifact</p>
            <p className={styles.privacy}>{t('footer.privacy')}</p>
          </div>

          <div className={styles.columns}>
            {sections.map((section) => (
              <nav key={section.title} className={styles.column} aria-label={section.title}>
                <p className={styles.columnTitle}>{section.title}</p>
                <ul className={styles.columnList}>
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={styles.link}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>{t('footer.copyright', { year })}</p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.link}
          >
            {t('footer.repoLink')}
          </a>
        </div>
      </div>
    </footer>
  );
};
