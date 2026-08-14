import { generateDeepDiveAnswer } from '@/lib/ai/deep-dive';
import { POST } from '@/app/api/report/deep-dive/route';
import { getPublicReportById } from '@/lib/verification/public-reports-query';
import type { VerificationReport } from '@/types/verification';

// The route reads the caller through createClient(); the deep-dive answer is
// generated through the same mocked global fetch the LLM module tests use.
const mockCreateClient = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => (mockCreateClient as jest.Mock)(...args),
}));

jest.mock('@/lib/verification/public-reports-query', () => ({
  getPublicReportById: jest.fn(),
}));

const minimalReport: VerificationReport = {
  id: 'r1',
  inputText: 'Afirmație de test pentru verificare',
  inputType: 'text',
  createdAt: '2026-08-15T12:00:00Z',
  verdict: 'partial',
  score: 61,
  confidenceLevel: 'medium',
  executiveSummary: 'Rezumat executiv al raportului de test.',
  scoreBreakdown: {
    finalScore: 61,
    availableLayers: 2,
    weights: { factCheck: 0.35, news: 0.3, official: 0.25, ai: 0.22 },
  },
  sources: [
    {
      title: 'Sursă de test',
      url: 'https://example.com/test',
      publisher: 'exemplu.ro',
      sourceType: 'news',
      relevance: 0.9,
      excerpt: 'Un extras din sursa citată.',
    },
  ],
  isPublic: false,
  language: 'ro',
};

/** Answers a canned model response and records the outgoing request. */
function mockLlmResponse(content: string): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function capturePrompt(fetchMock: jest.Mock): string {
  const [, init] = fetchMock.mock.calls[0] as [string, { body?: string }];
  const body = JSON.parse(init.body ?? '{}') as { messages?: Array<{ content?: string }> };
  return body.messages?.[0]?.content ?? '';
}

interface ChainBuilder {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
}

function buildSupabaseClient(overrides: {
  user?: { id: string; email?: string | null } | null;
  profile?: { tier?: string | null; role?: string | null } | null;
  ownReport?: VerificationReport | null;
  rateLimited?: boolean;
}): Record<string, unknown> {
  const rowFor = (table: string): { data: unknown; error: { message: string } | null } => {
    if (table === 'profiles') {
      return overrides.profile ? { data: overrides.profile, error: null } : { data: null, error: { message: 'PGRST116' } };
    }
    if (table === 'verifications') {
      return overrides.ownReport
        ? { data: { report_json: overrides.ownReport }, error: null }
        : { data: null, error: { message: 'PGRST116' } };
    }
    return { data: null, error: { message: 'unknown table' } };
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: overrides.user ?? null },
        error: null,
      }),
    },
    rpc: jest.fn().mockResolvedValue({
      data: [{ allowed: !overrides.rateLimited, remaining: 30, reset_at: new Date().toISOString() }],
      error: null,
    }),
    // Chainable builder: select(...).eq(...).eq(...).single() — both the
    // profiles read (one .eq) and the verifications read (two .eq) resolve.
    from: jest.fn((table: string) => {
      const chain: ChainBuilder = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        order: jest.fn(() => chain),
        range: jest.fn(() => chain),
        single: jest.fn(() => Promise.resolve(rowFor(table))),
      };
      return chain;
    }),
  };
}

function postJson(body: Record<string, unknown>): Promise<Response> {
  return POST(new Request('http://localhost/api/report/deep-dive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('generateDeepDiveAnswer', () => {
  const ORIGINAL_FETCH = global.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_BASE_URL = 'https://llm.test/v1';
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_BASE_URL;
  });

  it('builds a strict explain_simple prompt and returns the model answer', async () => {
    const fetchMock = mockLlmResponse(
      'Răspuns simplu: afirmația este parțial adevărată. Sursele citate susțin nucleul, dar lipsește context. Verifică sursa https://example.com/test pentru detalii.'
    );
    const { answer } = await generateDeepDiveAnswer({
      report: minimalReport,
      actionType: 'explain_simple',
      locale: 'ro',
    });

    const prompt = capturePrompt(fetchMock);
    expect(prompt).toContain('fără jargon');
    expect(prompt).toContain(minimalReport.inputText);
    expect(prompt).toContain('exemplu.ro'); // the source publisher, not its URL
    expect(prompt).toContain('NU include adrese URL');
    expect(prompt).toContain('română');

    const [, init] = fetchMock.mock.calls[0] as [string, { body?: string }];
    const body = JSON.parse(init.body ?? '{}') as { model?: string };
    expect(body.model).toBe('deepseek/deepseek-chat');
    expect(answer).toContain('parțial adevărată');
  });

  it('includes the manipulation-technique vocabulary only for that action', async () => {
    const fetchMock = mockLlmResponse(
      'Analiza textului: postarea folosește titlu senzaționalist și apel la emoție pentru a amplifica reacția publicului.'
    );
    await generateDeepDiveAnswer({ report: minimalReport, actionType: 'manipulation_techniques', locale: 'ro' });
    const prompt = capturePrompt(fetchMock);
    expect(prompt).toContain('ad hominem');
    expect(prompt).toContain('cherry-picking');
  });

  it('passes the custom question through into the prompt', async () => {
    const fetchMock = mockLlmResponse(
      'Nu există dovezi în raport care să răspundă la această întrebare. Ar fi necesară o sursă oficială despre subiect.'
    );
    await generateDeepDiveAnswer({
      report: minimalReport,
      actionType: 'custom_question',
      customQuestion: 'Cine a publicat prima dată această afirmație?',
      locale: 'ro',
    });
    expect(capturePrompt(fetchMock)).toContain('Cine a publicat prima dată această afirmație?');
  });

  it('strips hallucinated URLs but keeps URLs present in the report sources', async () => {
    mockLlmResponse(
      'Concluzia se bazează pe sursa https://example.com/test, nu pe cea din https://fabricated.example/clickbait care nu există în raport.'
    );
    const { answer } = await generateDeepDiveAnswer({
      report: minimalReport,
      actionType: 'counter_arguments',
      locale: 'ro',
    });
    expect(answer).toContain('https://example.com/test');
    expect(answer).not.toContain('fabricated.example');
  });

  it('normalizes cedilla diacritics (ş→ș, ţ→ț) in the answer', async () => {
    mockLlmResponse(
      'Concluzia este ca informaţia circula şi pe retele sociale inainte de verificare, fara dovezi solide prezentate.'
    );
    const { answer } = await generateDeepDiveAnswer({
      report: minimalReport,
      actionType: 'explain_simple',
      locale: 'ro',
    });
    // cedilla forms are rewritten to comma-below; missing diacritics are not invented
    expect(answer).toContain('și');
    expect(answer).not.toContain('şi');
    expect(answer).toContain('informația');
    expect(answer).not.toContain('informaţia');
  });

  it('rejects when the provider returns an empty answer', async () => {
    mockLlmResponse('');
    await expect(
      generateDeepDiveAnswer({ report: minimalReport, actionType: 'explain_simple', locale: 'ro' })
    ).rejects.toThrow(/empty or too-short/);
  });
});

