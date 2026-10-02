import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Verifact mobile shell (Capacitor).
 *
 * Hybrid design: the app bundles a tiny local bootstrap (`www/index.html`) whose
 * only job is to read an incoming Android/iOS *share* (ACTION_SEND / Share
 * Extension) and then hand control to the live website, pre-filling the claim:
 *
 *     https://verifact.ro/?text=<shared text>
 *
 * The website's VerifyTool already reads `?text=` / `?claim=` / `?q=` and
 * pre-fills the box, so no web-app change is needed — the mobile shell is the
 * only new surface. We deliberately do NOT set `server.url` to the remote site:
 * bundling a local origin lets the Capacitor bridge + send-intent plugin run so
 * we can capture the share before navigating out.
 */
const config: CapacitorConfig = {
  appId: 'ro.verifact.app',
  appName: 'Verifact',
  webDir: 'www',
  server: {
    // Local assets are served over https:// on Android so the subsequent
    // navigation to the https website is not a mixed-content downgrade.
    androidScheme: 'https',
  },
};

export default config;
