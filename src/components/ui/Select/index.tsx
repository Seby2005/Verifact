'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selectează...',
  disabled = false,
  fullWidth = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => (prev + 1) % options.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(options.length - 1);
      } else {
        setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const index = options.findIndex((opt) => opt.value === value);
        setFocusedIndex(index >= 0 ? index : 0);
      } else if (focusedIndex >= 0 && focusedIndex < options.length) {
        onChange(options[focusedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const listboxId = `${baseId}-listbox`;
  const labelId = label ? `${baseId}-label` : undefined;

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${fullWidth ? styles.fullWidth : ''} ${className}`}
    >
      {label ? (
        <label id={labelId} className={styles.label}>
          {label}
        </label>
      ) : null}

      <div
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={labelId}
        aria-activedescendant={
          isOpen && focusedIndex >= 0 ? `${baseId}-option-${options[focusedIndex].value}` : undefined
        }
        className={`${styles.trigger} ${isOpen ? styles.open : ''} ${
          disabled ? styles.disabled : ''
        }`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.triggerContent}>
          {selectedOption ? (
            <>
              {selectedOption.icon ? (
                <span className={styles.iconSlot}>{selectedOption.icon}</span>
              ) : null}
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </span>
        <ChevronDown size={18} className={`${styles.arrow} ${isOpen ? styles.rotated : ''}`} />
      </div>

      {isOpen ? (
        <ul id={listboxId} role="listbox" className={styles.dropdown}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;

            return (
              <li
                key={option.value}
                id={`${baseId}-option-${option.value}`}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.selectedOption : ''} ${
                  isFocused ? styles.focusedOption : ''
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <div className={styles.optionContent}>
                  {option.icon ? <span className={styles.iconSlot}>{option.icon}</span> : null}
                  <span>{option.label}</span>
                </div>
                {isSelected ? <Check size={16} className={styles.checkIcon} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};
