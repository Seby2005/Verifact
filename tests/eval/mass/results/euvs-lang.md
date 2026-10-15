# Benchmark masiv — euvs-lang.jsonl  (83 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 73 (88%) | 52 | 11 | 10 |
| greșit (nu inversat) | 3 (4%) | 0 | 1 | 2 |
| ABERANT (adevăr inversat) | 0 (0%) | 0 | 0 | 0 |
| refuzat corect | 7 (8%) | 1 | 0 | 6 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 0 (0%) | 0 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 73/76 (96%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| link fact-check | 4 | 3 | 1 | 0 | 0 | 0 | 0 |
| adevărat | 8 | 8 | 0 | 0 | 0 | 0 | 0 |
| legi | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| altă limbă | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| neclar | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| link știre | 5 | 4 | 1 | 0 | 0 | 0 | 0 |
| screenshot | 12 | 11 | 1 | 0 | 0 | 0 | 0 |
| fals | 11 | 11 | 0 | 0 | 0 | 0 | 0 |
| aberant | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| link limită | 7 | 1 | 0 | 0 | 6 | 0 | 0 |
| engleză despre România | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| altă țară | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| limită | 6 | 5 | 0 | 0 | 1 | 0 | 0 |
| link satiră | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| întrebare | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| EUvsDisinfo | 3 | 3 | 0 | 0 | 0 | 0 | 0 |

## Tool-uri / layere
| layer | success | unavailable/error | cu rezultate |
|---|---|---|---|
| L1 fact-check (Google FC) | 74 | 0 | 15 |
| L2 presă (Bing/Google News RSS, GDELT) | 74 | 0 | 55 |
| L3 oficial (Google News site:, Wikipedia) | 74 | 0 | 36 |
| L4 social (X API, opțional) | 0 | 0 | 0 |
| AI analiză | 76 | 0 | - |
| OCR (Vision/OCR.space) | 12 | 0 | - |
| Extragere URL | 12 | 5 | - |
| Cazuri cu 0 surse | 10 | | |

## Semnale aberante în output (independent de verdict)
- status-ferm-fără-surse: 2

Durată: mediană 18s, p90 21s, max 23s
Tokeni: 465790 input + 194970 output (8694/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| u-true-vaccines | wrong | true/partial | unclear (45) | „2025 este anul în care încrederea în vaccinuri a revenit puternic” - CNAS. WhatsApp icon Sursa foto: Ilona Andrei / G4Media.ro Adaugă-ne ca sursă preferată Urm | Statutul Dovezilor: Afirmația are o sursă identificabilă (președintele CNAS, citat de Mediafax și G4Media), dar nu am găsit nicio verificare independentă, nicio  |
| u-fc-vilnius | wrong | false/true | partial (65) | FALS / Nicușor Dan ar fi semnat la Vilnius intrarea în război sau Legea marțială - Factual • Adevărul din politică. Lituania a organizat, pe 2 iunie 2025, un su | Statutul Dovezilor: Afirmația că Nicușor Dan ar fi semnat la Vilnius intrarea în război sau legea marțială nu este susținută de nicio sursă identificată în cele  |
| u-satire-fines | correct | false/unclear | false (5) | Ca să elimine risipa, Bolojan va amenda româncele care fac copii. Ca să elimine risipa, Bolojan va amenda româncele care fac copii Scris de TimesNewRoman.ro @ S | Statutul Dovezilor: Nicio dovadă verificabilă nu susține afirmația. Toate cele patru straturi de căutare au returnat zero rezultate relevante, deci înclinația d ⚑ status-ferm-fără-surse |
| u-satire-salaries | correct | false/unclear | false (15) | Bolojan face și el Black Friday! Toți bugetarii primesc salariile mâine, reduse cu 50%. TNR Premium cu 2 /lună N-ai bannere publicitare Poți comenta la articole | Statutul Dovezilor: Nu există nicio dovadă verificabilă în cele patru straturi de căutare care să susțină afirmația. Înclinația de plauzibilitate este spre Fals ⚑ status-ferm-fără-surse |
| s08-fb-true-drones | wrong | true | partial (60) | Ministerul Apărării confirmă că fragmente de drone rusești au căzut din nou pe teritoriul României, în județul Tulcea. | Statutul Dovezilor: Afirmația are sprijin documentar convergent în surse oficiale și presă, dar formularea „Ministerul Apărării confirmă că fragmente de drone r  |