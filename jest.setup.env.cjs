// Unit tests are written to run as if no external provider is configured — the
// same way they run locally with no .env present. CI, however, injects these
// keys as "placeholder" (job-level env in .github/workflows/ci.yml, needed by
// the build step), which flips the "not configured" code paths and makes the
// provider tests (layer2-news, layer3-official, vision) attempt real requests.
//
// Clearing them here gives every test file a clean, deterministic baseline that
// matches local runs; tests that need a key set it explicitly. This affects the
// jest process only — the build step keeps the env from the workflow.
const PROVIDER_KEYS = [
  'GOOGLE_CLOUD_API_KEY',
  'GOOGLE_FACT_CHECK_API_KEY',
  'GOOGLE_CUSTOM_SEARCH_API_KEY',
  'GOOGLE_CUSTOM_SEARCH_ENGINE_ID',
  'GEMINI_API_KEY',
  'TAVILY_API_KEY',
  'NEWS_API_KEY',
];

for (const key of PROVIDER_KEYS) {
  delete process.env[key];
}
