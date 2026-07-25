import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const CheckCircleIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...base} width={size} height={size} className={className} aria-hidden="true">
    <circle cx="10" cy="10" r="7.5" />
    <path d="M6.75 10.25l2 2 4.5-4.75" />
  </svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...base} width={size} height={size} className={className} aria-hidden="true">
    <path d="M10 3.5l7.5 13h-15l7.5-13z" />
    <path d="M10 8.25v3.25" />
    <circle cx="10" cy="14" r="0.1" fill="currentColor" stroke="none" />
  </svg>
);

export const HelpCircleIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...base} width={size} height={size} className={className} aria-hidden="true">
    <circle cx="10" cy="10" r="7.5" />
    <path d="M7.75 8a2.25 2.25 0 1 1 3.4 1.94c-.72.42-1.15.86-1.15 1.81" />
    <circle cx="10" cy="14" r="0.1" fill="currentColor" stroke="none" />
  </svg>
);

export const XCircleIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...base} width={size} height={size} className={className} aria-hidden="true">
    <circle cx="10" cy="10" r="7.5" />
    <path d="M7.5 7.5l5 5m0-5l-5 5" />
  </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg {...base} width={size} height={size} className={className} aria-hidden="true">
    <path d="M10 2.75l6 2.25v4.3c0 4.05-2.55 6.85-6 8.2-3.45-1.35-6-4.15-6-8.2v-4.3l6-2.25z" />
    <path d="M7.25 9.75l1.85 1.85 3.65-4" />
  </svg>
);
