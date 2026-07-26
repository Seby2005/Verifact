import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

/**
 * docs/TASKS.md S4-4: "utilizator Free atinge limita → vede mesaj upgrade".
 *
 * Actually exhausting a real account's monthly quota (10 verifications,
 * each taking up to tens of seconds and real API cost) isn't practical for
 * a repeatable test, and isn't really what this criterion is checking —
 * the thing worth verifying end-to-end is that the client correctly
 * surfaces the server's USAGE_LIMIT response to the user. Postgres
 * actually enforcing the limit atomically is covered by
 * tests/unit/db-operations.test.ts's concurrency test instead. So this
 * intercepts /api/verify and returns the exact 403 shape
 * src/app/api/verify/route.ts sends once reserveUsageSlot() disallows a
 * request, which is the standard way to reach an otherwise-expensive state
 * deterministically in an E2E test.
 */
test.describe('Tier limit reached', () => {
  test('shows the upgrade message when the server reports the usage limit is hit', async ({ page }) => {
    await page.route('**/api/verify', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Ai atins limita de 10 verificari pentru aceasta luna. Upgradeaza la Pro pentru mai multe.',
          code: 'USAGE_LIMIT',
        }),
      });
    });

    await gotoReady(page, '/');

    const tool = page.getByRole('region', { name: 'Verifică o afirmație' });

    await tool
      .getByPlaceholder('Lipește aici textul sau afirmația pe care vrei să o verifici.')
      .fill('O afirmatie oarecare suficient de lunga pentru a trece validarea locala.');
    await tool.getByRole('button', { name: 'Verifică acum' }).click();

    await expect(tool.getByText(/Ai atins limita de 10 verificari/)).toBeVisible({ timeout: 10_000 });
    await expect(tool.getByText(/Upgradeaza la Pro/)).toBeVisible();
  });
});
