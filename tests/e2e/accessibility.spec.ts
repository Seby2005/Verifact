import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoReady } from './helpers';

/**
 * docs/TASKS.md's accessibility pass: axe-core scan of the main pages,
 * failing on critical/serious violations (moderate/minor are logged but
 * don't fail the run — see the threshold note below).
 */
const PAGES = ['/', '/cont', '/despre-dezinformare', '/preturi', '/transparenta', '/misiune', '/open-source'];

test.describe('Accessibility (axe-core)', () => {
  for (const path of PAGES) {
    test(`${path} has no critical/serious axe violations`, async ({ page }) => {
      await gotoReady(page, path);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (blocking.length > 0) {
        const details = blocking
          .map(
            (v) =>
              `\n[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))\n  ${v.nodes
                .map((n) => n.target.join(' '))
                .join('\n  ')}`
          )
          .join('\n');
        throw new Error(`Accessibility violations on ${path}:${details}`);
      }

      // Moderate/minor findings are worth knowing about even though they
      // don't fail the build — surfaced in the test output for visibility.
      const nonBlocking = results.violations.filter(
        (v) => v.impact === 'moderate' || v.impact === 'minor'
      );
      if (nonBlocking.length > 0) {
        console.log(
          `[a11y] ${path}: ${nonBlocking.length} non-blocking (moderate/minor) finding(s): ` +
            nonBlocking.map((v) => v.id).join(', ')
        );
      }

      expect(blocking).toEqual([]);
    });
  }

  test('the skip-to-content link is the first focusable element and moves focus to <main>', async ({ page }) => {
    await gotoReady(page, '/');

    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveText('Sari la conținut');

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
