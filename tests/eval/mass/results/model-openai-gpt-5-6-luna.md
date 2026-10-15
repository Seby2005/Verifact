# Benchmark masiv — model-openai-gpt-5-6-luna.jsonl  (71 cazuri)

| rezultat | total | text | screenshot | url |
|---|---|---|---|---|
| corect | 50 (70%) | 33 | 10 | 7 |
| greșit (nu inversat) | 4 (6%) | 3 | 0 | 1 |
| ABERANT (adevăr inversat) | 9 (13%) | 3 | 2 | 4 |
| refuzat corect | 7 (10%) | 1 | 0 | 6 |
| refuzat greșit (tool picat) | 0 (0%) | 0 | 0 | 0 |
| crash | 1 (1%) | 1 | 0 | 0 |

Acuratețe pe cazurile care au ajuns la verdict: 50/64 (78%)

## Pe categorie
| categorie | n | corect | greșit | aberant | refuz ok | refuz greșit | crash |
|---|---|---|---|---|---|---|---|
| neclar | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| link fact-check | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| fals | 11 | 10 | 1 | 0 | 0 | 0 | 0 |
| screenshot | 12 | 10 | 0 | 2 | 0 | 0 | 0 |
| link limită | 7 | 0 | 1 | 0 | 6 | 0 | 0 |
| întrebare | 2 | 1 | 1 | 0 | 0 | 0 | 0 |
| adevărat | 8 | 5 | 0 | 3 | 0 | 0 | 0 |
| link știre | 5 | 1 | 0 | 4 | 0 | 0 | 0 |
| aberant | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| link satiră | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| limită | 6 | 4 | 1 | 0 | 1 | 0 | 0 |
| altă limbă | 3 | 2 | 0 | 0 | 0 | 0 | 1 |

## Tool-uri / layere
| layer | success | unavailable/error | cu rezultate |
|---|---|---|---|
| L1 fact-check (Google FC) | 61 | 0 | 5 |
| L2 presă (NewsAPI/Tavily/GDELT) | 0 | 61 | 0 |
| L3 oficial (Tavily/Wiki) | 61 | 0 | 32 |
| L4 social (Tavily) | 0 | 61 | 0 |
| AI analiză | 48 | 15 | - |
| OCR (Vision/OCR.space) | 12 | 0 | - |
| Extragere URL | 12 | 5 | - |
| Cazuri cu 0 surse | 29 | | |

## Semnale aberante în output (independent de verdict)
- ai-indisponibil: 15
- status-ferm-fără-surse: 2
- verdict-false-scor-mare: 1

Durată: mediană 26s, p90 30s, max 1827s
Tokeni: 166805 input + 84859 output (3932/verificare)

