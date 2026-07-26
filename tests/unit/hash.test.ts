import { createContentHash } from '@/lib/utils/hash';

describe('createContentHash', () => {
  it('produces a 64-character hex SHA-256 digest', () => {
    const hash = createContentHash('Some claim text', 'ro');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same input', () => {
    const a = createContentHash('Pământul este plat.', 'ro');
    const b = createContentHash('Pământul este plat.', 'ro');
    expect(a).toBe(b);
  });

  it('is case-insensitive', () => {
    const a = createContentHash('Pământul Este Plat', 'ro');
    const b = createContentHash('pământul este plat', 'ro');
    expect(a).toBe(b);
  });

  it('ignores leading/trailing whitespace', () => {
    const a = createContentHash('  claim text  ', 'ro');
    const b = createContentHash('claim text', 'ro');
    expect(a).toBe(b);
  });

  it('collapses internal whitespace runs', () => {
    const a = createContentHash('claim    text\n\nwith   gaps', 'ro');
    const b = createContentHash('claim text with gaps', 'ro');
    expect(a).toBe(b);
  });

  it('ignores diacritics', () => {
    const a = createContentHash('Pământul este plat', 'ro');
    const b = createContentHash('Pamantul este plat', 'ro');
    expect(a).toBe(b);
  });

  it('produces different hashes for different text', () => {
    const a = createContentHash('Claim A', 'ro');
    const b = createContentHash('Claim B', 'ro');
    expect(a).not.toBe(b);
  });

  it('produces different hashes for different languages, same text', () => {
    const a = createContentHash('same text', 'ro');
    const b = createContentHash('same text', 'en');
    expect(a).not.toBe(b);
  });
});
