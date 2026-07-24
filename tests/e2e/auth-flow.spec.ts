import { test, expect } from '@playwright/test';

test('utilizatorul se poate naviga la register și login', async ({ page }) => {
  // 1. Navighează la register
  await page.goto('/register');

  // 2. Verifică prezența formularului de înregistrare
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();

  // 3. Navighează la login
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
