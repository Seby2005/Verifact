import {
  determineEvidenceStatus,
  calculatePlausibilityTilt,
  generateCriticalThinkingPrompt,
} from '@/lib/verification/scoring';
import { expandClaimQueries } from '@/lib/verification/query-expander';
import { buildReport, generateKeyTakeaways } from '@/lib/verification/report-builder';
import type {
  Layer1Result,
  Layer2Result,
  Layer3Result,
  Layer4Result,
  ScoreBreakdown,
  VerificationInput,
} from '@/types/verification';

const emptyLayer1: Layer1Result = { status: 'success', results: [], summary: '', layerScore: 0.5 };
const emptyLayer2: Layer2Result = { status: 'success', results: [], summary: '', layerScore: 0.5 };
const emptyLayer3: Layer3Result = { status: 'success', results: [], summary: '', layerScore: 0.5 };
const emptyLayer4: Layer4Result = { status: 'success', results: [], summary: '', layerScore: 0.5 };

describe('Critical Thinking & Investigative Verification Pipeline', () => {
  describe('Smart Query Deconstruction (3 search angles)', () => {
    it('generates 3 distinct search angles with heuristic fallback when AI is offline', async () => {
      const claim = 'Guvernul a interzis centralele de apartament din 2026';
      const angles = await expandClaimQueries(claim, 'ro');

      expect(angles.primary).toBe(claim);
      expect(angles.factCheckAngle).toBeDefined();
      expect(angles.officialAngle).toBeDefined();
      expect(angles.contextOriginAngle).toBeDefined();

      // Ensure angles are non-trivial and differentiated
      expect(angles.factCheckAngle.toLowerCase()).toContain('fact check');
      expect(angles.officialAngle.toLowerCase()).toMatch(/(lege|ordonanta|guvern|comunicat|oficial)/);
      expect(angles.contextOriginAngle.toLowerCase()).toMatch(/(context|declaratie|proiect|origine)/);
    });

    it('generates English targeted angles appropriately', async () => {
      const claim = 'WHO declared a global ban on processed sugar';
      const angles = await expandClaimQueries(claim, 'en');

      expect(angles.factCheckAngle.toLowerCase()).toContain('fact check');
      expect(angles.officialAngle.toLowerCase()).toMatch(/(official|press release|statement|guidelines)/);
      expect(angles.contextOriginAngle.toLowerCase()).toMatch(/(context|origin|background|quote)/);
    });
  });

  describe('Benchmark Scenario 1: Unsubstantiated Rumor (Zero primary evidence)', () => {
    it('categorizes unsubstantiated rumors as unverified_no_sources rather than confused partial', () => {
      const status = determineEvidenceStatus({
        score: 45,
        layers: {
          layer1: emptyLayer1,
          layer2: emptyLayer2,
          layer3: emptyLayer3,
          layer4: emptyLayer4,
        },
        ai: {
          score: 45,
          verdict: 'insufficient',
          confidence: 0.2,
          reasoning: 'Nu s-au găsit surse credibile sau documente publice care să menționeze această decizie.',
        },
      });

      expect(status).toBe('unverified_no_sources');

      const tilt = calculatePlausibilityTilt(status, 45, undefined, 'ro');
      expect(tilt.direction).toBe('neutral');
      expect(tilt.label).toContain('Înclinație spre Neverosimil');
      expect(tilt.rationale).toContain('Nu a fost identificată nicio dovadă primară');

      const prompt = generateCriticalThinkingPrompt(status, 'Afirmație neverificată', 'ro');
      expect(prompt).toContain('Iată ce spun sursele, iată ce lipsește, decide tu pe baza dovezilor.');
    });
  });

  describe('Benchmark Scenario 2: Satire / Parody Detection', () => {
    it('flags satire as contradicted with explicit rationale rather than unclear 50%', () => {
      const status = determineEvidenceStatus({
        score: 15,
        layers: {
          layer1: emptyLayer1,
          layer2: {
            status: 'success',
            results: [
              {
                title: 'Parlamentul European a interzis cafeaua de luni',
                source: 'Times New Roman',
                snippet: 'Articol pamflet publicat de publicația satirică.',
                articleUrl: 'https://timesnewroman.ro/cafea',
                publishedAt: '2026-03-01',
                sentiment: 'contradicts',
                credibilityScore: 0.1,
              },
            ],
            summary: 'Sursă de satiră identificată.',
            layerScore: 0.1,
          },
          layer3: emptyLayer3,
          layer4: emptyLayer4,
        },
        ai: {
          score: 10,
          verdict: 'contradicts',
          confidence: 0.95,
          isSatireOrParody: true,
          reasoning: 'Textul provine de pe un site de satiră și umor (Times New Roman).',
        },
      });

      expect(status).toBe('contradicted');

      const tilt = calculatePlausibilityTilt(status, 15, undefined, 'ro');
      expect(tilt.direction).toBe('unlikely');
      expect(tilt.label).toContain('Înclinație spre Fals');
    });
  });

  describe('Benchmark Scenario 3: Political Half-Truth (Out of Context)', () => {
    it('correctly categorizes decontextualized claims as missing_context', () => {
      const status = determineEvidenceStatus({
        score: 65,
        layers: {
          layer1: emptyLayer1,
          layer2: {
            status: 'success',
            results: [
              {
                title: 'Modificarea Codului Fiscal privind terenurile neîngrijite',
                source: 'G4Media',
                snippet: 'Majorarea de până la 500% se aplică exclusiv clădirilor și terenurilor neîngrijite din intravilan, nu tuturor proprietăților.',
                articleUrl: 'https://g4media.ro/impozit-terenuri',
                publishedAt: '2026-03-01',
                sentiment: 'neutral',
                credibilityScore: 0.85,
              },
            ],
            summary: 'Măsura vizează doar o categorie restrânsă de proprietăți.',
            layerScore: 0.65,
          },
          layer3: {
            status: 'success',
            results: [
              {
                title: 'Codul Fiscal - Articolul 489',
                organization: 'Ministerul Finanțelor',
                documentUrl: 'https://mfinante.gov.ro/cod-fiscal',
                relevantQuote: 'Consiliul local poate majora impozitul pe clădirile și terenurile neîngrijite cu până la 500%.',
                supportsOrDenies: 'neutral',
              },
            ],
            summary: 'Prevedere specifică pentru imobile neîngrijite.',
            layerScore: 0.7,
          },
          layer4: emptyLayer4,
        },
        ai: {
          score: 62,
          evidenceStatus: 'missing_context',
          verdict: 'mixed',
          confidence: 0.8,
          reasoning: 'Afirmația generalizează eronat o cotă aplicabilă strict terenurilor neîngrijite.',
        },
      });

      expect(status).toBe('missing_context');

      const tilt = calculatePlausibilityTilt(status, 65, undefined, 'ro');
      expect(tilt.direction).toBe('mixed');
      expect(tilt.label).toContain('Înclinație spre Denaturare');
      expect(tilt.rationale).toContain('prezintă trunchiat');
    });
  });

  describe('Benchmark Scenario 4: Established Public Fact', () => {
    it('corroborates verified historical facts with high confidence and supportive evidence', () => {
      const status = determineEvidenceStatus({
        score: 95,
        layers: {
          layer1: emptyLayer1,
          layer2: {
            status: 'success',
            results: [
              {
                title: '1 ianuarie 2007: România devine stat membru al UE',
                source: 'Agerpres',
                snippet: 'România a aderat oficial la Uniunea Europeană la 1 ianuarie 2007.',
                articleUrl: 'https://agerpres.ro/ue-2007',
                publishedAt: '2007-01-01',
                sentiment: 'confirms',
                credibilityScore: 0.95,
              },
            ],
            summary: 'Aderarea a avut loc la 1 ianuarie 2007.',
            layerScore: 0.95,
          },
          layer3: {
            status: 'success',
            results: [
              {
                title: 'Tratatul de Aderare a României și Bulgariei la UE',
                organization: 'Comisia Europeană',
                documentUrl: 'https://ec.europa.eu/romania-2007',
                relevantQuote: 'Tratatul a intrat în vigoare la 1 ianuarie 2007.',
                supportsOrDenies: 'supports',
              },
            ],
            summary: 'Tratatul a intrat în vigoare în 2007.',
            layerScore: 0.98,
          },
          layer4: emptyLayer4,
        },
        ai: {
          score: 98,
          evidenceStatus: 'corroborated',
          verdict: 'supports',
          confidence: 0.99,
          reasoning: 'Fapt istoric atestat de tratatele europene și documentele oficiale.',
        },
      });

      expect(status).toBe('corroborated');

      const tilt = calculatePlausibilityTilt(status, 95, undefined, 'ro');
      expect(tilt.direction).toBe('plausible');
      expect(tilt.label).toContain('Înclinație spre Verosimil');
      expect(tilt.rationale).toContain('atestă convergent');
    });
  });

  describe('Benchmark Scenario 5: Open Policy Debate / Divergent Opinions', () => {
    it('recognizes unsettled societal debates without pushing dogmatic verdicts', () => {
      const status = determineEvidenceStatus({
        score: 52,
        layers: {
          layer1: emptyLayer1,
          layer2: {
            status: 'success',
            results: [
              {
                title: 'Dezbatere privind impozitarea progresivă vs. cota unică',
                source: 'Economedia',
                snippet: 'Economiștii au opinii divergente: susținătorii invocă echitatea socială, în timp ce criticii avertizează asupra evaziunii fiscale.',
                articleUrl: 'https://economedia.ro/impozit-progresiv',
                publishedAt: '2026-03-01',
                sentiment: 'neutral',
                credibilityScore: 0.8,
              },
            ],
            summary: 'Subiect de dezbatere deschisă între specialiști.',
            layerScore: 0.5,
          },
          layer3: emptyLayer3,
          layer4: emptyLayer4,
        },
        ai: {
          score: 50,
          evidenceStatus: 'open_debate',
          verdict: 'mixed',
          confidence: 0.75,
          reasoning: 'Există o amplă controversă și perspective divergente în rândul economiștilor.',
        },
      });

      expect(status).toBe('open_debate');

      const tilt = calculatePlausibilityTilt(status, 52, undefined, 'ro');
      expect(tilt.direction).toBe('mixed');
      expect(tilt.label).toContain('Perspectivă deschisă');
      expect(tilt.rationale).toContain('fără consens factual tranșat');
    });
  });

  describe('Report Builder Critical Thinking Integration', () => {
    it('assembles a full report containing evidenceStatus, plausibilityTilt, and criticalThinkingPrompt', () => {
      const input: VerificationInput = {
        text: 'Cercetătorii au descoperit un vaccin universal împotriva tuturor tipurilor de cancer',
        inputType: 'text',
        language: 'ro',
        isPublic: true,
      };

      const scoreBreakdown: ScoreBreakdown = {
        finalScore: 35,
        availableLayers: 2,
        weights: { factCheck: 0.35, news: 0.3, official: 0.25, social: 0.1 },
      };

      const report = buildReport({
        input,
        scoreBreakdown,
        aiAssessment: {
          score: 30,
          verdict: 'mixed',
          evidenceStatus: 'missing_context',
          confidence: 0.8,
          reasoning: 'Este vorba de studii preliminare pe șoareci pentru un tip specific de tumoră, nu un vaccin universal aprobat pentru oameni.',
        },
        aiAnalysis: 'Rezumat: Afirmația exagerează rezultatele unor cercetări de laborator timpurii.',
        processingTime: 1200,
      });

      expect(report.evidenceStatus).toBe('missing_context');
      expect(report.plausibilityTilt).toBeDefined();
      expect(report.plausibilityTilt?.direction).toBe('mixed');
      expect(report.criticalThinkingPrompt).toContain('Iată ce spun sursele, iată ce lipsește');
      expect(report.disclaimer).toContain('asistent pentru gândire critică');
      expect(report.disclaimer).toContain('nu reprezintă un arbitru absolut');

      // Key takeaways should use the non-dogmatic description
      expect(report.keyTakeaways?.[0]).toContain('Afirmația conține elemente factuale reale, însă este lipsită de contextul verificabil esențial.');
    });

    it('generates respectful multilingual critical thinking takeaways', () => {
      const enTakeaways = generateKeyTakeaways(
        'Some claim',
        'Summary',
        [],
        20,
        'en',
        undefined,
        undefined,
        'unverified_no_sources'
      );
      expect(enTakeaways[0]).toBe('No credible sources or primary evidence were found to substantiate this claim.');

      const frTakeaways = generateKeyTakeaways(
        'Une affirmation',
        'Résumé',
        [],
        90,
        'fr',
        undefined,
        undefined,
        'corroborated'
      );
      expect(frTakeaways[0]).toBe('L’affirmation est confirmée de manière convergente par les documents et sources identifiés.');
    });
  });
});
