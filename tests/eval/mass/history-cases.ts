import type { Case } from './cases';

/**
 * Cases taken from what readers actually typed into Verifact (the admin log of
 * verifications, staff accounts excluded), plus claims written in the same
 * manner. Real readers do not write like the curated cases in cases.ts: they
 * drop diacritics, misspell, ask questions, accuse named people, paste a
 * denial instead of the hoax, or submit a fragment.
 *
 * Wording is kept exactly as submitted — typos and missing diacritics are the
 * point. Private individuals' names were replaced with invented ones.
 */

const REAL = 'istoric real';
const SIMILAR = 'similar istoricului';

export const HISTORY_CASES: Case[] = [
  // ── Named people: accusations, diagnoses, insults ──────────────────────────
  { id: 'h-nd-securist', kind: 'text', category: REAL, input: 'nicusor dan e securist', accept: ['false', 'unclear'], aberrant: ['true', 'partial'] },
  { id: 'h-fost-este-securist', kind: 'text', category: REAL, input: 'Tiberiu Movila a fost/este securist', accept: ['false', 'unclear'], aberrant: ['true'] },
  { id: 'h-nd-autist', kind: 'text', category: REAL, input: 'Nicusor Dan este autist?', accept: ['false', 'unclear'], aberrant: ['true'] },
  { id: 'h-georgescu-nebun', kind: 'text', category: REAL, input: 'Calin Georgescu este putin nebun', accept: ['unclear', 'partial'], aberrant: ['true', 'false'], note: 'opinie, nu fapt' },
  { id: 'h-georgescu-criza', kind: 'text', category: REAL, input: 'Calin Georgescu a prezis actuala criza', accept: ['unclear', 'false', 'partial'], aberrant: ['true'] },
  { id: 'h-private-known', kind: 'text', category: REAL, input: 'Dobrota vasile din galati este ziarist cunoscut', accept: ['unclear', 'partial'], aberrant: ['true', 'false'], note: 'persoană privată: nu se poate stabili' },
  { id: 'h-private-alien', kind: 'text', category: REAL, input: 'Dobrota vasile este extraterestru', accept: ['false', 'unclear'], aberrant: ['true', 'partial'] },
  { id: 'h-private-dead', kind: 'text', category: REAL, input: 'Nectarie Dobrota este mort', accept: ['unclear'], aberrant: ['true'], note: 'persoană necunoscută' },
  { id: 'h-nd-murit', kind: 'text', category: REAL, input: 'nicusor dan a murit astazi', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-obama-dead', kind: 'text', category: REAL, input: 'Barack Obama is dead', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-trump-dead', kind: 'text', category: REAL, input: 'Donald Trump is dead', accept: ['false'], aberrant: ['true', 'partial'] },

  // ── A true fact with a verdict word or spin attached ───────────────────────
  { id: 'h-nd-tva-promisiune', kind: 'text', category: REAL, input: 'Nicusor Dan a promis ca nu va creste TVA, insa a crescut', accept: ['true', 'partial'], aberrant: ['false'], note: 'promisiune de campanie 2025; TVA 21% din august 2025' },
  { id: 'h-nd-tva-propaganda', kind: 'text', category: REAL, input: 'Nicusor Dan a promis ca nu va creste TVA, insa a crescut, astfel facand propaganda si mintind', accept: ['true', 'partial', 'unclear'], aberrant: ['false'], note: 'fapt real + judecată de valoare' },
  { id: 'h-aur-drone', kind: 'text', category: REAL, input: 'Partidul AUR a votat contra doborarii dronelor rusesti pe teritoriul Romaniei', accept: ['true', 'partial'], aberrant: ['false'] },
  { id: 'h-lamaie-negat', kind: 'text', category: REAL, input: 'Nu există dovezi științifice că lămâia fiartă vindecă cancerul, contrar postărilor virale de pe rețelele sociale.', accept: ['true', 'partial'], aberrant: ['false'], note: 'dezmințirea e adevărată; farsa e falsă' },

  // ── Questions ──────────────────────────────────────────────────────────────
  { id: 'h-drone-ucrainene', kind: 'text', category: REAL, input: 'Dronele cazute in Romania sunt ucrainene?', accept: ['false'], aberrant: ['true'] },
  { id: 'h-drone-intentionat', kind: 'text', category: REAL, input: 'Dronele sunt trimise intentionat in Romania?', accept: ['unclear', 'partial', 'false'], aberrant: ['true'] },
  { id: 'h-drone-sau', kind: 'text', category: REAL, input: 'Dronele din Romania au fost ucrainene sau rusesti?', accept: ['unclear', 'partial', 'true'], aberrant: [], note: 'întrebare cu două variante: nu are valoare de adevăr; contează rezumatul' },
  { id: 'h-ai-daunatoare', kind: 'text', category: REAL, input: 'Inteligenta artificiala neste daunatoare?', accept: ['unclear', 'partial'], aberrant: ['true', 'false'] },

  // ── Typos, no diacritics, shouting ─────────────────────────────────────────
  { id: 'h-ukr-handicap', kind: 'text', category: REAL, input: 'Ucrainenii primesc mai multi bani recat bolanvii cu handicap in romania', accept: ['false', 'unclear'], aberrant: ['true'] },
  { id: 'h-flat', kind: 'text', category: REAL, input: 'pamantul e plat', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-burebista', kind: 'text', category: REAL, input: 'BUREBISTA ERA RUS', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-schengen', kind: 'text', category: REAL, input: 'Romania a devenit membra a spatiului Schengen terestru in ianuarie 2025.', accept: ['true'], aberrant: ['false'] },
  { id: 'h-eu-2007', kind: 'text', category: REAL, input: 'Romania a aderat la Uniunea Europeana in anul 2007.', accept: ['true'], aberrant: ['false'] },
  { id: 'h-apa-100', kind: 'text', category: REAL, input: 'Apa pura fierbe la 100 de grade Celsius la presiune atmosferica normala.', accept: ['true'], aberrant: ['false'] },
  { id: 'h-gibberish-name', kind: 'text', category: REAL, input: 'Veronikareia', accept: ['unclear'], aberrant: ['true', 'false'] },

  // ── Hoaxes and rumours readers brought ─────────────────────────────────────
  { id: 'h-energie-gratis', kind: 'text', category: REAL, input: 'România ar fi dat Ucrainei energie gratis', accept: ['false', 'unclear'], aberrant: ['true'] },
  { id: 'h-tezaur-regulament', kind: 'text', category: REAL, input: 'Regulamentul UE 2024/1473 permite despăgubirea României pentru Tezaur din activele rusești înghețate.”', accept: ['false', 'unclear'], aberrant: ['true'] },
  { id: 'h-simpsons-maui', kind: 'text', category: REAL, input: "The Simpsons' Predicted The Maui Wildfires Being Caused By Directed Energy Weapons", accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-diesel', kind: 'text', category: REAL, input: 'Guvernul României a interzis mașinile cu motor diesel', accept: ['false'], aberrant: ['true'] },
  { id: 'h-biodiversitate', kind: 'text', category: REAL, input: 'Noua legea privind biodiversitatea interzice pășunatul sau creșterea animalelor', accept: ['false', 'unclear'], aberrant: ['true'] },
  { id: 'h-apa-60', kind: 'text', category: REAL, input: 'România deține 60 la sută din rezervele de apă ale Uniunii Europene', accept: ['false'], aberrant: ['true'] },
  { id: 'h-referendum-secret', kind: 'text', category: REAL, input: 'Un politician român a declarat că România va ieși din Uniunea Europeană în urma unui referendum secret.', accept: ['false', 'unclear'], aberrant: ['true'] },
  { id: 'h-selimbar', kind: 'text', category: REAL, input: 'Guvernul României a ținut o întâlnire secretă pentru a împărți abuzive bugete mari și a confisca proprietăți precum clădirea din Șelimbăr', accept: ['false', 'unclear'], aberrant: ['true'] },
  { id: 'h-ambulanta', kind: 'text', category: REAL, input: 'Ambulanţa neagră, cea care răpeşte copii şi nu se ştie ce face cu ei,', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-covid-lab', kind: 'text', category: REAL, input: 'COVID 19 a fost de fapt creat in laborator', accept: ['unclear', 'partial', 'false'], aberrant: ['true'], note: 'origine disputată, nedovedită' },
  { id: 'h-putin-pandemie', kind: 'text', category: REAL, input: 'Vladimir Putin a oprit pandemia când a invadat Ucraina, împiedicând parlamentarii români să treacă legea vaccinării obligatorii', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-creier-10', kind: 'text', category: REAL, input: 'Oamenii folosesc doar 10% din creierul lor.', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-zid-spatiu', kind: 'text', category: REAL, input: 'Zidul Chinezesc se vede din spațiu cu ochiul liber.', accept: ['false'], aberrant: ['true'] },
  { id: 'h-nd-razboi', kind: 'text', category: REAL, input: 'Nicusor Dan a bagat Romania in razboi cu Rusia', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-pod-inventat', kind: 'text', category: REAL, input: 'Primarul comunei Zarnestii de Sus a inaugurat un pod suspendat peste raul Blidarita in martie 2019.', accept: ['unclear', 'false'], aberrant: ['true'], note: 'localitate inventată' },
  { id: 'h-eiffel', kind: 'text', category: REAL, input: 'Turnul Eiffel a fost vandut de doua ori de acelasi escroc in anul 1925.', accept: ['true', 'partial'], aberrant: ['false'], note: 'Victor Lustig' },
  { id: 'h-cafea-parkinson', kind: 'text', category: REAL, input: 'Consumul zilnic de cafea reduce riscul de boala Parkinson cu 40 la suta.', accept: ['partial', 'unclear', 'true'], aberrant: [], note: 'asociere reală în studii, cifra variază' },
  { id: 'h-arnm-adn', kind: 'text', category: REAL, input: 'Vaccinurile ARNm modifica ADN-ul uman.', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'h-iohannis-2023', kind: 'text', category: REAL, input: 'Klaus Iohannis a demisionat din functia de presedinte in 2023', accept: ['false', 'partial'], aberrant: ['true'], note: 'a demisionat în februarie 2025' },

  // ── Real screenshots and links (OCR / extracted text as stored) ────────────
  {
    id: 'h-s-sri-snoop', kind: 'screenshot', category: REAL, input: '', accept: ['true', 'partial'], aberrant: ['false'], mustMention: ['sri'],
    extracted: `12:10\n屋\nLIVE\nSTEM Following For You\n5G\n5616\n#00.000\nEURO\nMASSA\nCLATA\nFOLLOW-UP\nLA CE FIRMA S-AU DUS BANI\nDIN PROIECTUL SRI IN SCOL\n400.000 euro, aproape jumătate din\nsumă, au ajuns la o singură firmă\nSNOOP\nSNOOP\n3\nsnoop.ro\nPhoto\nAproape 400.000 de euro a plătit SRI\ncătre o firmă din Constanța pentru găsirea\nși închirierea sălilor, unde s-au ținut\ncursurile din primul proiect Previsio,\npentru identificarea elevilor care ar putea\ndeveni teroriști.\nSoft 92 SRL este o firmă de softwa...more\nSee translation\n8\n00\n24\nBIG NEWS\n99+\n+\nHome\nFriends\nInbox\nProfile`,
  },
  {
    id: 'h-s-gigafabrica', kind: 'screenshot', category: REAL, input: '', accept: ['true', 'partial', 'unclear'], aberrant: ['false'], mustMention: ['cernavod'],
    extracted: `14:39\n34\nLIVE\nSTEM Following For You\nQ\nM M\nMega-proiect de 5 MILIARDE\n€ în România! Lângă\nCernavodă se pregătește o\n,,gigafabrică" de Inteligență\nArtificială ce va adăposti\nsupercalculatoare uriașe. De\nce acolo? Pentru că au\nnevoie de energia nucleară\nde la centrală ca să\nfuncționeze.Dar apare o\nprovocare majorǎ: aceste\ncomputere se încing puternic\nși au nevoie de volume uriașe\nde apă din Dunǎre pentru\nrăcire! lar fluviul a lovit\nminime istorice din cauza\nsecetei. Deci?!\n+\n146\n26\n11\n24\n99+\n+\nHome\nFriends\nInbox\nProfile`,
  },
  {
    id: 'h-s-kalergi', kind: 'screenshot', category: REAL, input: '', accept: ['true', 'partial', 'unclear'], aberrant: ['false'], mustMention: ['burs', '88'], note: 'postare reală ZF + comentariu conspiraționist („Planul Kalergi”)',
    extracted: `12:29\n5G\n5619\nLIVE\nSTEM Following For You\nQ\nPlanul Kalergi în acțiune\n27 Ziarul Financiar. Urmărește\n37\n6h 3\nOana Toiu: Peste 88.000 de tineri\nau aplicat anul acesta pentru o\nbursă de studii în România. De\nunde vin? Top 10 este condus de\nPakistan (14.515), urmat de\nAfganistan (8.956), Bangladesh\n(8.916), Nigeria (4.524), Siria,\nPalestina, Ciad, Indonezia, Etiopia\nși Somalia ↓\nREDA\nP48\nPentru tinerii României? ALEXAPR\nBursele tăiate!\n39\nAlex41pr.\nCât mai acceptăm?\n#for #tiktokviral #fyyyyyyyyyyyy...more\nSee translation\n42\n163\nSCOTT BENSON BAND\n99+\n+\nHome\nFriends\nInbox\nProfile`,
  },
  {
    id: 'h-s-baraje-curent', kind: 'screenshot', category: REAL, input: '', accept: ['true', 'partial', 'unclear'], aberrant: ['false'], mustMention: ['curent', 'econom'], note: 'fapt: Bolojan îndeamnă la economisirea curentului; restul e comentariu',
    extracted: `14:16\nQ Find related content\nا.\n59\nSearch\nGuru pro-europenilor ne\nîndemână să strângem curea și să\nnu risipim curent asta era\nmotivul golirii barajelor? Afară cu\nPNL PSD USR UDMR din\nparlament! Lăsați oameni\ncompetenți să vă ocupe posturile\nGUV\nROM\ntRepost to followers\nSM96MMR ⚫ 1w ago\nBolojan îndeamnă la economisirea\ncurentului electric! Alo mucopitecii... more\nSee translation\nAdd comment...\n+\n91\n21\n6\n15\n☑\n@.`,
  },
  {
    id: 'h-s-anunt-grant', kind: 'screenshot', category: REAL, input: '', accept: ['unclear', 'true', 'partial'], aberrant: ['false'], note: 'anunț de finanțare, nu o afirmație disputată',
    extracted: `16:22\nTineri pentru Sustenabil...\n1 mii de urmăritori\nleri\nSOCIAL SHIFTERS\nULOBAL\nINNOVATION\nCHALLENGE\nGlobal Innovation Challenge 2026 | Social Shifters\n→→→ socialshifters.co\nDacă ai între 18 și 30 de ani și conduci un\nproiect sau un startup existent ce produce\ndeja un impact social sau de mediu concret,\niată oportunitatea perfectă pentru tine!\nProgramul oferit de Global Innovation\nChallenge 2026 îți pune la dispoziție finanțare\nprin granturi, suport gratuit și o poartă către\nnoi oportunități.\nIdeea sau proiectul înscris trebuie să\ncontribuie la cel puțin unul dintre Obiectivele\nde Dezvoltare Durabilă ale Națiunilor Unite\n(SDGs).\nFEB\n24 Deadline: 31 august 2026\n> Aplică aici:\nhttps://www.socialshifters.co/global\n-innovation-challenge/`,
  },
  {
    id: 'h-u-lege-drone', kind: 'url', category: REAL, input: '', accept: ['true', 'partial'], aberrant: ['false'],
    extracted: 'Deputații au adoptat proiectul de lege care permite doborârea dronelor rusești. AUR, SOS și POT au votat împotrivă. Deputații au dat, miercuri, în plen, un vot favorabil proiectului de lege privind controlul utilizării spațiului aerian național, respectiv pentru reglementarea unor măsuri în acest sens. Inițiativa legislativă...',
  },
  {
    id: 'h-u-drona-plauru', kind: 'url', category: REAL, input: '', accept: ['true', 'partial'], aberrant: ['false'],
    extracted: 'VIDEO Armata a detonat drona găsită vineri la Plauru. O dronă descoperită vineri în zona localității Plauru, jud. Tulcea, a fost distrusă prin detonare, a anunțat Ministerul Apărării Naționale sâmbătă.',
  },

  // ── Written in the same manner: accusations that are documented ────────────
  { id: 'x-basescu-securitate', kind: 'text', category: SIMILAR, input: 'Traian Basescu a fost colaborator al Securitatii', accept: ['true', 'partial'], aberrant: ['false'], note: 'decizie definitivă ÎCCJ, 2022' },
  { id: 'x-bolojan-securist', kind: 'text', category: SIMILAR, input: 'bolojan a fost securist', accept: ['false', 'unclear'], aberrant: ['true', 'partial'] },
  { id: 'x-iliescu-murit', kind: 'text', category: SIMILAR, input: 'Ion Iliescu a murit', accept: ['true'], aberrant: ['false'], note: 'august 2025' },
  { id: 'x-iohannis-murit', kind: 'text', category: SIMILAR, input: 'klaus iohannis a murit', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'x-private-theft', kind: 'text', category: SIMILAR, input: 'Popescu Ion din Vaslui a furat bani de la primarie', accept: ['unclear'], aberrant: ['true'], note: 'acuzație la adresa unei persoane private' },
  { id: 'x-toti-hoti', kind: 'text', category: SIMILAR, input: 'toti politicienii sunt hoti', accept: ['unclear', 'partial'], aberrant: ['true', 'false'] },

  // ── Recent Romanian politics, colloquial ───────────────────────────────────
  { id: 'x-georgescu-tur1', kind: 'text', category: SIMILAR, input: 'Calin Georgescu a castigat primul tur al alegerilor prezidentiale din 2024', accept: ['true'], aberrant: ['false'] },
  { id: 'x-alegeri-anulate', kind: 'text', category: SIMILAR, input: 'CCR a anulat alegerile prezidentiale din 2024', accept: ['true'], aberrant: ['false'] },
  { id: 'x-alegeri-bruxelles', kind: 'text', category: SIMILAR, input: 'Alegerile din 2024 au fost anulate la ordinul Bruxelles-ului', accept: ['false', 'unclear', 'partial'], aberrant: ['true'] },
  { id: 'x-simion-presedinte', kind: 'text', category: SIMILAR, input: 'George Simion a castigat alegerile prezidentiale din 2025', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'x-iohannis-2025', kind: 'text', category: SIMILAR, input: 'Klaus Iohannis a demisionat din functia de presedinte in februarie 2025', accept: ['true'], aberrant: ['false'] },
  { id: 'x-pensii-jumate', kind: 'text', category: SIMILAR, input: 'bolojan a taiat pensiile la jumate', accept: ['false'], aberrant: ['true'] },
  { id: 'x-tva-21', kind: 'text', category: SIMILAR, input: 'a crescut tva la 21 la suta', accept: ['true'], aberrant: ['false'] },
  { id: 'x-ukr-2000', kind: 'text', category: SIMILAR, input: 'ucrainenii primesc 2000 de euro pe luna de la statul roman', accept: ['false'], aberrant: ['true'] },
  { id: 'x-deficit', kind: 'text', category: SIMILAR, input: 'Romania a avut in 2024 cel mai mare deficit bugetar din Uniunea Europeana', accept: ['true', 'partial'], aberrant: ['false'] },
  { id: 'x-q-pensii-speciale', kind: 'text', category: SIMILAR, input: 'e adevarat ca s-au desfiintat pensiile speciale?', accept: ['false', 'unclear', 'partial'], aberrant: ['true'] },

  // ── Denials: the statement is true because the hoax is false ───────────────
  { id: 'x-neg-ror', kind: 'text', category: SIMILAR, input: 'Vaccinul ROR nu provoaca autism.', accept: ['true'], aberrant: ['false'] },
  { id: 'x-neg-euro', kind: 'text', category: SIMILAR, input: 'Romania nu a adoptat moneda euro.', accept: ['true'], aberrant: ['false'] },
  { id: 'x-neg-plat', kind: 'text', category: SIMILAR, input: 'Nu este adevarat ca Pamantul este plat.', accept: ['true'], aberrant: ['false'] },
  { id: 'x-neg-razboi', kind: 'text', category: SIMILAR, input: 'Nicusor Dan nu a semnat nicio declaratie de razboi la Vilnius.', accept: ['true', 'partial'], aberrant: ['false'] },
  { id: 'x-neg-5g', kind: 'text', category: SIMILAR, input: 'Este fals ca retelele 5G raspandesc coronavirusul.', accept: ['true'], aberrant: ['false'] },

  // ── Health, history, EU rules ──────────────────────────────────────────────
  { id: 'x-ivermectina', kind: 'text', category: SIMILAR, input: 'ivermectina vindeca covid', accept: ['false'], aberrant: ['true'] },
  { id: 'x-haarp', kind: 'text', category: SIMILAR, input: 'cutremurul din Turcia a fost provocat de HAARP', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'x-chemtrails', kind: 'text', category: SIMILAR, input: 'avioanele ne otravesc cu chemtrails', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'x-tepes-vampir', kind: 'text', category: SIMILAR, input: 'vlad tepes a fost vampir', accept: ['false'], aberrant: ['true', 'partial'] },
  { id: 'x-mihai-1600', kind: 'text', category: SIMILAR, input: 'Mihai Viteazul a unit cele trei tari romane in 1600', accept: ['true', 'partial'], aberrant: ['false'] },
  { id: 'x-dacii-latina', kind: 'text', category: SIMILAR, input: 'Dacii vorbeau latina inaintea romanilor, romanii au invatat limba de la daci', accept: ['false'], aberrant: ['true'] },
  { id: 'x-insecte', kind: 'text', category: SIMILAR, input: 'UE ne obliga sa mancam insecte', accept: ['false'], aberrant: ['true'] },
  { id: 'x-porc-craciun', kind: 'text', category: SIMILAR, input: 'UE a interzis taierea porcului de Craciun in gospodarie', accept: ['false'], aberrant: ['true'] },
  { id: 'x-2035', kind: 'text', category: SIMILAR, input: 'UE interzice vanzarea masinilor noi pe benzina si motorina din 2035', accept: ['true', 'partial', 'unclear'], aberrant: ['false'], note: 'adoptat în 2023, relaxat ulterior: depinde de momentul legislativ' },
  { id: 'x-gdpr', kind: 'text', category: SIMILAR, input: 'Regulamentul UE 2016/679 este regulamentul privind protectia datelor (GDPR)', accept: ['true'], aberrant: ['false'] },
  { id: 'x-rosia-montana', kind: 'text', category: SIMILAR, input: 'Rosia Montana a fost vanduta canadienilor', accept: ['false', 'partial', 'unclear'], aberrant: [] },
];
