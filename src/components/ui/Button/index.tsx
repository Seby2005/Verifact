import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  tooltipWhenDisabled?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  tooltipWhenDisabled,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const isButtonDisabled = disabled || isLoading;

  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    isLoading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const buttonElement = (
    <button
      className={classNames}
      disabled={isButtonDisabled}
      aria-busy={isLoading}
      aria-disabled={isButtonDisabled}
      {...props}
    >
      {isLoading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : leftIcon ? (
        <span className={styles.iconSlot}>{leftIcon}</span>
      ) : null}

      <span className={styles.label}>{children}</span>

      {!isLoading && rightIcon ? (
        <span className={styles.iconSlot}>{rightIcon}</span>
      ) : null}
    </button>
  );

  if (disabled && tooltipWhenDisabled) {
    return (
      <span className={styles.tooltipWrapper} title={tooltipWhenDisabled}>
        {buttonElement}
      </span>
    );
  }

  return buttonElement;
};
