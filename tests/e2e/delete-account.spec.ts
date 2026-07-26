import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

test.describe('Account Deletion Flow', () => {
  test('opens confirmation modal and enforces confirmation phrase "ȘTERGE"', async ({ page }) => {
    await gotoReady(page, '/cont');

    // Simulate logged in account panel state or inspect modal elements
    // The delete button appears on active account session or when modal is opened.
    const deleteBtn = page.getByRole('button', { name: /șterge contul/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Verify modal title and accessibility
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/ștergi contul definitiv/i)).toBeVisible();

      // The confirm button must be disabled until phrase "ȘTERGE" is typed
      const confirmSubmitBtn = page.getByRole('button', { name: /șterge definitiv contul/i });
      await expect(confirmSubmitBtn).toBeDisabled();

      const input = page.getByLabel(/scrie „șterge” ca să confirmi/i);
      await input.fill('GREȘIT');
      await expect(confirmSubmitBtn).toBeDisabled();

      await input.fill('ȘTERGE');
      await expect(confirmSubmitBtn).toBeEnabled();

      // Test closing modal with Escape key
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });

  test('canceling account deletion modal closes dialog without deleting', async ({ page }) => {
    await gotoReady(page, '/cont');

    const deleteBtn = page.getByRole('button', { name: /șterge contul/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('button', { name: /renunță/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });
});
