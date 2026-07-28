import { extractExecutiveSummary } from '@/lib/verification/report-builder';

describe('extractExecutiveSummary', () => {
  it('reads the paragraph under the Rezumat heading', () => {
    const analysis = '**Rezumat**:  \nAfirmatia nu este confirmata de sursele consultate.\n\n**Analiza pe surse**:\nrest';

    expect(extractExecutiveSummary(analysis)).toBe(
      'Afirmatia nu este confirmata de sursele consultate.'
    );
  });

  it('reads a summary written on the heading line itself', () => {
    // Observed live: the label used to end up inside the displayed summary.
    const analysis = '**Rezumat**: Datele disponibile nu confirma afirmatia despre Turnul Eiffel.\n\n**Analiza**\nrest';

    expect(extractExecutiveSummary(analysis)).toBe(
      'Datele disponibile nu confirma afirmatia despre Turnul Eiffel.'
    );
  });

  it('ignores the word Rezumat when it appears mid-sentence', () => {
    const analysis = 'Acest Rezumat nu are titlu propriu. A doua propozitie a analizei.';

    expect(extractExecutiveSummary(analysis)).toBe(
      'Acest Rezumat nu are titlu propriu. A doua propozitie a analizei.'
    );
  });

  it('accepts the English heading too', () => {
    const analysis = '**Summary**\nThe claim is not supported by the sources consulted here.\n\n**Sources**\nrest';

    expect(extractExecutiveSummary(analysis)).toBe(
      'The claim is not supported by the sources consulted here.'
    );
  });

  it('keeps a summary that contains inline bold intact', () => {
    // Used to truncate at the first asterisk, yielding "Afirmatia este".
    const analysis = '**Rezumat**\nAfirmatia este **partial** confirmata de sursele oficiale.\n\n**Analiza**\nrest';

    expect(extractExecutiveSummary(analysis)).toBe(
      'Afirmatia este partial confirmata de sursele oficiale.'
    );
  });

  it('reads a summary the model wrote entirely in italics', () => {
    // What the model writes when the layers found nothing. Used to come back
    // empty, so the report rendered a blank summary.
    const analysis = '**Rezumat**\n*Nu exista date suficiente pentru a evalua afirmatia.*\n\n**Analiza**\nrest';

    expect(extractExecutiveSummary(analysis)).toBe(
      'Nu exista date suficiente pentru a evalua afirmatia.'
    );
  });

  it('never returns empty when the heading section is blank', () => {
    const analysis = '**Rezumat**\n\n**Analiza pe surse**\nNiciuna dintre surse nu trateaza subiectul afirmatiei.';

    expect(extractExecutiveSummary(analysis).length).toBeGreaterThan(0);
  });

  it('falls back to the opening sentences when there is no heading', () => {
    const analysis = 'Nu am gasit surse relevante. Afirmatia nu poate fi evaluata acum. A treia propozitie.';

    expect(extractExecutiveSummary(analysis)).toBe(
      'Nu am gasit surse relevante. Afirmatia nu poate fi evaluata acum.'
    );
  });

  it('joins a summary that runs across several lines', () => {
    const analysis = '**Rezumat**\nPrima linie a rezumatului este aici.\nA doua linie continua ideea.\n\n**Analiza**\nrest';

    const summary = extractExecutiveSummary(analysis);

    expect(summary).toContain('Prima linie a rezumatului');
    expect(summary).toContain('A doua linie continua ideea.');
  });
});
