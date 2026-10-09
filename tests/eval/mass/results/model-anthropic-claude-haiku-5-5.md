# Benchmark masiv — model-anthropic-claude-haiku-5-5.jsonl  (71 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 56 (79%) | 38 | 10 | 8 |
| greșit (nu inversat) | 5 (7%) | 0 | 1 | 4 |
| ABERANT (adevăr inversat) | 3 (4%) | 2 | 1 | 0 |
| refuzat corect | 7 (10%) | 1 | 0 | 6 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 0 (0%) | 0 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 56/64 (88%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| neclar | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| link fact-check | 4 | 3 | 1 | 0 | 0 | 0 | 0 |
| fals | 11 | 11 | 0 | 0 | 0 | 0 | 0 |
| screenshot | 12 | 10 | 1 | 1 | 0 | 0 | 0 |
| link limită | 7 | 1 | 0 | 0 | 6 | 0 | 0 |
| întrebare | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| adevărat | 8 | 6 | 0 | 2 | 0 | 0 | 0 |
| link știre | 5 | 2 | 3 | 0 | 0 | 0 | 0 |
| aberant | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| link satiră | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| limită | 6 | 5 | 0 | 0 | 1 | 0 | 0 |
| altă limbă | 3 | 3 | 0 | 0 | 0 | 0 | 0 |

## Tool-uri / layere
| layer | success | unavailable/error | cu rezultate |
|---|---|---|---|
| L1 fact-check (Google FC) | 62 | 0 | 5 |
| L2 presă (NewsAPI/Tavily/GDELT) | 0 | 62 | 0 |
| L3 oficial (Tavily/Wiki) | 62 | 0 | 33 |
| L4 social (Tavily) | 0 | 62 | 0 |
| AI analiză | 56 | 8 | - |
| OCR (Vision/OCR.space) | 12 | 0 | - |
| Extragere URL | 12 | 5 | - |
| Cazuri cu 0 surse | 29 | | |

## Semnale aberante în output (independent de verdict)
- ai-indisponibil: 8
- status-ferm-fără-surse: 2
- afirmație-extrasă-greșit: 1

Durată: mediană 21s, p90 28s, max 36s
Tokeni: 214140 input + 134182 output (5443/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| s12-news-true-nato | correct | true | true (93) | România a aderat la Alianța Nord-Atlantică la 29 martie 2004, alături de alte șase state. | Statutul Dovezilor: Afirmația este plauzibilă și coincide cu cunoștințele generale despre extinderea NATO din 2004, dar sursele colectate în cele patru straturi ⚑ afirmație-extrasă-greșit |
| u-true-schengen | correct | true | true (79) | Acord pentru aderarea României la Schengen cu frontierele terestre de la 1 ianuarie. Anunțul lui Klaus Iohannis. Preşedintele Klaus Iohannis anunţă, miercuri, u | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 1 documente din surse oficiale. ⚑ ai-indisponibil |
| s01-fb-true-post-false-spin | aberrant | true | false (15) | România a devenit membră deplină a spațiului Schengen, inclusiv cu frontierele terestre, de la 1 ianuarie 2025. | Statutul Dovezilor: Afirmația principală are un sâmbure confirmat, dar sursele colectate acoperă doar parțial data de  |
| t-true-schengen | aberrant | true | false (8) | România a aderat complet la spațiul Schengen, inclusiv cu frontierele terestre, la 1 ianuarie 2025. | Statutul Dovezilor: Sursele colectate confirmă existența unui cadru Schengen și menționează Bulga  |
| u-true-vaccines | wrong | true/partial | unclear (52) | „2025 este anul în care încrederea în vaccinuri a revenit puternic” - CNAS. WhatsApp icon Sursa foto: Ilona Andrei / G4Media.ro Adaugă-ne ca sursă preferată Urm | Statutul Dovezilor: Niciuna dintre cele patru categorii de surse nu a returnat documente, relatări sau declarații independente despre această afirmație, deci  |
| u-satire-salaries | correct | false/unclear | false (15) | Bolojan face și el Black Friday! Toți bugetarii primesc salariile mâine, reduse cu 50%. TNR Premium cu 2 /lună N-ai bannere publicitare Poți comenta la articole | Statutul Dovezilor: Nu există nicio probă identificată care să confirme afirmația. Niciun fact-check, articol de presă, document oficial sau declarație publică  ⚑ status-ferm-fără-surse |
| u-true-oath | wrong | true | unclear (50) | Zi istorică: Nicuşor Dan a depus jurământul în plenul reunit al Parlamentului. Primul său discurs. Luni, începând cu ora 12:00, a avut loc ceremonia oficială de | Statutul Dovezilor: Afirmația nu are nicio sursă verificabilă în cele patru straturi de căutare, iar textul are erori de datare și de redactare (ora lipsește, z  |
| u-edge-wikipedia | correct | true/partial | true (88) | Nicușor Dan - Wikipedia. Nicușor Dan ( n. 20 decembrie 1969 , Făgăraș , România ) este un politician , matematician , activist civic român și, din 2025, al șapt | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 4 documente din surse oficiale. ⚑ ai-indisponibil |
| s04-tweet-true-vat | wrong | true | unclear (50) | De la 1 august 2025, cota standard de TVA în România a crescut de la 19% la 21%, iar cotele reduse au fost unificate la 11%. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 1 documente din surse oficiale. ⚑ ai-indisponibil |
| u-satire-fines | correct | false/unclear | false (10) | Ca să elimine risipa, Bolojan va amenda româncele care fac copii. Ca să elimine risipa, Bolojan va amenda româncele care fac copii Scris de TimesNewRoman.ro @ S | Statutul Dovezilor: Nicio sursă independentă, oficială sau de fact-checking nu confirmă afirmația. Înclinația de plauzibilitate este spre Neverosimil: nu există ⚑ status-ferm-fără-surse |
| s08-fb-true-drones | correct | true | true (78) | Ministerul Apărării confirmă că fragmente de drone rusești au căzut din nou pe teritoriul României, în județul Tulcea. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 6 documente din surse oficiale. ⚑ ai-indisponibil |
| u-fc-vilnius | wrong | false/true | unclear (50) | FALS / Nicușor Dan ar fi semnat la Vilnius intrarea în război sau Legea marțială - Factual • Adevărul din politică. Lituania a organizat, pe 2 iunie 2025, un su | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Nu am găsit surse relevante pentru aceas ⚑ ai-indisponibil |
| u-true-vat | wrong | true | partial (80) | România intră în august cu TVA de 21% și accize mai mari: Scumpiri la transport, comunicații și alimente - tvrinfo.ro. 1 august 2025 aduce o avalanșă de scumpir | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Nu am găsit surse relevante pentru aceas ⚑ ai-indisponibil |
| t-true-drones | aberrant | true | false (44) | Fragmente de drone rusești au căzut pe teritoriul României, în județul Tulcea. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 1 verificări din baze de fact-c ⚑ ai-indisponibil |
| t-true-revolution | correct | true | true (96) | Revoluția română a avut loc în decembrie 1989. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 6 documente din surse oficiale. ⚑ ai-indisponibil |