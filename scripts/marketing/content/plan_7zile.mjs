// Plan editorial 7 zile · 17–24 august 2026 (TikTok / Reels).
// Fiecare obiect = o postare-slideshow. Randate de: node scripts/marketing/render_plan.mjs
// Output: public/marketing/plan-7-zile-17-august-24-august/<id>/slide_N.png + caption.txt
//
// REGULI DE ADEVĂR (ca în posts.mjs — NU inventa):
//   Scor ↔ verdict:  >=85 true · 60-84 partial · 40-59 unclear · <40 false
//   Doar afirmații CHIAR verificate; sursele citate trebuie să existe.
//
// Structura zilei: 1 fact-check „principal” (verdictStamp / tacereTipografica / terminal /
//   stampilaArhiva) + 1 „extra/joc” pe un alt format (analizaFoto, mitAdevar, explainer,
//   statistica, fotoBanda, barometru, manifest). Reel-urile refolosesc slideshow-urile
//   (vezi PLAN.md pentru maparea zilnică și scripturile video dedicate).

export const planPosts = [

  // ═══════════════════════ ZIUA 1 · Luni 17 aug ═══════════════════════
  // Principal — VERDICT STAMP · hantavirus „COVID-26” (European, mai–2026)
  {
    id: 'd1-main-hantavirus',
    hook: 'Hantavirusul NU e „COVID-26 făcut în laborator”. Am verificat panica de pe feed 🦠',
    format: 'verdictStamp',
    channel: 'tiktok',
    sound: 'synth misterios, lent (tensiune care se rezolvă la verdict)',
    eyebrow: 'Viral pe rețele · verificat',
    claimIntro: 'Circulă acum că',
    claim: '„Hantavirusul e un COVID nou, făcut în laborator.”',
    verdict: 'false',
    score: '9%',
    confidenceNote: 'certitudinea\nverdictului',
    evidenceTitle: 'Ce spun sursele',
    evidence: [
      { src: 'EDMO · Euronews', tone: 'false',
        text: 'Zero dovezi că ar fi creat în laborator — e un virus de rozătoare cunoscut de zeci de ani.' },
      { src: 'Forbes · experți în boli infecțioase', tone: 'false',
        text: 'Nu e „COVID nou”: se transmite rar între oameni, nu prin aer ca gripa.' },
      { src: 'Verificat de Verifact', tone: 'neutral',
        text: '„Leacul” cu Ivermectină e imposibil biologic — virusul nu intră în nucleul celulei.' },
    ],
    cta: {
      line: 'Panica se viralizează. Verific-o întâi.',
      sub: 'Orice „virus nou” de pe feed — treci-l prin surse înainte de share.',
    },
    caption: `Un focar de hantavirus pe un vas de croazieră (Argentina→Tenerife, mai 2026) a reînviat toate teoriile din pandemie: „COVID-26”, „făcut în laborator”, „se tratează cu Ivermectină”. Le-am verificat pe rând — pică toate. E un virus vechi, de rozătoare, nu o armă nouă. Nu intra în panică pe feed.`,
    hashtags: ['#verifact', '#hantavirus', '#factcheck', '#sanatate', '#dezinformare', '#covid'],
  },
  // Extra/joc — ANALIZA FOTO · deepfake Musk crypto (dosar: găsește semnele)
  {
    id: 'd1-extra-deepfake-musk',
    hook: 'Elon Musk „îți dublează banii în crypto”? E deepfake — uite cum îți dai seama 🚩',
    format: 'analizaFoto',
    channel: 'tiktok',
    sound: 'tensiune / investigație, ritm care urcă',
    eyebrow: 'Dosar de investigație',
    coverTitle: 'Musk „îți dublează\nbanii în crypto”?',
    photo: '[ CAPTURĂ: cadru dintr-un video-reclamă crypto ]',
    photoFile: 'musk.jpg', // portret domeniu public (U.S. Air Force), inclus în folder
    photoHow: 'Imaginea (portret Musk, domeniu public U.S. Air Force) e deja inclusă în slide. Ca s-o schimbi, înlocuiește musk.jpg din acest folder și re-rulează render_plan.mjs.',
    coverScore: '4%',
    coverVerdict: 'Fals, făcut cu AI',
    coverNote: 'gura nu se potrivește cu vocea',
    findingsTitle: 'Cum îți dai seama',
    findings: [
      'Gura nu se mișcă în ritmul cuvintelor — clasic la clipurile făcute cu AI.',
      'Vocea sună plată, robotică, fără pauzele normale de respirație.',
      'Contul care a postat e nou-nouț, fără nicio postare mai veche.',
      'Linkul te duce pe un site fără nume de firmă și fără nimic verificabil.',
    ],
    finalScore: '4%',
    finalNote: 'Pe scurt: e o țeapă cu fața lui Musk. Nu trimite bani — raportează clipul.',
    cta: {
      line: 'Nimeni nu-ți dublează\nbanii dintr-un clip.',
      sub: 'Dacă un video „garantează” profit, e țeapă. Lipește-l în Verifact și afli în câteva secunde.',
    },
    caption: `Sigur ai văzut clipuri cu Elon Musk care „îți dublează banii în crypto”. Sunt false — fața și vocea lui sunt copiate cu AI. Uite la ce te uiți ca să nu te păcălești: gura nu se potrivește cu vocea, contul e nou, linkul duce nicăieri. Regula simplă: nicio persoană celebră nu-ți face bani printr-un clip. Dacă promite profit garantat, e țeapă. (Doar în 2025, americanii au pierdut 1,1 miliarde $ din astfel de escrocherii — date Deloitte.)`,
    hashtags: ['#verifact', '#deepfake', '#scam', '#crypto', '#ai', '#factcheck'],
  },

  // ═══════════════════════ ZIUA 2 · Marți 18 aug ═══════════════════════
  // Principal — TĂCERE TIPOGRAFICĂ · nostalgie Ceaușescu (România)
  {
    id: 'd2-main-ceausescu',
    hook: '„Pe vremea lui Ceaușescu se trăia mai bine.” Nostalgia vs. ce arată datele',
    format: 'tacereTipografica',
    channel: 'tiktok',
    sound: 'pian melancolic, lent',
    claim: 'Pe vremea lui\nCeaușescu se\ntrăia mai bine.',
    verdict: 'false',
    coverSub: 'O afirmație pe care ți-o servește nostalgia de pe feed. Am verificat-o. Glisează. →',
    why: 'Standardul de viață era mai scăzut: raționalizare la pâine, ulei, zahăr, curent și căldură, plus cozi și frig în anii ’80. „Mai bine” e nostalgie, nu date.',
    whySource: 'Factual.ro · date istorice INS',
    caption: `„Se trăia mai bine pe vremea lui Ceaușescu” — fals. Anii ’80 au însemnat raționalizare la pâine, ulei, zahăr, curent și căldură, cozi și frig. Nostalgia păstrează siguranța locului de muncă și șterge penuria. Memoria selectivă nu e același lucru cu adevărul.`,
    hashtags: ['#verifact', '#istorie', '#comunism', '#ceausescu', '#factcheck', '#romania'],
  },
  // Extra/joc — MIT / ADEVĂR · autobuze Bacău (light, local)
  {
    id: 'd2-extra-autobuze-bacau',
    hook: '„Autobuze cu ușile pe partea greșită în Bacău.” Poza reală spune altceva 🚌',
    format: 'mitAdevar',
    channel: 'tiktok',
    sound: 'jucăuș, upbeat',
    myth: 'Bacăul a luat autobuze cu ușile spre trafic',
    mythNote: 'O poză virală: „primăria a dat bani pe autobuze englezești defecte”',
    truth: 'Poza e cu un autobuz din Anglia — nu cu cel cumpărat de Bacău.',
    photoFile: 'autobuz.jpg', // autobuz UK (Routemaster, domeniu public) — exemplu ilustrativ
    inner: {
      title: 'Ce s-a întâmplat de fapt',
      body: 'A circulat o poză cu un <f>autobuz britanic</f> (volan pe dreapta, uși spre bordură pe partea lor) prezentată drept achiziția Bacăului. <t>Autobuzele livrate real au ușile pe partea corectă</t> pentru circulația pe dreapta din România. Nimeni nu a cumpărat autobuze „defecte”.',
      stat: null,
    },
    cta: {
      line: 'O poză nu e o dovadă.',
      sub: 'O imagine dintr-o altă țară, pusă pe seama alteia — clasic. Verifică sursa.',
    },
    caption: `Ți-a apărut și ție? 🚌 „Primăria Bacău a cumpărat autobuze englezești cu ușile pe partea greșită, aruncă banii pe geam.” De fapt: poza virală e cu un autobuz DIN Anglia, nu cu cel livrat orașului. E o imagine dintr-o altă țară lipită peste o știre locală. Cel mai ușor fake de înghițit e cel care te face să râzi și să te enervezi în același timp.`,
    hashtags: ['#verifact', '#bacau', '#factcheck', '#local', '#fakenews', '#romania'],
  },

  // ═══════════════════════ ZIUA 3 · Miercuri 19 aug ═══════════════════════
  // Principal — TERMINAL · app UE verificare vârstă = „supraveghere” (EUvsDisinfo, apr–2026)
  {
    id: 'd3-main-app-ue-varsta',
    hook: 'NU, aplicația UE de verificare a vârstei nu te spionează. Ce e de fapt 🇪🇺',
    format: 'terminal',
    channel: 'tiktok',
    sound: 'lofi / tech beat, discret',
    claim: 'Aplicația UE de\nverificare a vârstei\ne pentru supraveghere.',
    verdict: 'false',
    score: '14%',
    explanation: 'Aplicația dovedește doar că ai peste 18 ani, fără să dezvăluie cine ești. „Hack-ul” de 2 minute a fost o eroare de securitate, nu o dovadă că e făcută să te spioneze.',
    sources: ['EUvsDisinfo — verificare', 'Comisia Europeană', 'cybernews — analiză tehnică'],
    caption: `„UE lansează o aplicație de supraveghere deghizată în verificare de vârstă.” Fals, spune EUvsDisinfo: e o teorie a conspirației fără nicio dovadă. Aplicația confirmă că ești major fără să spună cine ești. A avut o vulnerabilitate reală (spartă în 2 min) — dar bug ≠ intenție de spionaj. Amplificat de Durov/RT.`,
    hashtags: ['#verifact', '#ue', '#confidentialitate', '#tech', '#factcheck', '#euvsdisinfo'],
  },
  // Extra/joc — EXPLAINER · 5 semne că o poză e AI (ghid + joc)
  {
    id: 'd3-extra-semne-poza-ai',
    hook: '5 semne că o poză e făcută cu AI. La câte te prinzi din prima? 🤖',
    format: 'explainer',
    channel: 'tiktok',
    sound: 'educativ, ritm clar',
    eyebrow: 'Ghid Verifact',
    kicker: 'Testează-ți ochiul',
    title: 'E poza\nreală?',
    signs: [
      { title: 'Mâinile și degetele', body: 'AI încă greșește: 6 degete, articulații topite, inele care apar și dispar.' },
      { title: 'Textul din imagine', body: 'Litere pe indicatoare, tricouri sau afișe apar mototolite sau pur inventate.' },
      { title: 'Fundalul care „curge”', body: 'Linii care se îndoaie, oameni fără față, obiecte lipite unele de altele.' },
      { title: 'Pielea prea perfectă', body: 'Textură de ceară, lumină fără sursă, ochi ușor desincronizați.' },
      { title: 'Zero sursă', body: 'Nicio publicație serioasă. Apărută „de nicăieri”, pe un cont nou.' },
    ],
    cta: {
      line: 'Când te îndoiești,\nverifică.',
      sub: 'Lipești imaginea în Verifact și primești analiza + surse.',
    },
    caption: `Salvează pentru data viitoare când o poză „prea tare ca să fie reală” îți apare pe feed. 5 semne că e făcută cu AI 👇 Joc: la ce număr te-ai prins deja singur? Scrie în comentarii.`,
    hashtags: ['#verifact', '#ai', '#deepfake', '#ghid', '#factcheck', '#imagini'],
  },

  // ═══════════════════════ ZIUA 4 · Joi 20 aug ═══════════════════════
  // Principal — ȘTAMPILĂ DE ARHIVĂ · rațonalizare comunistă (România)
  // ⚠ RENDERER-UL `stampilaArhiva` NU EXISTĂ ÎNCĂ — se randează după ce primesc HTML-ul
  //   din „Formate TikTok.dc.html”. Câmpurile de mai jos sunt în forma verdictStamp;
  //   le remapez pe câmpurile reale ale template-ului când îl implementez.
  {
    id: 'd4-main-rationalizare',
    hook: '„România, singura țară comunistă cu raționalizare la mâncare.” Dosar: RESPINS 📁',
    format: 'stampilaArhiva',
    channel: 'tiktok',
    sound: 'ambient de arhivă, sunet de ștampilă',
    dossierNr: '0820',
    dossierDate: '20.08.2026',
    claim: '„România — singura țară\ncomunistă care a\nraționalizat mâncarea.”',
    verdict: 'false',
    reasonTitle: 'Concluzia comisiei',
    reason: 'Cartelele la alimente și penuria de energie au existat în <f>Polonia, URSS și alte state din bloc</f> în anii ’80. Raționalizarea a fost o practică comună economiilor planificate — <t>nu o excepție românească</t>. Cazul nostru a fost sever, dar „singurul” e fals.',
    probe: 'Factual.ro · documente istorice din blocul comunist',
    cta: {
      line: '„Singurul” e steag roșu\npentru fake.',
      sub: 'Superlativele absolute („singurul”, „niciodată”) cad primele la verificare.',
    },
    caption: `„România — singura țară comunistă cu raționalizare.” Fals. Cartelele la mâncare și penuria de energie au fost realitate în Polonia, URSS și alte state din bloc în anii ’80. Cazul nostru a fost dur, dar „singurul” e o exagerare. Atenție la superlative.`,
    hashtags: ['#verifact', '#istorie', '#comunism', '#factcheck', '#romania', '#arhiva'],
  },
  // Extra/joc — STATISTICĂ · $1,1 mld pierderi deepfake 2025 (internațional)
  {
    id: 'd4-extra-statistica-deepfake',
    hook: '1,1 miliarde $ furați într-un singur an cu o voce clonată. Nu e SF.',
    format: 'statistica',
    channel: 'tiktok',
    sound: 'impact / news, lovitură pe cifră',
    eyebrow: 'Cifra zilei',
    bigNumber: '$1,1 mld',
    bigLabel: 'pierduți în SUA în 2025\ndin escrocherii cu deepfake',
    source: 'Surfshark / Deloitte · 2025 — de 3× mai mult ca în 2024 ($360 mil.)',
    twist: {
      kicker: 'De ce te privește',
      title: 'Ținta nu mai e „naivul”.',
      body: 'Vocile și fețele clonate imită șefi, bănci și rude. Un apel „de la fiul tău” sau un video „cu Musk” costă acum cât un cont golit. Regula simplă: confirmă pe alt canal înainte să plătești.',
    },
    cta: {
      line: 'Nu crede fața. Verifică sursa.',
      sub: 'Screenshot sau link în Verifact → raport cu surse în secunde.',
    },
    caption: `1,1 miliarde de dolari. Atât au pierdut americanii în 2025 din escrocherii cu deepfake — de trei ori mai mult ca în 2024 (Deloitte/Surfshark). Nu mai e SF: e o voce clonată care sună ca șeful tău. Confirmă mereu pe alt canal.`,
    hashtags: ['#verifact', '#deepfake', '#scam', '#ai', '#statistica', '#securitate'],
  },

  // ═══════════════════════ ZIUA 5 · Vineri 21 aug ═══════════════════════
  // Principal — VERDICT STAMP · secetă / Olt (România, topical)
  {
    id: 'd5-main-seceta-olt',
    hook: '„Nu e secetă, uite că Oltul are apă.” De ce nu ține argumentul 💧',
    format: 'verdictStamp',
    channel: 'tiktok',
    sound: 'synth misterios, lent',
    eyebrow: 'Afirmație verificată',
    claimIntro: 'Se spune că',
    claim: '„Nu e secetă — uite, Oltul are apă.”',
    verdict: 'false',
    score: '26%',
    confidenceNote: 'certitudinea\nverdictului',
    evidenceTitle: 'Ce spun sursele',
    evidence: [
      { src: 'ANM · Administrația Meteo', tone: 'false',
        text: 'Seceta se măsoară pe umiditatea solului și debite, nu pe un singur râu.' },
      { src: 'Factual.ro', tone: 'false',
        text: 'Un râu cu apă nu anulează seceta pedologică din alte regiuni.' },
      { src: 'Verificat de Verifact', tone: 'neutral',
        text: 'Datele oficiale arătau deficit în mai multe județe în vara 2026.' },
    ],
    cta: {
      line: 'Un exemplu nu bate datele.',
      sub: 'Verifică o afirmație cu surse oficiale, nu cu o singură poză.',
    },
    caption: `„Nu e secetă, uite Oltul are apă.” Fals. Seceta nu se măsoară cu ochiul pe un râu, ci pe umiditatea solului și debite, județ cu județ. În vara 2026 datele ANM arătau deficit în mai multe zone. Un exemplu ≠ o dovadă.`,
    hashtags: ['#verifact', '#seceta', '#clima', '#romania', '#factcheck', '#anm'],
  },
  // Extra/joc — FOTO + BANDĂ · „poza dovedește seceta?” (context lipsă)
  {
    id: 'd5-extra-foto-context',
    hook: 'Poza asta „dovedește” seceta din 2026? Pune-i o singură întrebare 🕵️',
    format: 'fotoBanda',
    channel: 'tiktok',
    sound: 'ambient/actualitate, ritm mediu',
    eyebrow: 'Context lipsă',
    photo: '[ FOTO: albie de râu scăzută ]',
    photoFile: 'seceta.jpg', // lac/albie secată (California 2009), domeniu public — exemplu
    photoHow: 'Imaginea (albie secată, domeniu public) e deja inclusă. Poate fi înlocuită cu o poză reală, datată și localizată, din România — dar atunci NU mai e „context lipsă”. Pentru mesajul postării, un exemplu generic e corect.',
    verdict: 'unclear',
    verdictText: 'Verdict: lipsește contextul',
    headline: 'Poza asta „dovedește” seceta din 2026?',
    inner: {
      eyebrow: 'Ce lipsește',
      title: 'Fără dată, fără loc',
      body: 'O imagine cu apă scăzută poate fi <f>din alt an sau alt râu</f>. Fără dată, locație și sursă, <t>nu dovedește nimic despre 2026</t> — nici că e secetă, nici că nu e.',
      source: 'Verifact · verificare de imagini',
    },
    cta: {
      line: 'Întreabă: când și unde?',
      sub: 'Verifică o imagine în Verifact înainte s-o crezi.',
    },
    caption: `Joc de detectiv 🕵️ O poză cu un râu secat „demonstrează” criza din 2026? Nu neapărat. Fără dată, loc și sursă, poate fi din 2012 sau din altă țară. Prima întrebare la orice imagine virală: CÂND și UNDE a fost făcută?`,
    hashtags: ['#verifact', '#context', '#seceta', '#factcheck', '#imagini', '#dezinformare'],
  },

  // ═══════════════════════ ZIUA 6 · Sâmbătă 22 aug ═══════════════════════
  // Principal — TĂCERE TIPOGRAFICĂ · Dunărea nivel normal (România, topical)
  {
    id: 'd6-main-dunarea',
    hook: '„Dunărea e la nivel normal în 2026.” Ce zic de fapt măsurătorile 🌊',
    format: 'tacereTipografica',
    channel: 'tiktok',
    sound: 'pian melancolic / ambient de apă',
    claim: 'Dunărea e la\nnivel normal\nîn vara 2026.',
    verdict: 'false',
    coverSub: 'O afirmație liniștitoare de pe feed. Am verificat-o cu datele. Glisează. →',
    why: 'Datele hidrologice arătau debite sub media multianuală, cu cote de atenție în porturi. „Normal” e exact ce nu era.',
    whySource: 'Factual.ro · date hidrologice',
    caption: `„Dunărea e la nivel normal, nu exagerați.” Fals. Măsurătorile hidrologice arătau debite sub media multianuală și cote de atenție în porturi în vara 2026. „Liniștitor” nu e același lucru cu „adevărat”. Datele nu se ceartă.`,
    hashtags: ['#verifact', '#dunarea', '#seceta', '#clima', '#factcheck', '#romania'],
  },
  // Extra/joc — BAROMETRU · traiectoria fraudelor cu AI (Deloitte)
  {
    id: 'd6-extra-grafic-ai',
    hook: 'De la 12 la 40 de miliarde $: cât ne vor costa fraudele cu AI 📈',
    format: 'graficTrend',
    channel: 'tiktok',
    sound: 'news / date, ritm constant',
    eyebrow: 'Statistica zilei',
    title: 'Cât ne costă fraudele cu AI',
    chart: {
      yMax: 40, yStep: 10, unit: '$', yAxisLabel: 'miliarde $ (SUA)',
      legendReal: '2023 real', legendProj: '2024–2027 proiecție',
      points: [
        { label: '2023', v: 12.3, real: true },
        { label: '2024', v: 16.2 },
        { label: '2025', v: 21.4 },
        { label: '2026', v: 28.3 },
        { label: '2027', v: 40 },
      ],
      source: 'Deloitte — Center for Financial Services (creștere ~32%/an; 2024–2027 proiecție)',
    },
    twist: {
      kicker: 'De ce contează',
      title: 'Curba nu se oprește.',
      body: 'De la 12,3 la ~40 mld $ în patru ani — fraudele cu voce și chip clonat cresc mai repede decât reflexul nostru de a le verifica. Nu poți opri valul, dar poți antrena un obicei: confirmă pe alt canal orice îți cere bani, urgent, printr-un apel sau video.',
    },
    cta: {
      line: 'Curba urcă.\nReflexul tău la fel.',
      sub: 'Verifică orice cere bani sau date, oricât de „oficial” pare.',
    },
    caption: `O statistică de ținut minte: pierderile din fraude cu AI generativ în SUA cresc de la 12,3 miliarde $ (2023, cifră reală Deloitte) spre ~40 de miliarde $ proiectate în 2027. Nu e un vârf de moment — e o pantă. Antrenează-ți reflexul: confirmă pe alt canal înainte să plătești.`,
    hashtags: ['#verifact', '#deepfake', '#ai', '#date', '#statistica', '#securitate'],
  },

  // ═══════════════════════ ZIUA 7 · Duminică 23 aug ═══════════════════════
  // Principal — TERMINAL · „războiul mare începe în septembrie” (fake RO recurent)
  {
    id: 'd7-main-razboi-septembrie',
    hook: '„România intră în război în septembrie.” Același fake, în fiecare an 🚩',
    format: 'terminal',
    channel: 'tiktok',
    sound: 'lofi / tech beat, tensiune joasă',
    claim: 'România va intra\nîn război în\nseptembrie.',
    verdict: 'false',
    score: '7%',
    explanation: 'Predicție recirculată în fiecare an, fără nicio sursă oficială. Nici MApN, nici NATO nu au anunțat vreo dată. Se sprijină mereu pe „un prieten care lucrează acolo”.',
    sources: ['Europa Liberă — fake news recurente', 'Factual.ro', 'Verifact'],
    caption: `În fiecare toamnă revine: „România intră în război în septembrie”, „vine mobilizarea”, „am auzit de la cineva din sistem”. E același fake reciclat an de an. Sursa oficială? Nu există niciodată. Panica de pe grupurile de familie nu e informație. Verifică înainte să dai mai departe.`,
    hashtags: ['#verifact', '#fakenews', '#razboi', '#panica', '#factcheck', '#romania'],
  },
  // Extra — MANIFEST · de ce Verifact (postare de pin, închide săptămâna)
  {
    id: 'd7-extra-manifest',
    hook: 'Cum verifici orice știre în ~12 secunde. Gratuit 👇',
    format: 'manifest',
    channel: 'tiktok',
    pin: true,
    sound: 'inspirațional, cald',
    eyebrow: 'Verifact',
    statement: 'Pleacă mai bine\ninformat.',
    sub: 'Nu-ți spunem ce să crezi. Îți arătăm sursele și te lăsăm să decizi.',
    listTitle: 'Cum funcționează',
    list: [
      { k: 'Lipești', v: 'Text, link sau screenshot — orice ai văzut pe feed.', tone: 'neutral' },
      { k: 'Verificăm', v: '4 straturi de surse: oficiale, presă, fact-check, context.', tone: 'true' },
      { k: 'Primești', v: 'Un verdict cu scor și sursele la vedere, în ~12 secunde.', tone: 'true' },
    ],
    cta: {
      line: 'Verifică înainte\nsă crezi.',
      sub: 'Gratuit, pe verifact.ro',
    },
    caption: `O săptămână de verificări, un singur principiu: pleacă mai bine informat. Nu-ți spunem ce să crezi — îți punem sursele pe masă. Lipești text, link sau screenshot și primești un verdict cu surse în ~12 secunde. Gratuit. #pin`,
    hashtags: ['#verifact', '#factcheck', '#dezinformare', '#romania', '#gandestecritic', '#pin'],
  },

];
