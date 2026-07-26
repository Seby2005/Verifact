import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

// A minimal valid 1x1 transparent PNG, built inline so this test doesn't
// depend on a fixture file on disk.
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

// docs/TASKS.md S4-4: "utilizator nelogat uploadează screenshot → text extras → verificare"
test.describe('Screenshot verification (anonymous)', () => {
  test('an anonymous visitor can upload a screenshot and reach a terminal state', async ({ page }) => {
    await gotoReady(page, '/');

    const tool = page.getByRole('region', { name: 'Verifică o afirmație' });
    await tool.getByRole('tab', { name: 'Screenshot' }).click();

    await tool
      .locator('input[type="file"]')
      .setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: ONE_PIXEL_PNG });

    await expect(tool.getByText('Fișier selectat: screenshot.png')).toBeVisible();

    await tool.getByRole('button', { name: 'Verifică acum' }).click();

    // A blank 1x1 image has no text to extract, so this deterministically
    // ends in an error state regardless of whether real Vision/search/AI
    // credentials are configured in this environment (see this file's
    // comment in playwright.config.ts) — the point of this test is that
    // the upload → OCR → error path completes and surfaces *something* to
    // the user, rather than hanging or crashing silently.
    await expect(tool.getByText(/Eroare|Momentan indisponibil/)).toBeVisible({ timeout: 30_000 });
  });

  test('validates file type on the client before any upload happens', async ({ page }) => {
    await gotoReady(page, '/');

    const tool = page.getByRole('region', { name: 'Verifică o afirmație' });
    await tool.getByRole('tab', { name: 'Screenshot' }).click();

    await expect(tool.getByText('Alege o imagine sau trage-o aici')).toBeVisible();
    await expect(tool.locator('input[type="file"]')).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');
  });
});
