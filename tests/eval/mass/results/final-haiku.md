# Benchmark masiv — final-haiku.jsonl  (71 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 63 (89%) | 40 | 12 | 11 |
| greșit (nu inversat) | 1 (1%) | 0 | 0 | 1 |
| ABERANT (adevăr inversat) | 0 (0%) | 0 | 0 | 0 |
| refuzat corect | 7 (10%) | 1 | 0 | 6 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 0 (0%) | 0 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 63/64 (98%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| neclar | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| link fact-check | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| fals | 11 | 11 | 0 | 0 | 0 | 0 | 0 |
| screenshot | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
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
| L1 fact-check (Google FC) | 62 | 0 | 12 |
| L2 presă (NewsAPI/Tavily/GDELT) | 52 | 10 | 6 |
| L3 oficial (Tavily/Wiki) | 62 | 0 | 39 |
| L4 social (Tavily) | 0 | 62 | 0 |
| AI analiză | 64 | 0 | - |
| OCR (Vision/OCR.space) | 12 | 0 | - |
| Extragere URL | 12 | 5 | - |
| Cazuri cu 0 surse | 19 | | |

## Semnale aberante în output (independent de verdict)
- status-ferm-fără-surse: 2

Durată: mediană 16s, p90 19s, max 33s
Tokeni: 301555 input + 161161 output (7230/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| u-true-vaccines | wrong | true/partial | unclear (45) | „2025 este anul în care încrederea în vaccinuri a revenit puternic” - CNAS. WhatsApp icon Sursa foto: Ilona Andrei / G4Media.ro Adaugă-ne ca sursă preferată Urm | Statutul Dovezilor: Pentru această afirmație nu a fost identificată nicio verificare anterioară, nicio relatare de presă independentă și nicio sursă oficială sa  |
| u-satire-salaries | correct | false/unclear | false (8) | Bolojan face și el Black Friday! Toți bugetarii primesc salariile mâine, reduse cu 50%. TNR Premium cu 2 /lună N-ai bannere publicitare Poți comenta la articole | Statutul Dovezilor: Nicio sursă de fact-checking, presă, document oficial sau declarație publică nu a fost identificată pentru această afirmație. Înclinația de  ⚑ status-ferm-fără-surse |
| u-satire-fines | correct | false/unclear | false (15) | Ca să elimine risipa, Bolojan va amenda româncele care fac copii. Ca să elimine risipa, Bolojan va amenda româncele care fac copii Scris de TimesNewRoman.ro @ S | Statutul Dovezilor: Nu a fost identificată nicio sursă care să confirme sau să infirme afirmația, iar indicele surselor este de 50%, deci probele sunt parțiale  ⚑ status-ferm-fără-surse |