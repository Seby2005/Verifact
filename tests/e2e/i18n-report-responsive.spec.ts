import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

test.describe('i18n Dynamic Language Switching & Mobile Responsiveness', () => {
  test('switches language dynamically between RO and EN without page reload on public pages', async ({
    page,
  }) => {
    await gotoReady(page, '/misiune');

    // Verify initial Romanian heading
    const initialHeading = page.locator('h1');
    await expect(initialHeading).toBeVisible();
    await expect(initialHeading).toContainText(/Misiune|Gândire critică|Verifact/i);

    // Click language toggle button
    const langToggle = page.locator('button[aria-haspopup="true"][aria-label*="RO"], button[aria-haspopup="true"]').first();
    await langToggle.click();

    // Select English from menu
    const enOption = page.locator('button[role="menuitem"]:has-text("English")');
    await expect(enOption).toBeVisible();
    await enOption.click();

    // After switching to EN, page heading should reactively update to English without page reload
    await expect(initialHeading).toContainText(/Mission|Critical Thinking|About/i);

    // Check nav links adapted to English
    const homeNavLink = page.locator('nav a[href="/"]').first();
    await expect(homeNavLink).toHaveText('Home');
  });

  test('maintains zero horizontal overflow on mobile viewport (375px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoReady(page, '/');

    // Check horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('maintains zero horizontal overflow on desktop viewport (1440px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoReady(page, '/');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
