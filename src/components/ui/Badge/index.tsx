import React from 'react';
import styles from './Badge.module.css';

export type VerdictVariant = 'true' | 'false' | 'partial' | 'unclear' | 'primary' | 'secondary' | 'trust';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: VerdictVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const classNames = [
    styles.badge,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...props}>
      {children}
    </span>
  );
};
