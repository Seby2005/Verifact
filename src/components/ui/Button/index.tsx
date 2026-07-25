import React from 'react';
import styles from './Button.module.css';

interface ButtonOwnProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

export type ButtonProps = ButtonOwnProps &
  (
    | ({ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
    | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  );

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  children,
  className = '',
  ...props
}) => {
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

  const content = (
    <>
      {isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={isLoading ? styles.hiddenText : styles.text}>{children}</span>
    </>
  );

  if ('href' in props && props.href !== undefined) {
    const { href, ...anchorProps } = props as { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={classNames} {...anchorProps}>
        {content}
      </a>
    );
  }

  const { disabled, ...buttonProps } = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      className={classNames}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...buttonProps}
    >
      {content}
    </button>
  );
};
