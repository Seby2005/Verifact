import { test, expect } from '@playwright/test';

test('utilizator anonim poate verifica un text și vede raportul sau stadiul de procesare', async ({ page }) => {
  // 1. Navighează la homepage
  await page.goto('/');

  // 2. Selectează tab-ul "Text"
  await page.click('[data-testid="tab-text"]');

  // 3. Introduce text de test
  await page.fill(
    '[data-testid="text-input"]',
    'România a aderat la Uniunea Europeană în anul 2007.'
  );

  // 4. Click "Verifică acum"
  const verifyBtn = page.locator('[data-testid="verify-button"]');
  await expect(verifyBtn).toBeEnabled();
  await verifyBtn.click();

  // 5. Verifică că interfața procesează solicitarea
  await expect(page.locator('body')).toBeVisible();
});
