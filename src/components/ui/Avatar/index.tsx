import React from 'react';
import styles from './Avatar.module.css';

export interface AvatarProps {
  name: string; // User name or email
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLOR_COUNT = 7;

function getInitials(name: string): string {
  if (!name) return 'U';
  const clean = name.trim();
  if (clean.includes('@')) {
    return clean.substring(0, 2).toUpperCase();
  }
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase();
}

function getColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLOR_COUNT;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  className = '',
}) => {
  const initials = getInitials(name);
  const colorIndex = getColorIndex(name);
  const colorClass = styles[`color${colorIndex}`] || styles.color0;

  return (
    <div
      className={`${styles.avatar} ${styles[size]} ${colorClass} ${className}`}
      aria-label={`Avatar pentru ${name}`}
      role="img"
    >
      <span className={styles.initials}>{initials}</span>
    </div>
  );
};
