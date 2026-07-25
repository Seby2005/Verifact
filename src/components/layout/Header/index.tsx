import React from 'react';
import Link from 'next/link';
import { ShieldCheckIcon } from '../../ui/icons/VerdictIcons';
import styles from './Header.module.css';

const REPO_URL = 'https://github.com/Seby2005/fact-checker-ai';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <ShieldCheckIcon size={22} className={styles.brandMark} />
          <span className={styles.brandName}>AI Fact-Checker</span>
        </Link>

        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          className={styles.repoLink}
        >
          Open Source pe GitHub
        </a>
      </div>
    </header>
  );
};
