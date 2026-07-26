import type { Page } from '@playwright/test';

/**
 * Navigates and waits for the page to be genuinely interactive before the
 * test starts clicking things. `page.goto()`'s default 'load' wait fires
 * once resources are fetched, which can land before React has hydrated —
 * a click on a real <form>'s type="submit" button before its onSubmit
 * handler is attached falls through to the browser's native GET
 * submission (a full page reload back to the same pristine form), which
 * silently no-ops every assertion that follows instead of failing loudly.
 * 'networkidle' additionally waits for the JS chunks that do the
 * hydrating to finish loading.
 */
export async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'networkidle' });
}
