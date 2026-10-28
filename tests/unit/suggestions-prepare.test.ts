import type { Candidate } from '@/lib/examples/trending';
import { getCandidates } from '@/lib/examples/trending';
import { verifyContent } from '@/lib/verification/orchestrator';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { prepareSuggestions } from '@/lib/examples/prepare';

jest.mock('@/lib/examples/trending', () => ({ getCandidates: jest.fn() }));
jest.mock('@/lib/verification/orchestrator', () => ({ verifyContent: jest.fn() }));
jest.mock('@/lib/utils/rate-limit', () => ({ checkRateLimit: jest.fn() }));

const mockCandidates = getCandidates as jest.MockedFunction<typeof getCandidates>;
const mockVerify = verifyContent as jest.MockedFunction<typeof verifyContent>;
const mockAttempt = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

function lineUp(statuses: Array<Candidate['status']>): Candidate[] {
  return statuses.map((status, i) => ({ text: `Afirmația numărul ${i + 1} de verificat`, status }));
}

/** The claims the job verified, per language. */
function verifiedTexts(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [input] of mockVerify.mock.calls) {
    (out[input.language] ??= []).push(input.text);
  }
  return out;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAttempt.mockResolvedValue({ success: true, remaining: 1, reset: 0 });
  mockVerify.mockResolvedValue({ verdict: 'false' } as Awaited<ReturnType<typeof verifyContent>>);
});

describe('prepareSuggestions', () => {
  it('verifies the first claims not done yet, in the order they will be shown', async () => {
    mockCandidates.mockImplementation(async (locale) =>
      locale === 'ro' ? lineUp(['clear', 'unclear', 'unchecked', 'unchecked', 'unchecked']) : []
    );

    const report = await prepareSuggestions();

    expect(verifiedTexts().ro).toEqual(['Afirmația numărul 3 de verificat', 'Afirmația numărul 4 de verificat']);
    expect(mockVerify.mock.calls[0][0]).toMatchObject({ language: 'ro', inputType: 'text', isPublic: false });
    expect(report.ro).toEqual({ verified: 2, failed: 0, ready: 3 });
  });

  it('spends nothing once a full row is ready', async () => {
    mockCandidates.mockResolvedValue(lineUp(['clear', 'clear', 'clear', 'unchecked']));

    await prepareSuggestions();

    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('skips a claim already tried twice today and moves on to the next', async () => {
    mockCandidates.mockImplementation(async (locale) =>
      locale === 'ro' ? lineUp(['clear', 'clear', 'unchecked', 'unchecked']) : []
    );
    mockAttempt.mockResolvedValueOnce({ success: false, remaining: 0, reset: 0 });

    await prepareSuggestions();

    expect(verifiedTexts().ro).toEqual(['Afirmația numărul 4 de verificat']);
  });

  it('reports a failed verification without failing the run', async () => {
    mockCandidates.mockImplementation(async (locale) => (locale === 'en' ? lineUp(['unchecked', 'unchecked']) : []));
    mockVerify.mockRejectedValueOnce(new Error('ALL_LAYERS_FAILED'));

    const report = await prepareSuggestions();

    expect(report.en).toEqual({ verified: 1, failed: 1, ready: 1 });
  });
});
