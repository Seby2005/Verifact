import React, { useId } from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = false,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const containerClasses = [
      styles.container,
      fullWidth ? styles.fullWidth : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses = [
      styles.input,
      error ? styles.hasError : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClasses}>
        {label ? (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
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

Input.displayName = 'Input';