## Cazuri problematice
| id | rezultat | așteptat | verdict (scor) | afirmația verificată | rezumat / eroare |
|---|---|---|---|---|---|
| u-fc-grindeanu | correct | false/true/partial | false (24) | FALS / Sorin Grindeanu declară că numărul șomerilor a crescut cu 70.000, în timpul guvernului Bolojan - Factual • Adevărul din politică. „(...) suntem cei care  | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 1 verificări din baze de fact-c ⚑ ai-indisponibil |
| u-true-schengen | correct | true | true (92) | Acord pentru aderarea României la Schengen cu frontierele terestre de la 1 ianuarie. Anunțul lui Klaus Iohannis. Preşedintele Klaus Iohannis anunţă, miercuri, u | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 3 documente din surse oficiale. ⚑ ai-indisponibil |
| s01-fb-true-post-false-spin | correct | true | true (96) | România a devenit membră deplină a spațiului Schengen, inclusiv cu frontierele terestre, de la 1 ianuarie 2025. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 3 documente din surse oficiale. ⚑ ai-indisponibil |
| t-true-schengen | aberrant | true | false (25) | România a aderat complet la spațiul Schengen, inclusiv cu frontierele terestre, la 1 ianuarie 2025. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Nu am găsit surse relevante pentru aceas ⚑ ai-indisponibil |
| t-true-vat | aberrant | true | false (25) | Cota standard de TVA în România a crescut de la 19% la 21% începând cu 1 august 2025. | Statutul Dovezilor: Afirmația nu este confirmată și nici contrazisă de dovezile colectate. Lotul de surse nu conține nicio informație despre cota de 21% sau des  |
| u-true-vaccines | aberrant | true/partial | false (25) | „2025 este anul în care încrederea în vaccinuri a revenit puternic” - CNAS. WhatsApp icon Sursa foto: Ilona Andrei / G4Media.ro Adaugă-ne ca sursă preferată Urm | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Nu am găsit surse relevante pentru aceas ⚑ ai-indisponibil |
| u-satire-salaries | correct | false/unclear | false (2) | Bolojan face și el Black Friday! Toți bugetarii primesc salariile mâine, reduse cu 50%. TNR Premium cu 2 /lună N-ai bannere publicitare Poți comenta la articole | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Nu am găsit surse relevante pentru aceas ⚑ status-ferm-fără-surse, ai-indisponibil |
| u-true-oath | aberrant | true | false (30) | Zi istorică: Nicuşor Dan a depus jurământul în plenul reunit al Parlamentului. Primul său discurs. Luni, începând cu ora 12:00, a avut loc ceremonia oficială de | Statutul Dovezilor: Nu există nicio sursă colectată care să confirme ora, ziua sau desfășurarea ceremoniei descrise, iar textul are un câmp lăsat gol („începând  |
| u-edge-wikipedia | wrong | true/partial | unclear (50) | Nicușor Dan - Wikipedia. Nicușor Dan ( n. 20 decembrie 1969 , Făgăraș , România ) este un politician , matematician , activist civic român și, din 2025, al șapt | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 4 documente din surse oficiale. ⚑ ai-indisponibil |
| t-q-schengen | wrong | true | unclear (50) | România a intrat în Schengen | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 6 documente din surse oficiale. ⚑ ai-indisponibil |
| s04-tweet-true-vat | aberrant | true | false (25) | De la 1 august 2025, cota standard de TVA în România a crescut de la 19% la 21%, iar cotele reduse au fost unificate la 11%. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 1 documente din surse oficiale. ⚑ ai-indisponibil |
| u-satire-fines | correct | false/unclear | false (5) | Ca să elimine risipa, Bolojan va amenda româncele care fac copii. Ca să elimine risipa, Bolojan va amenda româncele care fac copii Scris de TimesNewRoman.ro @ S | Statutul Dovezilor: Nu s-a găsit niciun fact-check, nicio relatare de presă, nicio sursă oficială și nicio declarație publică care să susțină afirmația. Din pun ⚑ status-ferm-fără-surse |
| s08-fb-true-drones | aberrant | true | false (52) | Ministerul Apărării confirmă că fragmente de drone rusești au căzut din nou pe teritoriul României, în județul Tulcea. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 1 verificări din baze de fact-c ⚑ verdict-false-scor-mare(52), ai-indisponibil |
| u-fc-vilnius | correct | false/true | false (12) | FALS / Nicușor Dan ar fi semnat la Vilnius intrarea în război sau Legea marțială - Factual • Adevărul din politică. Lituania a organizat, pe 2 iunie 2025, un su | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Nu am găsit surse relevante pentru aceas ⚑ ai-indisponibil |
| u-true-vat | aberrant | true | false (25) | România intră în august cu TVA de 21% și accize mai mari: Scumpiri la transport, comunicații și alimente - tvrinfo.ro. 1 august 2025 aduce o avalanșă de scumpir | Statutul Dovezilor Fără surse credibile identificate în această  |
| u-fc-roundup | correct | false/true/partial/unclear | unclear (50) | Fake news în 2025 / De la războiul care începe în septembrie până la barajele demolate la ordinul UE. Ce alte minciuni s-au viralizat. Spațiul public, rețele so | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 3 documente din surse oficiale. ⚑ ai-indisponibil |
| u-true-drones | aberrant | true | false (25) | Ministerul Apărării a găsit două locuri în care au căzut drone rusești, în judeţul Tulcea. Resturile a două drone rusești au fost găsite vineri în două zone sep | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Nu am găsit surse relevante pentru aceas ⚑ ai-indisponibil |
| t-true-drones | aberrant | true | false (43) | Fragmente de drone rusești au căzut pe teritoriul României, în județul Tulcea. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 2 verificări din baze de fact-c ⚑ ai-indisponibil |
| t-false-5g | wrong | false | unclear (50) | Rețelele au răspândit coronavirusul. | Statutul Dovezilor: Fără surse credibile identificate. Cele patru straturi de căutare nu au returnat niciun fact-check, articol de presă, document oficial sau d  |
| t-edge-mixed | wrong | false/partial | unclear (50) | România a intrat în Schengen în 2025 și tot atunci a adoptat euro, iar TVA a scăzut la 15%. | Analiza automată în limbaj natural nu este disponibilă momentan, așa că mai jos este doar rezultatul căutării în surse. Am găsit 3 documente din surse oficiale. ⚑ ai-indisponibil |
| t-en-in-ro-ui | crash | false | - (-) |  | CASE_TIMEOUT 150000ms  |