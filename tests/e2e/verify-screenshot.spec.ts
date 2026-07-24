import { test, expect } from '@playwright/test';
import path from 'path';

test('utilizator anonim poate uploada screenshot și primește preview', async ({ page }) => {
  await page.goto('/');

  // Selectează tab Screenshot
  await page.click('[data-testid="tab-screenshot"]');

  // Upload fișier de test (tests/fixtures/test-screenshot.png)
  const fileInput = page.locator('[data-testid="screenshot-input"]');
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'test-screenshot.png');
  await fileInput.setInputFiles(fixturePath);

  // Așteaptă preview
  await expect(page.locator('[data-testid="screenshot-preview"]')).toBeVisible();
});
