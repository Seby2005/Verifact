'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import styles from './Turnstile.module.css';

export interface TurnstileRef {
  reset: () => void;
}

export interface TurnstileProps {
  siteKey?: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  onVerify: (token: string) => void;
  onError?: (error?: string) => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          action?: string;
          theme?: string;
          size?: string;
          'refresh-expired'?: string;
          retry?: string;
          callback?: (token: string) => void;
          'error-callback'?: (error?: string) => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  (
    {
      siteKey: propSiteKey,
      action = 'verify',
      theme = 'auto',
      size = 'normal',
      onVerify,
      onError,
      onExpire,
      className,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const siteKey = propSiteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    const onVerifyRef = useRef(onVerify);
    const onErrorRef = useRef(onError);
    const onExpireRef = useRef(onExpire);

    useEffect(() => {
      onVerifyRef.current = onVerify;
      onErrorRef.current = onError;
      onExpireRef.current = onExpire;
    });

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      if (!siteKey) {
        return;
      }

      let isMounted = true;

      const renderWidget = () => {
        if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action,
            theme,
            size,
            'refresh-expired': 'auto',
            retry: 'auto',
            callback: (token: string) => {
              if (isMounted) {
                onVerifyRef.current?.(token);
              }
            },
            'error-callback': (err?: string) => {
              if (isMounted) {
                onErrorRef.current?.(err);
              }
            },
            'expired-callback': () => {
              if (isMounted) {
                onExpireRef.current?.();
              }
            },
          });
          widgetIdRef.current = id;
          if (isMounted) setIsLoaded(true);
        } catch (e) {
          if (isMounted && onErrorRef.current) {
            onErrorRef.current(e instanceof Error ? e.message : 'Turnstile render failed');
          }
        }
      };

      if (window.turnstile) {
        renderWidget();
      } else {
        const existingScript = document.querySelector('script[src*="turnstile/v0/api.js"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) renderWidget();
          };
          script.onerror = () => {
            if (isMounted && onErrorRef.current) {
              onErrorRef.current('Nu s-a putut încărca serviciul de verificare anti-bot.');
            }
          };
          document.head.appendChild(script);
        } else {
          const interval = setInterval(() => {
            if (window.turnstile) {
              clearInterval(interval);
              if (isMounted) renderWidget();
            }
          }, 100);
          return () => clearInterval(interval);
        }
      }

      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore teardown errors
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, action, theme, size]);

    if (!siteKey) {
      return null;
    }

    return (
      <div className={`${styles.container} ${className ?? ''}`.trim()}>
        <div ref={containerRef} className={styles.widget} />
      </div>
    );
  }
);

Turnstile.displayName = 'Turnstile';
