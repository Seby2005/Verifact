'use client';

import React from 'react';
import styles from './Tabs.module.css';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
}

export interface TabsProps<T extends string = string> {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  /** Accessible name for the tablist, e.g. "Tip de conținut de verificat". */
  ariaLabel: string;
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  ariaLabel,
}: TabsProps<T>) {
  // Arrow-key navigation between tabs, per the WAI-ARIA tabs pattern.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const offset = e.key === 'ArrowRight' ? 1 : -1;
    const next = items[(index + offset + items.length) % items.length];
    onChange(next.id);
    const container = e.currentTarget.parentElement;
    const target = container?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[
      (index + offset + items.length) % items.length
    ];
    target?.focus();
  };

  return (
    <div className={styles.tablist} role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            className={[styles.tab, isActive ? styles.tabActive : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
