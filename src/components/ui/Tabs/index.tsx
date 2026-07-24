'use client';

import React, { useId, useRef } from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTabId,
  onChange,
  className = '',
}) => {
  const baseId = useId();
  const tabListRef = useRef<HTMLDivElement>(null);

  const activeIndex = items.findIndex((item) => item.id === activeTabId);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % items.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = items.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTabId = items[nextIndex].id;
      onChange(nextTabId);

      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  const activeItem = items.find((item) => item.id === activeTabId) || items[0];

  return (
    <div className={`${styles.tabsContainer} ${className}`}>
      <div
        ref={tabListRef}
        className={styles.tabList}
        role="tablist"
        aria-orientation="horizontal"
      >
        {items.map((item, index) => {
          const isSelected = item.id === activeTabId;
          const tabId = `${baseId}-tab-${item.id}`;
          const panelId = `${baseId}-panel-${item.id}`;

          return (
            <button
              key={item.id}
              id={tabId}
              type="button"
              className={`${styles.tabButton} ${isSelected ? styles.selected : ''}`}
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {item.icon ? <span className={styles.iconSlot}>{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Animated active indicator */}
        <div
          className={styles.indicator}
          style={{
            width: `${100 / (items.length || 1)}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      </div>

      <div
        id={`${baseId}-panel-${activeItem.id}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeItem.id}`}
        tabIndex={0}
        className={styles.tabPanel}
      >
        {activeItem.content}
      </div>
    </div>
  );
};
