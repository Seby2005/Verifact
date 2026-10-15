/**
 * Deterministic tests for the claim-extraction GATE. The extraction itself is a
 * model call (covered by the runnable eval at tests/eval/screenshot-extraction.ts,
 * which needs a live key); here we pin the pure decision of *whether* to spend
 * that call, since a wrong gate either wastes latency on clean input or skips
 * cleaning a noisy screenshot.
 */

import { shouldExtractClaim } from '@/lib/ai/claim-extractor';

describe('shouldExtractClaim', () => {
  it('always extracts for screenshots (OCR always drags in UI chrome)', () => {
    expect(shouldExtractClaim('screenshot', 'orice')).toBe(true);
    expect(shouldExtractClaim('screenshot', '')).toBe(true);
  });

  it('never extracts for URL input (the page text is already the claim source)', () => {
    expect(shouldExtractClaim('url', 'https://example.com/a-very-long-article-url-here')).toBe(false);
  });

  it('skips a short, single-line typed claim — it is already clean', () => {
    expect(shouldExtractClaim('text', 'Vaccinurile provoacă autism.')).toBe(false);
  });

  it('extracts when typed text is long (likely a pasted post)', () => {
    const long = 'a'.repeat(221);
    expect(shouldExtractClaim('text', long)).toBe(true);
  });

  it('extracts when typed text is multi-paragraph (2+ line breaks)', () => {
    expect(shouldExtractClaim('text', 'Linia unu\nLinia doi\nLinia trei')).toBe(true);
  });

  it('does not extract for a single line break under the length threshold', () => {
    expect(shouldExtractClaim('text', 'Titlu scurt\nо frază')).toBe(false);
  });

  it('ignores unknown input types', () => {
    expect(shouldExtractClaim('video', 'orice text aici')).toBe(false);
  });
});
