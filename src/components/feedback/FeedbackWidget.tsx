'use client';

import Script from 'next/script';

/**
 * Loads the self-hosted Formbricks in-app survey SDK — but only when it's
 * configured. With NEXT_PUBLIC_FORMBRICKS_APP_URL / _ENVIRONMENT_ID unset this
 * renders nothing and adds no script, so mounting it in the root layout is a
 * zero-cost no-op until you actually stand Formbricks up.
 *
 * Note: the Formbricks init call has drifted across versions (`setup` on
 * current 2.x, `init` on older builds). This uses `setup`; if your instance is
 * older, swap the call — see docs/tools/formbricks.md.
 *
 * CSP: the Formbricks origin must be allowed in script-src + connect-src. That
 * is derived automatically from NEXT_PUBLIC_FORMBRICKS_APP_URL in next.config.mjs.
 */
export function FeedbackWidget() {
  const appUrl = process.env.NEXT_PUBLIC_FORMBRICKS_APP_URL;
  const environmentId = process.env.NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID;

  if (!appUrl || !environmentId) return null;

  const base = appUrl.replace(/\/+$/, '');

  return (
    <Script
      id="formbricks"
      src={`${base}/js/formbricks.umd.cjs`}
      strategy="afterInteractive"
      onLoad={() => {
        // @ts-expect-error — injected by the Formbricks UMD bundle at runtime.
        window.formbricks?.setup({ environmentId, appUrl: base });
      }}
    />
  );
}
