import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

// docs/TASKS.md S4-4: "utilizator nelogat verifică o știre prin text → vede raportul"
test.describe('Text verification (anonymous)', () => {
  test('an anonymous visitor can verify a claim by text and see a report', async ({ page }) => {
    await gotoReady(page, '/');

    // Scoped to the live verify tool, not the page — the homepage also
    // shows a static "Cum arată un raport" example report further down
    // with its own verdict text, which a page-wide text search would
    // match regardless of whether this submission actually worked.
    const tool = page.getByRole('region', { name: 'Verifică o afirmație' });

    await tool
      .getByPlaceholder('Lipește aici textul sau afirmația pe care vrei să o verifici.')
      .fill('Capitala Frantei este orasul Paris, conform surselor oficiale disponibile public.');

    await tool.getByRole('button', { name: 'Verifică acum' }).click();

    // The orchestrator runs 4 search layers (up to 10s each, in parallel)
    // plus a Gemini call — this genuinely takes longer than Playwright's
    // default action timeout, hence the generous window here.
    await expect(tool.getByText(/Probabil adevărat|Parțial adevărat|^Neclar$|Probabil fals/)).toBeVisible({
      timeout: 45_000,
    });

    await expect(tool.getByText('Afirmația verificată')).toBeVisible();
    await expect(tool.getByText('Rezumat')).toBeVisible();
    await expect(tool.getByText(/^Surse/)).toBeVisible();
    await expect(tool.getByRole('button', { name: 'Raportează eroare' })).toBeVisible();
  });

  test('rejects an empty submission with a clear message instead of a silent failure', async ({ page }) => {
    await gotoReady(page, '/');

    const tool = page.getByRole('region', { name: 'Verifică o afirmație' });
    await tool.getByRole('button', { name: 'Verifică acum' }).click();

    await expect(tool.getByText('Introdu conținutul pe care vrei să îl verifici.')).toBeVisible();
  });

  test('rejects text under the 10-character minimum with the server-side error', async ({ page }) => {
    await gotoReady(page, '/');

    const tool = page.getByRole('region', { name: 'Verifică o afirmație' });

    // Short enough to pass the client's only check (non-empty) but fail
    // the server's real minimum-length validation in /api/verify.
    await tool
      .getByPlaceholder('Lipește aici textul sau afirmația pe care vrei să o verifici.')
      .fill('scurt');
    await tool.getByRole('button', { name: 'Verifică acum' }).click();

    await expect(tool.getByText('Textul trebuie sa aiba minim 10 caractere')).toBeVisible({ timeout: 10_000 });
  });
});
