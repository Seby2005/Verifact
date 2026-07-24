import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  style,
  ...props
}) => {
  const cssVars: Record<string, string> = {};
  if (width !== undefined) {
    cssVars['--skeleton-width'] = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    cssVars['--skeleton-height'] = typeof height === 'number' ? `${height}px` : height;
  }

  const combinedStyle = Object.keys(cssVars).length > 0 || style ? { ...cssVars, ...style } as React.CSSProperties : undefined;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={styles.textGroup} style={combinedStyle} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${styles.skeleton} ${styles.text} ${className}`}
          />
        ))}
      </div>
    );
  }

  const classNames = [
    styles.skeleton,
    styles[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames} style={combinedStyle} {...props} />;
};
