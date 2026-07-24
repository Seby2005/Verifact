import { test, expect } from '@playwright/test';

test('pagina de prețuri afișează abonamentele Free, Pro și Business', async ({ page }) => {
  await page.goto('/pricing');

  // Verifică titlul și cardurile de prețuri
  await expect(page.locator('h1')).toContainText('Alege planul potrivit');
  await expect(page.locator('text=Free')).toBeVisible();
  await expect(page.locator('text=Pro')).toBeVisible();
  await expect(page.locator('text=Business')).toBeVisible();
});
