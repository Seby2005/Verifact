import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

/**
 * docs/TASKS.md S4-4: "utilizator se înregistrează cu email → confirmare →
 * login → dashboard". The "confirmare" step (clicking the link in a real
 * confirmation email) needs a real inbox and isn't reachable from a
 * self-contained Playwright test, and there is no /dashboard route in this
 * app yet (see docs/ARCHITECTURE.md's plan vs. the routes that actually
 * exist under src/app) — this covers what's reachable end-to-end without
 * that infrastructure: registration reaching the "check your email" state,
 * and the login form's real success/error paths.
 *
 * Needs a real Supabase project (the one configured in .env.local) —
 * see playwright.config.ts's top comment for why this isn't run in CI.
 */
test.describe('Authentication', () => {
  // Note: Supabase applies its own signup rate limit per IP regardless of
  // how unique each test's generated email is — running this test
  // repeatedly in a short window (e.g. while iterating locally) can fail
  // with "email rate limit exceeded" from Supabase itself. That's real
  // signal from the auth provider, not a bug in the app or this test.
  test('registering with a new email reaches the "check your email" state', async ({ page }) => {
    await gotoReady(page, '/cont');

    await page.getByRole('tab', { name: 'Creează cont' }).click();

    const uniqueEmail = `verifact.e2e.${Date.now()}@example.com`;
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Parolă').fill('TestParola123!');
    await page.getByRole('button', { name: 'Creează cont' }).click();

    await expect(page.getByText('Gata')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/verifică-ți emailul/i)).toBeVisible();
  });

  test('logging in with the wrong password shows an error, not a silent failure', async ({ page }) => {
    await gotoReady(page, '/cont');

    // Login is the default tab.
    await page.getByLabel('Email').fill(`nonexistent.${Date.now()}@example.com`);
    await page.getByLabel('Parolă').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Intră în cont' }).click();

    await expect(page.getByText('Nu a funcționat')).toBeVisible({ timeout: 15_000 });
  });

  test('switching between login and signup tabs clears any previous status message', async ({ page }) => {
    await gotoReady(page, '/cont');

    await page.getByLabel('Email').fill(`nonexistent.${Date.now()}@example.com`);
    await page.getByLabel('Parolă').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Intră în cont' }).click();
    await expect(page.getByText('Nu a funcționat')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('tab', { name: 'Creează cont' }).click();

    await expect(page.getByText('Nu a funcționat')).not.toBeVisible();
  });

  test('the password field enforces an 8-character minimum', async ({ page }) => {
    await gotoReady(page, '/cont');
    await page.getByRole('tab', { name: 'Creează cont' }).click();

    await expect(page.getByLabel('Parolă')).toHaveAttribute('minlength', '8');
  });
});
