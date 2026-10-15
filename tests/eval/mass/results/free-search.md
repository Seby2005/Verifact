# Benchmark masiv — free-search.jsonl  (71 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 61 (86%) | 39 | 11 | 11 |
| greșit (nu inversat) | 3 (4%) | 1 | 1 | 1 |
| ABERANT (adevăr inversat) | 0 (0%) | 0 | 0 | 0 |
| refuzat corect | 7 (10%) | 1 | 0 | 6 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 0 (0%) | 0 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 61/64 (95%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| neclar | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| link fact-check | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| fals | 11 | 10 | 1 | 0 | 0 | 0 | 0 |
| screenshot | 12 | 11 | 1 | 0 | 0 | 0 | 0 |
| link limită | 7 | 1 | 0 | 0 | 6 | 0 | 0 |
| întrebare | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| adevărat | 8 | 8 | 0 | 0 | 0 | 0 | 0 |
| link știre | 5 | 4 | 1 | 0 | 0 | 0 | 0 |
| aberant | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| link satiră | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| limită | 6 | 5 | 0 | 0 | 1 | 0 | 0 |
| altă limbă | 3 | 3 | 0 | 0 | 0 | 0 | 0 |

## Tool-uri / layere
| layer | success | unavailable/error | cu rezultate |
|---|---|---|---|
| L1 fact-check (Google FC) | 62 | 0 | 11 |
| L2 presă (Bing/Google News RSS, GDELT) | 62 | 0 | 47 |
| L3 oficial (Google News site:, Wikipedia) | 62 | 0 | 26 |
| L4 social (X API, opțional) | 0 | 0 | 0 |
| AI analiză | 64 | 0 | - |
| OCR (Vision/OCR.space) | 12 | 0 | - |
| Extragere URL | 12 | 5 | - |
| Cazuri cu 0 surse | 9 | | |

## Semnale aberante în output (independent de verdict)
- status-ferm-fără-surse: 1

Durată: mediană 18s, p90 21s, max 22s
Tokeni: 348704 input + 162514 output (7988/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| u-true-vaccines | wrong | true/partial | unclear (55) | „2025 este anul în care încrederea în vaccinuri a revenit puternic” - CNAS. WhatsApp icon Sursa foto: Ilona Andrei / G4Media.ro Adaugă-ne ca sursă preferată Urm | Statutul Dovezilor: Afirmația este atribuită președintelui CNAS, Horațiu-Remus Moldovan, și se bazează pe un comunicat de presă al instituției. Cele patru strat  |
| u-satire-fines | correct | false/unclear | false (8) | Ca să elimine risipa, Bolojan va amenda româncele care fac copii. Ca să elimine risipa, Bolojan va amenda româncele care fac copii Scris de TimesNewRoman.ro @ S | Statutul Dovezilor: Nu a fost identificată nicio sursă care să confirme afirmația. Niciun fact-check existent, niciun articol de presă relevant, nicio sursă ofi ⚑ status-ferm-fără-surse |
| s08-fb-true-drones | wrong | true | unclear (45) | Ministerul Apărării confirmă că fragmente de drone rusești au căzut din nou pe teritoriul României, în județul Tulcea. | Statutul Dovezilor: Afirmația are o bază factuală solidă în presă și în surse oficiale: existența unor alerte RO-Alert în Tulcea și a unor drone rusești în apro  |
| t-false-5g | wrong | false | partial (71) | Rețelele au răspândit coronavirusul. | Statutul Dovezilor Afirmația „Rețelele au răspândit coronavirusul" este formulată ambiguu: „rețelele" poate însemna rețele sociale, rețele de transport, rețele   |