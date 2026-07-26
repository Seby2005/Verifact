import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the flows in docs/TASKS.md S4-4. Runs against a local dev
 * server it starts itself (webServer below), using whatever env vars are
 * already configured in .env.local — Next.js loads that file automatically.
 *
 * Not wired into .github/workflows/ci.yml on purpose: CI's env only has
 * placeholder Supabase/API keys (no real backend to register a user
 * against, no real search/AI providers), so the auth and tier-limit specs
 * specifically cannot pass there. These are meant to run locally (or in a
 * future CI job pointed at a real test Supabase project + real API keys)
 * via `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
