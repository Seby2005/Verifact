// Track C (Chrome extension) shared configuration.
// Mirrors the frozen CONTRACT_v1.md. Update WEBSITE_ORIGIN / API_BASE when the
// real deployment target changes; flip USE_MOCK to false once Track B ships
// src/app/api/v1/verify/route.ts.

export const CONFIG = {
  // Where the website (and therefore the v1 endpoint) lives.
  // The extension reads the Supabase session from this origin's cookies.
  WEBSITE_ORIGIN: 'http://localhost:3000',

  // Base URL for POST /api/v1/verify (Section 1 of the contract).
  API_BASE: 'http://localhost:3000',

  // When true, verify() returns mocked Section 1 responses instead of hitting
  // the network. Set to false once the real endpoint is live.
  USE_MOCK: false,

  // Simulated network latency for mocks (ms).
  MOCK_LATENCY_MS: 850,

  // Supabase project ref (from NEXT_PUBLIC_SUPABASE_URL in .env.local).
  // The browser client stores the session under `sb-<ref>-auth-token`.
  SUPABASE_PROJECT_REF: 'iqszqrilxuqhcnwskxnj',

  // Storage key for the captured auth session (chrome.storage.local).
  AUTH_STORAGE_KEY: 'verifact_auth',
};
