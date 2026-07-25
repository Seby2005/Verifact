import {
  Button,
  Input,
  Textarea,
  Card,
  Modal,
  Tabs,
  Callout,
  VerdictLabel,
  verdictFromScore,
} from '@/components/ui';

describe('Design System UI Components', () => {
  it('exports all primitive UI components correctly', () => {
    expect(Button).toBeDefined();
    expect(Input).toBeDefined();
    expect(Textarea).toBeDefined();
    expect(Card).toBeDefined();
    expect(Modal).toBeDefined();
    expect(Tabs).toBeDefined();
    expect(Callout).toBeDefined();
    expect(VerdictLabel).toBeDefined();
  });
});

describe('verdictFromScore', () => {
  // Bands mirror docs/PRD.md §3.2.
  it.each([
    [100, 'true'],
    [85, 'true'],
    [84, 'partial'],
    [60, 'partial'],
    [59, 'unclear'],
    [40, 'unclear'],
    [39, 'false'],
    [0, 'false'],
  ])('maps a score of %i to the %s band', (score, expected) => {
    expect(verdictFromScore(score as number)).toBe(expected);
  });
});
