# Benchmark masiv — history-1.jsonl  (83 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 73 (88%) | 67 | 4 | 2 |
| greșit (nu inversat) | 3 (4%) | 3 | 0 | 0 |
| ABERANT (adevăr inversat) | 7 (8%) | 6 | 1 | 0 |
| refuzat corect | 0 (0%) | 0 | 0 | 0 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 0 (0%) | 0 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 73/83 (88%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| similar istoricului | 32 | 28 | 1 | 3 | 0 | 0 | 0 |
| istoric real | 51 | 45 | 2 | 4 | 0 | 0 | 0 |

## Tool-uri / layere
| layer | success | unavailable/error | cu rezultate |
|---|---|---|---|
| L1 fact-check (Google FC) | 83 | 0 | 16 |
| L2 presă (Bing/Google News RSS, GDELT) | 83 | 0 | 63 |
| L3 oficial (Google News site:, Wikipedia) | 83 | 0 | 37 |
| L4 social (X API, opțional) | 0 | 0 | 0 |
| AI analiză | 83 | 0 | - |
| OCR (Vision/OCR.space) | 5 | 0 | - |
| Extragere URL | 2 | 0 | - |
| Cazuri cu 0 surse | 12 | | |

## Semnale aberante în output (independent de verdict)

Durată: mediană 18s, p90 21s, max 23s
Tokeni: 489167 input + 221511 output (8562/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| h-iohannis-2023 | wrong | false/partial | unclear (40) | Klaus Iohannis a demisionat din functia de presedinte in 2023 | Statutul Dovezilor: Afirmația este confirmată de multiple surse de presă independente, care relatează aceleași fapte, dar nu există încă un fact-check dedicat s  |
| x-neg-ror | aberrant | true | false (36) | Vaccinul ROR nu provoaca autism. | Statutul Dovezilor: Afirmația „Vaccinul ROR nu provoacă autism” este susținută de un corp de dovezi convergent și puternic: fact-checking-uri independente (AFP,  |
| x-neg-plat | aberrant | true | false (33) | Nu este adevarat ca Pamantul este plat. | Statutul Dovezilor: Afirmația „Nu este adevărat că Pământul este plat” este susținută de un corp foarte solid de dovezi convergente, atât din surse de fact-chec  |
| x-neg-5g | aberrant | true | false (35) | Este fals ca retelele 5G raspandesc coronavirusul. | Statutul Dovezilor: Afirmația „Este fals că rețelele 5G răspândesc coronavirusul" are un nivel ridicat de susținere din surse oficiale și de presă, care contraz  |
| h-drone-intentionat | aberrant | unclear/partial/false | true (78) | Dronele sunt trimise intentionat in Romania | Statutul Dovezilor: Afirmația, în forma generală „dronele sunt trimise intenționat în România", are un sâmbure documentat în surse oficiale și presă: incursiuni  |
| h-private-dead | wrong | unclear | false (22) | Nectarie Dobrota este mort | Statutul Dovezilor Nu a fost identificată nicio sursă de niciun fel (fact-checking, presă, instituțională sau declarație publică) care să confirme sau să infirm  |
| h-private-known | aberrant | unclear/partial | false (25) | Dobrota vasile din galati este ziarist cunoscut | Statutul Dovezilor: Afirmația „Dobrota Vasile din Galați este ziarist cunoscut” nu este susținută de nicio sursă identificată în cele patru straturi de căutare.  |
| h-s-kalergi | aberrant | true/partial/unclear | false (25) | Peste 88.000 de tineri au aplicat anul acesta pentru o bursă de studii în România, iar primele zece țări de proveniență sunt conduse de Pakistan (14.515), urmat | Statutul Dovezilor: Nu a fost identificată nicio sursă verificabilă care să susțină cifrele sau clasamentul afirmat, iar nicio bază de fact-checking, presă sau   |
| x-private-theft | wrong | unclear | false (20) | Popescu Ion din Vaslui a furat bani de la primarie | Statutul Dovezilor: Afirmația nu are niciun fact-check sau relatare de presă identificată, iar singura sursă găsită nu o menționează. Înclinația de plauzibilita  |
| h-ai-daunatoare | aberrant | unclear/partial | false (13) | Inteligenta artificiala neste daunatoare | Statutul Dovezilor: Afirmația „Inteligența artificială nu este dăunătoare” nu este susținută de niciun fact-check existent și nici de declarații publice relevan  |