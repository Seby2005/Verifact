import { createHash } from 'crypto';

/**
 * Creates a normalized SHA-256 hash of text content for cache lookups.
 * Normalizes: lowercase, trim, remove diacritics, collapse whitespace.
 */
export function createContentHash(text: string, language: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove diacritics
    .replace(/\s+/g, ' ');

  return createHash('sha256')
    .update(`${normalized}:${language}`)
    .digest('hex');
}
