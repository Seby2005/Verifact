import React from 'react';
import styles from './Avatar.module.css';

export interface AvatarProps {
  name: string; // User name or email
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PRESET_COLORS = [
  '#2563EB', // Blue
  '#16A34A', // Green
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#0891B2', // Cyan
  '#EA580C', // Orange
];

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

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_COLORS.length;
  return PRESET_COLORS[index];
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  className = '',
}) => {
  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  return (
    <div
      className={`${styles.avatar} ${styles[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
      aria-label={`Avatar pentru ${name}`}
      role="img"
    >
      <span className={styles.initials}>{initials}</span>
    </div>
  );
};
