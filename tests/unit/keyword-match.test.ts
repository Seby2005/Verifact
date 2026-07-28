import { containsPhrase, matchesAnyPhrase } from '@/lib/verification/keyword-match';
import { DEBUNK_MARKERS } from '@/lib/verification/constants';

describe('containsPhrase', () => {
  it('does not find a keyword hiding inside a longer word', () => {
    // "mit" (myth) inside an EU test-methods regulation is what scored the
    // claim "apa pură fierbe la 100°C" as debunked.
    expect(containsPhrase('Limita de detecție este precizată în anexă.', 'mit')).toBe(false);
    expect(containsPhrase('Metoda permite determinarea punctului.', 'mit')).toBe(false);
    expect(containsPhrase('Valorile admise sunt precizate.', 'mit')).toBe(false);
  });

  it('finds the same keyword when it stands on its own', () => {
    expect(containsPhrase('Acesta este un mit raspandit.', 'mit')).toBe(true);
    expect(containsPhrase('Mit sau realitate?', 'mit')).toBe(true);
  });

  it('does not treat "corect" as present in "incorect"', () => {
    // These fired together and cancelled each other out to neutral.
    expect(containsPhrase('Informatia este incorecta.', 'corect')).toBe(false);
    expect(containsPhrase('Informatia este corecta.', 'corect')).toBe(false);
    expect(containsPhrase('Raspunsul este corect.', 'corect')).toBe(true);
  });

  it('respects Romanian diacritics as word characters', () => {
    // JavaScript's \b would break here: ă is not a \w character, so a naive
    // \bfals\b matches inside "falsă".
    expect(containsPhrase('Afirmația este falsă.', 'fals')).toBe(false);
    expect(containsPhrase('Afirmația este falsă.', 'falsă')).toBe(true);
    expect(containsPhrase('Este fals.', 'fals')).toBe(true);
  });

  it('matches across the cedilla and comma spellings', () => {
    // The keyword lists use ţ (cedilla); documents commonly use ț (comma).
    expect(containsPhrase('Zvonul a fost dezmințit oficial.', 'dezminţit')).toBe(true);
    expect(containsPhrase('Zvonul a fost dezminţit oficial.', 'dezmințit')).toBe(true);
  });

  it('matches multi-word phrases', () => {
    expect(containsPhrase('Nu există dovezi care să susțină asta.', 'nu există dovezi')).toBe(true);
    expect(containsPhrase('A fost publicat un fact check detaliat.', 'fact check')).toBe(true);
  });

  it('ignores case', () => {
    expect(containsPhrase('ESTE FALS.', 'fals')).toBe(true);
  });

  it('treats punctuation as a boundary', () => {
    expect(containsPhrase('Este fals, dar nuantat.', 'fals')).toBe(true);
    expect(containsPhrase('(fals)', 'fals')).toBe(true);
  });
});

describe('matchesAnyPhrase', () => {
  it('leaves a neutral regulatory snippet alone', () => {
    const regulation =
      'Prezentul regulament stabilește metodele de testare. Limita de detecție și valorile limită admise sunt precizate în anexă. Metoda permite determinarea punctului de fierbere la presiune normală.';

    expect(matchesAnyPhrase(regulation, DEBUNK_MARKERS)).toBe(false);
  });

  it('still catches a genuine debunk', () => {
    const debunk = 'Afirmația este falsă. Nu există dovezi care să susțină această teorie a conspirației.';

    expect(matchesAnyPhrase(debunk, DEBUNK_MARKERS)).toBe(true);
  });
});
