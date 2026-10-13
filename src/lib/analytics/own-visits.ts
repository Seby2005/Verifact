/**
 * Keeps the team's own browsing out of the visit statistics.
 *
 * A browser is marked once (opening any admin page does it) and from then on
 * neither tracker counts it: Umami reads this very key by itself, and the
 * Vercel Analytics wrapper asks `isOwnBrowser()` before sending anything. The
 * mark lives in that browser's storage, so each device and each browser the
 * team uses has to open an admin page once.
 *
 * Both calls are safe anywhere: on the server, or where storage is blocked,
 * marking does nothing and the browser reads as a regular visitor.
 */

// Umami's documented opt-out key; do not rename.
const KEY = 'umami.disabled';

export function markOwnBrowser(): void {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    // No storage (server render, private mode): the visit is counted as usual.
  }
}

export function isOwnBrowser(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
