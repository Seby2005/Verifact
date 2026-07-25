import React, { useId } from 'react';
import inputStyles from '../Input/Input.module.css';
import styles from './Textarea.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, fullWidth = false, className = '', id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    const containerClasses = [
      inputStyles.container,
      fullWidth ? inputStyles.fullWidth : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const textareaClasses = [inputStyles.input, styles.textarea, error ? inputStyles.hasError : '']
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClasses}>
        {label ? (
          <label htmlFor={textareaId} className={inputStyles.label}>
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        />
        {error ? (
          <span id={errorId} className={inputStyles.errorText} role="alert">
            {error}
          </span>
        ) : helperText ? (
          <span id={helperId} className={inputStyles.helperText}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
