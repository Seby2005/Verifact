// Mocked responses for POST /api/v1/verify (CONTRACT_v1.md, Section 1).
// Used until Track B ships src/app/api/v1/verify/route.ts (CONFIG.USE_MOCK).
//
// Shapes are kept byte-for-byte compatible with the contract so the popup
// renders real and mocked responses identically:
//   success: { success:true, report: VerificationReport, usage:{...} }
//   error:   { success:false, error:"<human msg>", code:"<CODE>" }

// --- helpers ---------------------------------------------------------------

function nextMonthReset() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return next.toISOString();
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// --- a faithful VerificationReport (mirrors src/types/verification.ts) ------

function buildReport(payload, auth) {
  const text = (payload.text || '').slice(0, 2000);
  const verdict = 'false';
  const score = 23;
  const createdAt = new Date().toISOString();

  return {
    id: uuid(),
    claim: text,
    inputText: text,
    verifiedClaim: text,
    inputType: payload.inputType || 'text',
    userId: auth?.user?.id,
    verdict,
    score,
    confidenceLevel: 'high',
    riskLevel: 'high',
    keyTakeaways: [
      'No reputable fact-checker has reviewed this exact claim.',
      'Coverage across mainstream news outlets is contradictory and thin.',
      'One official source partially contradicts the core assertion.',
    ],
    processingTimeMs: 4120,
    processingTime: 4.12,
    executiveSummary:
      'Verificarea acestei afirmații indică o credibilitate scăzută. Sursele ' +
      'fact-checking nu au o verificare directă, iar articolele de presă ' +
      'disponibile sunt contradictorii. O sursă oficială parțial contradictorie ' +
      'reduce și mai mult încrederea în afirmație.',
    aiAnalysis: {
      summary:
        'Analiza AI sugerează că afirmația este cel mai probabil falsă, cu ' +
        'dovezi slabe de susținere și semnale de manipulare emoțională.',
      scoreAdjustment: -4,
    },
    disclaimer:
      'Verifact oferă o estimare automată, nu o decizie editorială finală.',
    layers: {
      layer1: {
        status: 'done',
        results: [
          {
            title: 'Claim not found in major fact-check databases',
            publisher: 'Google Fact Check',
            publisherUrl: 'https://toolbox.google.com/factcheck/explorer',
            rating: 'No match',
            ratingValue: 0,
            claimReviewed: text,
            relevanceScore: 0.31,
          },
        ],
        summary: 'No direct fact-check match; low relevance hits only.',
        layerScore: 0.15,
        processingTime: 0.9,
      },
      layer2: {
        status: 'done',
        results: [
          {
            title: 'Conflicting coverage found in regional outlets',
            source: 'Regional News Wire',
            sourceUrl: 'https://example.com/regional-coverage',
            articleUrl: 'https://example.com/regional-coverage',
            publishedAt: '2026-08-12T09:00:00.000Z',
            snippet:
              'Reportajele indică poziții opuse ale surselor citate, fără ' +
              'consens asupra faptelor centrale.',
            credibilityScore: 0.42,
            sentiment: 'contradicts',
          },
        ],
        summary: 'News coverage is thin and contradictory.',
        layerScore: 0.4,
        sourcesChecked: 18,
        processingTime: 1.6,
      },
      layer3: {
        status: 'done',
        results: [
          {
            title: 'Official agency statement partially contradicts claim',
            publisher: 'Government Press Office',
            organization: 'Government Press Office',
            organizationType: 'government',
            documentUrl: 'https://example.com/official-statement',
            publishedAt: '2026-08-10T14:30:00.000Z',
            snippet: 'Poziția oficială diferă pe aspectul central invocat.',
            relevantQuote: 'Datele oficiale nu susțin afirmația în forma prezentată.',
            relevanceScore: 0.66,
            supportsOrDenies: 'denies',
          },
        ],
        summary: 'One official source partially denies the claim.',
        layerScore: 0.55,
        processingTime: 0.8,
      },
      layer4: {
        status: 'done',
        results: [
          {
            platform: 'twitter',
            author: 'Anonymous account',
            authorVerified: false,
            postUrl: 'https://x.com/example/status/1',
            postDate: '2026-08-13T19:20:00.000Z',
            content: 'Post viral cu emotivitate ridicată, fără surse.',
            isOriginalSource: false,
          },
        ],
        summary: 'Social posts are unverified and emotionally charged.',
        layerScore: 0.2,
        processingTime: 0.5,
      },
      factCheck: undefined,
      news: undefined,
      official: undefined,
      social: undefined,
    },
    layer1: undefined,
    layer2: undefined,
    layer3: undefined,
    layer4: undefined,
    scoreBreakdown: {
      finalScore: score,
      availableLayers: 4,
      layer1Score: 0.15,
      layer2Score: 0.4,
      layer3Score: 0.55,
      layer4Score: 0.2,
      weights: { factCheck: 0.3, news: 0.3, official: 0.25, social: 0.15 },
      adjustedForAvailability: true,
    },
    sources: [
      {
        title: 'Official agency statement partially contradicts claim',
        publisher: 'Government Press Office',
        url: 'https://example.com/official-statement',
        sourceType: 'official',
        supports: false,
        relevance: 0.66,
        tier: 1,
        excerpt: 'Datele oficiale nu susțin afirmația în forma prezentată.',
      },
      {
        title: 'Conflicting coverage found in regional outlets',
        publisher: 'Regional News Wire',
        url: 'https://example.com/regional-coverage',
        sourceType: 'news',
        supports: null,
        relevance: 0.42,
        tier: 2,
        excerpt: 'Reportajele indică poziții opuse ale surselor citate.',
      },
    ],
    createdAt,
    isPublic: Boolean(payload.isPublic),
    language: payload.language || 'unknown',
    fromCache: false,
    aiAvailable: true,
  };
}

