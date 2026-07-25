import React from 'react';
import styles from './Callout.module.css';

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small uppercase label above the text, e.g. "NOTĂ" or "DISCLAIMER". */
  label?: string;
  /** "quote" sets the body in serif (default); "plain" keeps it in sans. */
  tone?: 'quote' | 'plain';
  children: React.ReactNode;
}

export const Callout: React.FC<CalloutProps> = ({
  label,
  tone = 'quote',
  children,
  className = '',
  ...props
}) => {
  const classNames = [styles.callout, tone === 'plain' ? styles.plain : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <div className={styles.body}>{children}</div>
    </div>
  );
};
