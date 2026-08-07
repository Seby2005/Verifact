// Flat ESLint config (ESLint 9). Replaces the old .eslintrc.json: `next lint`
// was removed in Next 16, so `npm run lint` calls the ESLint CLI directly.
// eslint-config-next@16 ships native flat configs — its `core-web-vitals` and
// `typescript` entry points mirror the previous
// `extends: ["next/core-web-vitals", "next/typescript"]`. The project overrides
// come last so they win over the shared config's defaults.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import reactHooks from 'eslint-plugin-react-hooks';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Match the previous `next lint` scope (effectively src/). coverage/ is
    // generated output; scripts/, scratch/, and tests/ are standalone tooling
    // (CLI utilities, a k6 load script, Playwright/Jest specs) that run in
    // their own runtimes and legitimately use require()/console — they were
    // never part of the app lint gate.
    ignores: ['coverage/**', 'scripts/**', 'scratch/**', 'tests/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    // New in eslint-plugin-react-hooks@7 (pulled in by eslint-config-next@16).
    // These flag pre-existing, working patterns across several components; kept
    // as warnings so the ESLint 8→9 + Next 14→16 upgrade doesn't turn a security
    // patch into a UI refactor. Addressing them is separate follow-up. The rules
    // must sit in an object that also registers the plugin (flat-config scoping).
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
];

export default config;
