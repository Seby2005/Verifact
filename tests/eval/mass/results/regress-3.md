# Benchmark masiv — regress-3.jsonl  (83 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 73 (88%) | 51 | 11 | 11 |
| greșit (nu inversat) | 3 (4%) | 1 | 1 | 1 |
| ABERANT (adevăr inversat) | 0 (0%) | 0 | 0 | 0 |
| refuzat corect | 7 (8%) | 1 | 0 | 6 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 0 (0%) | 0 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 73/76 (96%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| aberant | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| limită | 6 | 5 | 0 | 0 | 1 | 0 | 0 |
| screenshot | 12 | 11 | 1 | 0 | 0 | 0 | 0 |
| link știre | 5 | 4 | 1 | 0 | 0 | 0 | 0 |
| link fact-check | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| altă limbă | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| link limită | 7 | 1 | 0 | 0 | 6 | 0 | 0 |
| fals | 11 | 11 | 0 | 0 | 0 | 0 | 0 |
| adevărat | 8 | 7 | 1 | 0 | 0 | 0 | 0 |
| legi | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| engleză despre România | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| altă țară | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| întrebare | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| neclar | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| EUvsDisinfo | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| link satiră | 2 | 2 | 0 | 0 | 0 | 0 | 0 |

## Tool-uri / layere
| layer | success | unavailable/error | cu rezultate |
|---|---|---|---|
| L1 fact-check (Google FC) | 74 | 0 | 16 |
| L2 presă (Bing/Google News RSS, GDELT) | 74 | 0 | 56 |
| L3 oficial (Google News site:, Wikipedia) | 74 | 0 | 45 |
| L4 social (X API, opțional) | 0 | 0 | 0 |
| AI analiză | 76 | 0 | - |
| OCR (Vision/OCR.space) | 12 | 0 | - |
| Extragere URL | 12 | 5 | - |
| Cazuri cu 0 surse | 12 | | |

## Semnale aberante în output (independent de verdict)
- status-ferm-fără-surse: 2

Durată: mediană 22s, p90 26s, max 29s
Tokeni: 538068 input + 191305 output (9597/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| s08-fb-true-drones | wrong | true | partial (67) | Ministerul Apărării confirmă că fragmente de drone rusești au căzut din nou pe teritoriul României, în județul Tulcea. | Statutul Dovezilor Afirmația are două componente distincte: (1) că fragmente de drone rusești au căzut pe teritoriul României, în Tulcea, și (2) că Ministerul A  |
| t-true-schengen | wrong | true | partial (63) | România a aderat complet la spațiul Schengen, inclusiv cu frontierele terestre, la 1 ianuarie 2025. | Statutul Dovezilor: Dovezile sunt convergente și confirmă, în esență, afirmația. Mai multe publicații românești relatează independent acordul UE și intrarea Rom  |
| u-true-vaccines | wrong | true/partial | unclear (42) | „2025 este anul în care încrederea în vaccinuri a revenit puternic” - CNAS. WhatsApp icon Sursa foto: Ilona Andrei / G4Media.ro Adaugă-ne ca sursă preferată Urm | Statutul Dovezilor: Afirmația nu a fost confirmată sau infirmată direct de nicio sursă independentă găsită în cele patru straturi de căutare. Cifrele atribuite   |
| u-satire-fines | correct | false/unclear | false (5) | Ca să elimine risipa, Bolojan va amenda româncele care fac copii. Ca să elimine risipa, Bolojan va amenda româncele care fac copii Scris de TimesNewRoman.ro @ S | Statutul Dovezilor: Afirmația nu este susținută de nicio sursă identificată în cele patru straturi de căutare: nu există fact-check-uri anterioare, articole de  ⚑ status-ferm-fără-surse |
| u-satire-salaries | correct | false/unclear | false (5) | Bolojan face și el Black Friday! Toți bugetarii primesc salariile mâine, reduse cu 50%. TNR Premium cu 2 /lună N-ai bannere publicitare Poți comenta la articole | Statutul Dovezilor: Nu s-a identificat nicio sursă care să confirme afirmația, iar textul prezintă semne clare de satiră. Înclinația de plauzibilitate este spre ⚑ status-ferm-fără-surse |