// --- the mock resolver -----------------------------------------------------

// Sentinel phrases let developers exercise each contract error code without a
// backend. Prefix the text (or use inputType url + "BAD_URL") to trigger.
const SENTINELS = {
  '@err_input_invalid': { status: 400, code: 'INPUT_INVALID', message: 'Text must be between 10 and 2000 characters.' },
  '@err_auth': { status: 401, code: 'AUTH_INVALID', message: 'The supplied Bearer token is invalid, expired, or revoked.' },
  '@err_forbidden': { status: 403, code: 'FORBIDDEN', message: 'This token is not permitted to use /api/v1/verify.' },
  '@err_rate_limit': { status: 429, code: 'RATE_LIMIT', message: 'Too many requests. Please slow down and retry shortly.' },
  '@err_server': { status: 500, code: 'SERVER_ERROR', message: 'Internal verification failure. Please try again.' },
  '@err_layers': { status: 502, code: 'ALL_LAYERS_FAILED', message: 'All verification sources were unreachable.' },
  '@err_usage_limit': null, // handled below (anonymous vs authed message)
  '@err_url_unreadable': { status: 422, code: 'URL_UNREADABLE', message: 'The URL could not be fetched or read.' },
};

export function mockVerify(payload, auth) {
  const body = payload || {};
  const inputType = body.inputType || 'text';
  const text = typeof body.text === 'string' ? body.text : '';

  // Sentinel-driven errors take precedence (so each code is testable without a
  // backend). The usage-limit one is handled after auth, below.
  for (const trigger of Object.keys(SENTINELS)) {
    if (text.includes(trigger) && trigger !== '@err_usage_limit') {
      const e = SENTINELS[trigger];
      return { status: e.status, data: { success: false, error: e.message, code: e.code } };
    }
  }

  // 400 INPUT_INVALID — missing/short text (unless url), or bad URL format.
  if (inputType !== 'url' && text.trim().length < 10) {
    return {
      status: 400,
      data: { success: false, error: 'Text must be between 10 and 2000 characters.', code: 'INPUT_INVALID' },
    };
  }
  if (inputType === 'url') {
    let urlOk = false;
    try { urlOk = Boolean(new URL(text)); } catch { urlOk = false; }
    if (!urlOk) {
      return {
        status: 400,
        data: { success: false, error: 'A valid URL is required for inputType "url".', code: 'INPUT_INVALID' },
      };
    }
  }

  // 403 USAGE_LIMIT — anonymous names the number ("3 free checks");
  // Pro/Business is number-free (existing product rule).
  if (text.includes('@err_usage_limit')) {
    if (auth?.accessToken) {
      return {
        status: 403,
        data: { success: false, error: 'Your monthly verification limit has been reached.', code: 'USAGE_LIMIT' },
      };
    }
    return {
      status: 403,
      data: {
        success: false,
        error: 'You have used all 3 free checks this period. Log in for your plan limit.',
        code: 'USAGE_LIMIT',
      },
    };
  }

  // 200 success.
  const authed = Boolean(auth?.accessToken);
  const report = buildReport(body, auth);
  const usage = authed
    ? { tier: auth.user?.tier === 'business' ? 'business' : 'pro', remaining: 34, resetsAt: nextMonthReset() }
    : { tier: 'free', remaining: null, resetsAt: null };

  return { status: 200, data: { success: true, report, usage } };
}
