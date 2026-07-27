/** Key the visitor's explicit choice is stored under. */
export const THEME_KEY = 'verifact-theme';

export type Theme = 'light' | 'dark';

/**
 * Runs in <head> before first paint. It resolves the theme to an explicit
 * `data-theme` attribute — a stored choice if there is one, otherwise the
 * system preference — so the stylesheet only ever needs a single dark block
 * and the page never flashes the wrong theme on load.
 *
 * Deliberately dependency-free and wrapped in try/catch: localStorage throws
 * in some privacy modes, and a theme is never worth breaking the page over.
 */
export const THEME_SCRIPT = `(function(){try{
var s=localStorage.getItem('${THEME_KEY}');
var d=s==='dark'||(s!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.setAttribute('data-theme',d?'dark':'light');
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
