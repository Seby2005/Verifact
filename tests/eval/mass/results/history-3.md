# Benchmark masiv — history-3.jsonl  (83 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 79 (95%) | 72 | 5 | 2 |
| greșit (nu inversat) | 3 (4%) | 3 | 0 | 0 |
| ABERANT (adevăr inversat) | 1 (1%) | 1 | 0 | 0 |
| refuzat corect | 0 (0%) | 0 | 0 | 0 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 0 (0%) | 0 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 79/83 (95%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| similar istoricului | 32 | 31 | 1 | 0 | 0 | 0 | 0 |
| istoric real | 51 | 48 | 2 | 1 | 0 | 0 | 0 |

## Tool-uri / layere
| layer | success | unavailable/error | cu rezultate |
|---|---|---|---|
| L1 fact-check (Google FC) | 83 | 0 | 25 |
| L2 presă (Bing/Google News RSS, GDELT) | 83 | 0 | 66 |
| L3 oficial (Google News site:, Wikipedia) | 83 | 0 | 46 |
| L4 social (X API, opțional) | 0 | 0 | 0 |
| AI analiză | 83 | 0 | - |
| OCR (Vision/OCR.space) | 5 | 0 | - |
| Extragere URL | 2 | 0 | - |
| Cazuri cu 0 surse | 12 | | |

## Semnale aberante în output (independent de verdict)
- verdict-false-scor-mare: 1

Durată: mediană 23s, p90 25s, max 28s
Tokeni: 577611 input + 217825 output (9584/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| h-cafea-parkinson | wrong | partial/unclear/true | false (35) | Consumul zilnic de cafea reduce riscul de boala Parkinson cu 40 la suta. | Statutul Dovezilor Afirmația cifrată (reducere de 40%) nu este susținută de sursele găsite. Există o asociere plauzibilă între consumul de cafea și riscul de Pa  |
| h-drone-sau | wrong | unclear/partial/true | false (59) | Dronele din Romania au fost ucrainene sau rusesti | Statutul Dovezilor: Componenta rusească a afirmației este susținută de surse instituționale și jurnalistice convergente, iar componenta ucraineană este infirmat ⚑ verdict-false-scor-mare(59) |
| x-deficit | wrong | true/partial | unclear (59) | Romania a avut in 2024 cel mai mare deficit bugetar din Uniunea Europeana | Statutul Dovezilor: Dovezile converg, dar nu includ un tabel Eurostat explicit pentru anul 2024. Sursele confirmă că România a avut cel mai mare deficit din UE   |
| h-ai-daunatoare | aberrant | unclear/partial | false (25) | Inteligenta artificiala neste daunatoare | Statutul Dovezilor: Afirmația „Inteligența artificială este dăunătoare” este o judecată generalizatoare, nu o propoziție factuală cu actori, date și locuri prec  |