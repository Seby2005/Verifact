import React, { useId } from 'react';
import styles from './Textarea.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; // Label for accessibility
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  characterCount?: {
    current: number;
    max: number;
  };
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = false,
      characterCount,
      className = '',
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    const containerClasses = [
      styles.container,
      fullWidth ? styles.fullWidth : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const textareaClasses = [
      styles.textarea,
      error ? styles.hasError : '',
      disabled ? styles.disabled : '',
    ]
      .filter(Boolean)
      .join(' ');

    const isNearLimit =
      characterCount && characterCount.current >= characterCount.max * 0.9;

    return (
      <div className={containerClasses}>
        <div className={styles.labelRow}>
          <label htmlFor={textareaId} className={styles.label}>
            {label}
          </label>
          {characterCount ? (
            <span
              className={`${styles.charCounter} ${
                isNearLimit ? styles.nearLimit : ''
              }`}
            >
              {characterCount.current}/{characterCount.max}
            </span>
          ) : null}
        </div>

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={textareaClasses}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          {...props}
        />

        {error ? (
          <span id={errorId} className={styles.errorText} role="alert">
            {error}
          </span>
        ) : helperText ? (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
