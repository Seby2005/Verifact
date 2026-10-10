# Benchmark masiv — final-subset.jsonl  (20 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 19 (95%) | 18 | 1 | 0 |
| greșit (nu inversat) | 0 (0%) | 0 | 0 | 0 |
| ABERANT (adevăr inversat) | 1 (5%) | 1 | 0 | 0 |
| refuzat corect | 0 (0%) | 0 | 0 | 0 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 0 (0%) | 0 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 19/20 (95%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| aberant | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| istoric real | 10 | 9 | 0 | 1 | 0 | 0 | 0 |
| fals | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| adevărat | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| similar istoricului | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| EUvsDisinfo | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| neclar | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| limită | 1 | 1 | 0 | 0 | 0 | 0 | 0 |

## Tool-uri / layere
| layer | success | unavailable/error | cu rezultate |
|---|---|---|---|
| L1 fact-check (Google FC) | 20 | 0 | 6 |
| L2 presă (Bing/Google News RSS, GDELT) | 20 | 0 | 14 |
| L3 oficial (Google News site:, Wikipedia) | 20 | 0 | 9 |
| L4 social (X API, opțional) | 0 | 0 | 0 |
| AI analiză | 20 | 0 | - |
| OCR (Vision/OCR.space) | 1 | 0 | - |
| Extragere URL | 0 | 0 | - |
| Cazuri cu 0 surse | 6 | | |

## Semnale aberante în output (independent de verdict)

Durată: mediană 23s, p90 26s, max 27s
Tokeni: 132225 input + 52394 output (9231/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| h-ai-daunatoare | aberrant | unclear/partial | false (25) | Inteligenta artificiala neste daunatoare | Statutul Dovezilor: Afirmația este vagă și de natură evaluativă, deci nu poate fi confirmată sau infirmată ca atare. Dovezile colectate descriu riscuri și incid  |