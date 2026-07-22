'use client';

import React, { useEffect } from 'react';
import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={styles.content}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          {title ? (
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
          ) : <div />}
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Închide dialogul"
          >
            &times;
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};
