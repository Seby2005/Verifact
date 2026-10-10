import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportView } from '@/components/verify/ReportView';
import { LanguageProvider, FixedLocaleProvider } from '@/i18n';
import type { VerificationReport } from '@/types/verification';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// next/font is a build-time transform; outside Next it has no runtime export.
jest.mock('next/font/google', () => ({
  Onest: () => ({ style: { fontFamily: 'Onest' } }),
}));

const mockReport: VerificationReport = {
  id: 'test-report-123',
  claim: 'Armata a închis granițele naționale în această dimineață.',
  verifiedClaim: 'Armata a închis granițele naționale.',
  posterCommentary: 'Uitați ce ne ascund autoritățile!',
  inputText: 'Uitați ce ne ascund autoritățile! Armata a închis granițele naționale.',
  inputType: 'text',
  createdAt: new Date().toISOString(),
  isPublic: false,
  language: 'ro',
  verdict: 'false',
  evidenceStatus: 'contradicted',
  score: 15,
  confidenceLevel: 'high',
  executiveSummary: 'Toate punctele de trecere a frontierei funcționează în regim normal.',
  criticalThinkingPrompt: 'Iată ce spun sursele, iată ce lipsește, decide tu pe baza dovezilor.',
  keyTakeaways: [
    'Afirmația este contrazisă de sursele oficiale, documentele publice sau fact-checkeri.',
    'Au fost identificate 2 surse de înaltă autoritate.',
  ],
  sources: [
    {
      title: 'Poliția de Frontieră dezminte închiderea granițelor',
      url: 'https://politiadefrontiera.ro/comunicat-granite',
      publisher: 'Poliția de Frontieră',
      sourceType: 'official',
      tier: 1,
      supports: false,
      relevance: 0.95,
      excerpt: 'Traficul prin toate punctele de trecere a frontierei se desfășoară normal, fără nicio restricție.',
    },
    {
      title: 'Zvon fals pe TikTok despre închiderea granițelor României',
      url: 'https://factual.ro/verificare-granite-tiktok',
      publisher: 'Factual.ro',
      sourceType: 'fact_check',
      tier: 1,
      supports: false,
      relevance: 0.92,
      excerpt: 'Clipul viral prezintă imagini de arhivă din 2020.',
    },
  ],
  scoreBreakdown: {
    finalScore: 15,
    availableLayers: 3,
    weights: { factCheck: 0.35, news: 0.3, official: 0.25, social: 0.1 },
  },
};

describe('ReportView Clean Layout & Polish', () => {
  it('renders clean top bar, clear claim, and separated commentary without emoji clutter', () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <ReportView report={mockReport} />
      </LanguageProvider>
    );

    // The core claim is prominently displayed
    expect(html).toContain('“Armata a închis granițele naționale.”');
    // The poster commentary is separated out
    expect(html).toContain('Uitați ce ne ascund autoritățile!');
    // No emoji clutter
    expect(html).not.toContain('💡');
    // Clean signal verdict
    expect(html).toContain('Contrazis de sursele oficiale / presă');
    expect(html).toContain('15%');
  });

  it('renders takeaways without duplicate titles in Romanian', () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <ReportView report={mockReport} />
      </LanguageProvider>
    );

    expect(html).toContain('Idei cheie');
    expect(html).toContain('Afirmația este contrazisă de sursele oficiale');
  });

  it('renders rich sources with tier badges and direct links', () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <ReportView report={mockReport} />
      </LanguageProvider>
    );

    expect(html).toContain('Poliția de Frontieră');
    expect(html).toContain('Factual.ro');
    expect(html).toContain('Tier 1: Sursă de Încredere / Fact-Checker');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
  });

  it('dynamically adapts report copy when switching language to English without reload', () => {
    const htmlEn = renderToStaticMarkup(
      <FixedLocaleProvider locale="en">
        <ReportView report={mockReport} />
      </FixedLocaleProvider>
    );

    expect(htmlEn).toContain('Contradicted by documented facts');
    expect(htmlEn).toContain('Key takeaways');
    expect(htmlEn).toContain('Tier 1: Trusted Source / Fact-Checker');
    expect(htmlEn).not.toContain('💡');
  });

  it('dynamically adapts report copy when switching language to French', () => {
    const htmlFr = renderToStaticMarkup(
      <FixedLocaleProvider locale="fr">
        <ReportView report={mockReport} />
      </FixedLocaleProvider>
    );

    expect(htmlFr).toContain('Contredit par les faits documentés');
    expect(htmlFr).toContain('Points clés');
    expect(htmlFr).toContain('Tier 1 : Source de Confiance / Fact-Checker');
    expect(htmlFr).not.toContain('💡');
  });
});
