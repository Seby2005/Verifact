import { getVerdictFromScore, getScoreColor, VERDICTS } from '@/lib/constants/verdicts';

describe('getVerdictFromScore', () => {
  it.each([
    [100, 'true'],
    [85, 'true'],
    [84, 'partial'],
    [60, 'partial'],
    [59, 'unclear'],
    [40, 'unclear'],
    [39, 'false'],
    [0, 'false'],
  ] as const)('score %d -> verdict %s', (score, expectedKey) => {
    expect(getVerdictFromScore(score)).toBe(VERDICTS[expectedKey]);
  });
});

describe('getScoreColor', () => {
  it.each([
    [100, '#16A34A'],
    [85, '#16A34A'],
    [84, '#D97706'],
    [60, '#D97706'],
    [59, '#EA580C'],
    [40, '#EA580C'],
    [39, '#DC2626'],
    [0, '#DC2626'],
  ])('score %d -> color %s', (score, expected) => {
    expect(getScoreColor(score)).toBe(expected);
  });
});

describe('VERDICTS', () => {
  it('has non-overlapping score ranges covering 0-100 across true/partial/unclear/false', () => {
    const ranges = ['true', 'partial', 'unclear', 'false'] as const;
    for (const key of ranges) {
      expect(VERDICTS[key].scoreMin).toBeLessThanOrEqual(VERDICTS[key].scoreMax);
    }
  });
});
