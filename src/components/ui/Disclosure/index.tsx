'use client';

import React, { useId, useState } from 'react';
import styles from './Disclosure.module.css';

export interface DisclosureProps {
  summary: string;
  children: React.ReactNode;
  /** Open on first render — for the one item worth showing expanded. */
  defaultOpen?: boolean;
}

/**
 * A single expandable row. Used where content is worth keeping but not worth
 * spending a reader's attention on by default — method limitations, long
 * caveats — so a scanner sees the headings and only pays for the prose they ask
 * for.
 *
 * The panel animates with `grid-template-rows` rather than `height`, which
 * needs no measurement and does not relayout the page on every frame. The
 * content stays in the DOM and is hidden with `visibility` when closed, so it
 * remains findable by in-page search but is skipped by assistive tech.
 */
export const Disclosure: React.FC<DisclosureProps> = ({
  summary,
  children,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={[styles.item, open ? styles.isOpen : ''].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.summary}>{summary}</span>
        <span className={styles.mark} aria-hidden="true" />
      </button>

      {/* The panel stays in the DOM so the row track can animate; `hidden`
          would cut the transition off mid-way. `aria-expanded` on the trigger
          is what actually communicates the state. */}
      <div className={styles.panel} id={panelId} role="region">
        <div className={styles.panelInner}>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </div>
  );
};
