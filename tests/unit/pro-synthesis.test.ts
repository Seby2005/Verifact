import {
  buildFallbackSynthesis,
  synthesisFromReport,
  synthesizeReport,
} from '@/lib/ai/report-synthesis';
import type { VerificationReport, CombinedSource } from '@/types/verification';

const mockSources: CombinedSource[] = [
  {
    title: 'Guvernul a clarificat bugetul pentru infrastructură',
    publisher: 'Gov.ro',
    url: 'https://gov.ro/comunicat-123',
    sourceType: 'official',
    tier: 1,
    relevance: 0.95,
    supports: true,
    excerpt: 'Bugetul a fost aprobat conform normelor în vigoare.',
    date: '2026-08-01',
  },
  {
    title: 'Declarații contradictorii privind fondurile',
    publisher: 'Știri Verificate',
    url: 'https://stiri.ro/articol-456',
    sourceType: 'news',
    tier: 2,
    relevance: 0.8,
    supports: false,
    excerpt: 'Nu există documente justificative pentru sumele vehiculate pe TikTok.',
    date: '2026-08-02',
  },
];

const mockReport: VerificationReport = {
  id: 'rep-test-pro-1',
  inputText: 'S-au furat 500 de milioane de euro din fonduri europene conform postării virale.',
  verifiedClaim: '500 de milioane de euro au fost deturnate din fonduri europene',
  posterCommentary: 'Uitați ce fac politicienii noștri!',
  inputType: 'text',
  language: 'ro',
  verdict: 'false',
  score: 18,
  confidenceLevel: 'high',
  executiveSummary: 'Afirmația este falsă. Fondurile menționate nu au fost alocate și nu există nicio probă.',
  keyTakeaways: ['Suma vehiculată este inventată', 'Nu există anchete pe acest subiect'],
  scoreBreakdown: {
    finalScore: 18,
    availableLayers: 3,
    weights: { factCheck: 0.35, news: 0.3, official: 0.25, social: 0.1 },
  },
  sources: mockSources,
  createdAt: '2026-08-10T10:00:00Z',
  isPublic: false,
};

describe('Pro Report Synthesis', () => {
  describe('buildFallbackSynthesis', () => {
    it('generates complete ProReportSynthesis structure in Romanian', () => {
      const synthesis = buildFallbackSynthesis(mockReport, mockSources, 'ro');

      expect(synthesis.verdictRationale).toBeTruthy();
      expect(synthesis.whatToRemember.length).toBeGreaterThan(0);

      // Cross-source analysis
      expect(synthesis.crossSourceAnalysis).toBeDefined();
      expect(synthesis.crossSourceAnalysis.comparisonMatrix.length).toBe(2);
      expect(synthesis.crossSourceAnalysis.comparisonMatrix[0].sourceName).toBe('Gov.ro');
      expect(synthesis.crossSourceAnalysis.comparisonMatrix[0].stance).toBe('confirms');
      expect(synthesis.crossSourceAnalysis.comparisonMatrix[1].stance).toBe('contradicts');

      // Sub-claims breakdown
      expect(synthesis.subClaims.length).toBeGreaterThan(0);
      expect(synthesis.subClaims[0].verdict).toBe('false');
      expect(synthesis.subClaims[0].subClaim).toContain('500 de milioane');

      // Source insights
      expect(synthesis.sourceInsights.length).toBe(2);
      expect(synthesis.sourceInsights[0].publisher).toBe('Gov.ro');
      expect(synthesis.sourceInsights[0].stance).toBe('confirmă');
      expect(synthesis.sourceInsights[0].directQuote).toBe('Bugetul a fost aprobat conform normelor în vigoare.');

      // Manipulation analysis
      expect(synthesis.manipulationAnalysis.detected).toBe(true);
      expect(synthesis.manipulationAnalysis.techniques.length).toBeGreaterThan(0);

      // Narrative & Impact
      expect(synthesis.narrativeAndImpact.originAndPropagation).toBeTruthy();
      expect(synthesis.narrativeAndImpact.motiveAssessment).toBeTruthy();
      expect(synthesis.narrativeAndImpact.publicImpact).toBeTruthy();

      // Investigator Toolkit
      expect(synthesis.investigatorToolkit.missingEvidence.length).toBeGreaterThan(0);
      expect(synthesis.investigatorToolkit.foiaRecommendations.length).toBeGreaterThan(0);
      expect(synthesis.investigatorToolkit.journalistFaq.length).toBeGreaterThan(0);

      // Sharer Commentary
      expect(synthesis.commentaryAssessment).toBeDefined();
    });

    it('generates English synthesis when locale is en', () => {
      const synthesis = buildFallbackSynthesis(mockReport, mockSources, 'en');
      expect(synthesis.sourceInsights[0].stance).toBe('confirms');
      expect(synthesis.sourceInsights[1].stance).toBe('contradicts');
      expect(synthesis.investigatorToolkit.journalistFaq[0].question).toContain('What');
    });

    it('generates French synthesis when locale is fr', () => {
      const synthesis = buildFallbackSynthesis(mockReport, mockSources, 'fr');
      expect(synthesis.sourceInsights[0].stance).toBe('confirme');
      expect(synthesis.sourceInsights[1].stance).toBe('contredit');
      expect(synthesis.investigatorToolkit.journalistFaq[0].question).toContain('Que');
    });
  });

  describe('synthesisFromReport', () => {
    it('returns existing proSynthesis when present on report', () => {
      const existing = buildFallbackSynthesis(mockReport, mockSources, 'ro');
      const reportWithPro: VerificationReport = {
        ...mockReport,
        proSynthesis: existing,
      };

      const result = synthesisFromReport(reportWithPro, 'ro');
      expect(result).toBe(existing);
    });

    it('builds fallback when proSynthesis is missing', () => {
      const result = synthesisFromReport(mockReport, 'ro');
      expect(result.subClaims).toBeDefined();
      expect(result.crossSourceAnalysis.comparisonMatrix.length).toBe(2);
    });
  });

  describe('synthesizeReport fallback on no API key', () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    const originalOmniKey = process.env.OMNIROUTE_API_KEY;

    beforeEach(() => {
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.OMNIROUTE_API_KEY;
    });

    afterEach(() => {
      process.env.OPENROUTER_API_KEY = originalKey;
      process.env.OMNIROUTE_API_KEY = originalOmniKey;
    });

    it('returns fallback synthesis when no AI key is configured', async () => {
      const result = await synthesizeReport(mockReport, 'Probabil fals', 'ro');
      expect(result).toBeDefined();
      expect(result.crossSourceAnalysis.comparisonMatrix.length).toBe(2);
      expect(result.subClaims[0].verdict).toBe('false');
    });
  });
});