describe('POST /api/report/deep-dive', () => {
  const ORIGINAL_FETCH = global.fetch;

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_BASE_URL;
    jest.clearAllMocks();
  });

  it('rejects an unknown actionType with 400', async () => {
    mockCreateClient.mockReturnValue(buildSupabaseClient({}));
    const res = await postJson({ reportId: 'r1', actionType: 'bogus_action' });
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated callers with 401', async () => {
    mockCreateClient.mockReturnValue(buildSupabaseClient({ user: null }));
    const res = await postJson({ reportId: 'r1', actionType: 'explain_simple' });
    expect(res.status).toBe(401);
  });

  it('rejects free-tier callers with 403 and requiresUpgrade', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    mockCreateClient.mockReturnValue(
      buildSupabaseClient({ user: { id: 'u1', email: 'free@test.ro' }, profile: { tier: 'free', role: 'user' } })
    );
    const res = await postJson({ reportId: 'r1', actionType: 'explain_simple' });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { requiresUpgrade?: boolean };
    expect(body.requiresUpgrade).toBe(true);
  });

  it('answers for a Pro caller on their own report', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_BASE_URL = 'https://llm.test/v1';
    mockLlmResponse(
      'Răspuns de test: afirmația este susținută parțial de sursele citate, dar contextul lipsește din raport.'
    );
    mockCreateClient.mockReturnValue(
      buildSupabaseClient({
        user: { id: 'u1', email: 'pro@test.ro' },
        profile: { tier: 'pro', role: 'user' },
        ownReport: minimalReport,
      })
    );

    const res = await postJson({ reportId: minimalReport.id, actionType: 'explain_simple' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success?: boolean; answer?: string; actionType?: string };
    expect(body.success).toBe(true);
    expect(body.answer).toContain('susținută parțial');
    expect(body.actionType).toBe('explain_simple');
  });

  it('lets admins through even with a free tier (unlimited)', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_BASE_URL = 'https://llm.test/v1';
    mockLlmResponse(
      'Răspuns de admin: afirmația nu prezintă tehnici de manipulare detectabile în sursele citate.'
    );
    mockCreateClient.mockReturnValue(
      buildSupabaseClient({
        user: { id: 'u1', email: 'admin@test.ro' },
        profile: { tier: 'free', role: 'admin' },
        ownReport: minimalReport,
      })
    );

    const res = await postJson({ reportId: minimalReport.id, actionType: 'manipulation_techniques' });
    expect(res.status).toBe(200);
  });

  it('returns 404 when the report is neither owned nor public', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    mockCreateClient.mockReturnValue(
      buildSupabaseClient({ user: { id: 'u1', email: 'pro@test.ro' }, profile: { tier: 'pro', role: 'user' } })
    );
    (getPublicReportById as jest.Mock).mockResolvedValue(null);

    const res = await postJson({ reportId: 'missing-id', actionType: 'explain_simple' });
    expect(res.status).toBe(404);
  });

  it('answers on a public report for any Pro caller', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_BASE_URL = 'https://llm.test/v1';
    mockLlmResponse(
      'Răspuns de test pentru un raport public: concluzia raportului este corect susținută de sursele citate.'
    );
    mockCreateClient.mockReturnValue(
      buildSupabaseClient({ user: { id: 'u2', email: 'pro2@test.ro' }, profile: { tier: 'pro', role: 'user' } })
    );
    (getPublicReportById as jest.Mock).mockResolvedValue({
      id: minimalReport.id,
      reportJson: minimalReport,
    });

    const res = await postJson({ reportId: minimalReport.id, actionType: 'explain_simple' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer?: string };
    expect(body.answer).toContain('corect susținută');
  });
});
