import React from 'react';
import styles from './Badge.module.css';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  HelpCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from '../icons/VerdictIcons';

export type VerdictVariant = 'true' | 'false' | 'partial' | 'unclear' | 'primary' | 'secondary' | 'trust';

const VERDICT_ICONS: Partial<Record<VerdictVariant, React.FC<{ size?: number; className?: string }>>> = {
  true: CheckCircleIcon,
  false: XCircleIcon,
  partial: AlertTriangleIcon,
  unclear: HelpCircleIcon,
  trust: ShieldCheckIcon,
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: VerdictVariant;
  size?: 'sm' | 'md';
  /** Set false to omit the default verdict icon (true/false/partial/unclear/trust show one by default). */
  icon?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'secondary',
  size = 'md',
  icon = true,
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

  const Icon = icon ? VERDICT_ICONS[variant] : undefined;

  return (
    <span className={classNames} {...props}>
      {Icon && <Icon size={size === 'sm' ? 12 : 14} />}
      {children}
    </span>
  );
};
