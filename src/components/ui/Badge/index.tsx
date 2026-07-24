import React from 'react';
import { CheckCircle, AlertTriangle, HelpCircle, XCircle, Info } from 'lucide-react';
import { VERDICTS, VerdictKey } from '@/lib/constants/verdicts';
import styles from './Badge.module.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: VerdictKey;
  size?: 'sm' | 'lg';
  children?: React.ReactNode;
}

const ICON_MAP = {
  CheckCircle: CheckCircle,
  AlertTriangle: AlertTriangle,
  HelpCircle: HelpCircle,
  XCircle: XCircle,
  Info: Info,
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  className = '',
  ...props
}) => {
  const config = VERDICTS[variant] || VERDICTS.neutral;
  const IconComponent = ICON_MAP[config.iconName] || Info;

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
      <IconComponent className={styles.icon} aria-hidden="true" />
      <span>{children || config.defaultLabelRo}</span>
    </span>
  );
};
