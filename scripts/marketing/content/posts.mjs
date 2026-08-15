// Conținut pentru slideshow-urile Verifact (TikTok / Reels / feed).
// Fiecare obiect = o postare. `format` alege sistemul de design (vezi Formate TikTok.dc.html):
//   verdictStamp (1a) · fotoBanda (1b) · mitAdevar (1c) · barometru (1d) · explainer (1e) · analizaFoto (1f)
//
// REGULI DE ADEVĂR (nu inventa):
//   - Scorul trebuie să se potrivească cu verdictul real Verifact:
//       >=85 true (verde) · 60-84 partial (chihlimbar) · 40-59 unclear (ardezie) · <40 false (roșu)
//   - Folosește doar afirmații care CHIAR au fost verificate. Sursele citate trebuie să existe.
//
// FOTO: doar `fotoBanda` și `analizaFoto` cer o imagine. Câmpul `photo` e textul
// din placeholder — îl înlocuiești în PostClaw/editor cu poza reală (vezi nota `photoHow`).

export const posts = [

  // ─────────────────────────────────────────── 1a · VERDICT STAMP ───────────
  {
    id: 'vitamina-c-raceala',
    format: 'verdictStamp',
    sound: 'synth misterios, lent (ex: „Paris” – Else) sau bătaie de ceas',
    eyebrow: 'Afirmație verificată',
    claimIntro: 'Se spune că',
    claim: '„Vitamina C previne răceala.”',
    verdict: 'false',
    score: '22%',
    confidenceNote: 'certitudinea\nverdictului',
    evidenceTitle: 'Ce spun sursele',
    evidence: [
      { src: 'who.int · OMS', tone: 'false',
        text: 'Nu previne răceala; poate scurta ușor durata la unele persoane.' },
      { src: 'Cochrane Review', tone: 'false',
        text: 'Efect nesemnificativ pentru populația generală sănătoasă.' },
      { src: 'Verificat de Verifact', tone: 'neutral',
        text: 'Zero surse medicale care să susțină „prevenirea completă”.' },
    ],
    cta: {
      line: 'Nu da mai departe până nu verifici.',
      sub: 'Text, screenshot sau link — raport cu surse în ~12 secunde.',
    },
    caption: `„Vitamina C previne răceala” — o auzi din copilărie. Am trecut afirmația prin cele 4 straturi de surse Verifact: OMS și Cochrane spun altceva. Nu e vorba că nu ajută deloc — e vorba că „previne” e prea mult. Salvează pentru sezonul rece.`,
    hashtags: ['#verifact', '#factcheck', '#vitaminaC', '#sănătate', '#igienadigitala', '#mituri'],
  },

  // ─────────────────────────────────────────── 1b · FOTO + BANDĂ ────────────
  {
    id: 'ue-masini-benzina-2035',
    format: 'fotoBanda',
    sound: 'ambient/actualitate, ritm mediu',
    eyebrow: 'Actualitate',
    photo: '[ FOTO: stație de încărcare / trafic urban ]',
    photoHow: 'Pune o poză orizontală, luminoasă (stație EV, autostradă, oraș). Sursă recomandată: Unsplash/Pexels (liber de drepturi). Textul de credit din colț: „foto: Unsplash”.',
    photoCredit: 'foto: Unsplash',
    verdict: 'partial',
    verdictText: 'Verdict: parțial · context',
    headline: 'UE interzice mașinile pe benzină din 2035?',
    inner: {
      eyebrow: 'Ce spune de fapt',
      title: 'Doar vânzarea celor noi',
      // <t>...</t> = subliniere verde (adevăr) · <f>...</f> = subliniere roșie (fals/nuanță)
      body: 'Regulamentul UE oprește <t>vânzarea de mașini NOI cu motor termic din 2035</t> — nu <f>interzice circulația</f> celor pe care le ai deja și nu confiscă nimic.',
      source: 'Consiliul UE · Reg. (UE) 2023/851',
    },
    cta: {
      line: 'Titlul spune „interzice”. Legea spune altceva.',
      sub: 'Verifică orice titlu alarmist înainte de share — pe verifact.ro.',
    },
    caption: `„Din 2035 UE îți interzice mașina pe benzină.” Titlul e conceput să te sperie. Ce spune de fapt regulamentul: se oprește doar vânzarea de mașini NOI cu motor termic — mașina ta actuală circulă în continuare. Diferența dintre „interzice” și „nu mai vinde noi” = tot. Sursă: Consiliul UE.`,
    hashtags: ['#verifact', '#factcheck', '#UE', '#mașini', '#2035', '#context'],
  },

  // ─────────────────────────────────────────── 1c · MIT vs ADEVĂR ───────────
  {
    id: 'zahar-brun-vs-alb',
    format: 'mitAdevar',
    sound: 'punchy, beat scurt cu „drop” pe tranziția mit→adevăr',
    myth: 'Zahărul brun e mai sănătos decât cel alb.',
    mythNote: 'se distribuie des pe TikTok',
    truth: 'Practic identic: ~4 kcal/g și aproape zero minerale în cantitățile reale.',
    inner: {
      title: 'Adevărul din spate',
      body: 'Zahărul brun are urme de melasă — de aici mitul. Dar diferența nutrițională e <f>nesemnificativă</f>.',
      stat: { aLabel: 'Alb', aVal: '387 kcal / 100g', bLabel: 'Brun', bVal: '380 kcal / 100g' },
    },
    cta: {
      line: '„Mai natural” nu înseamnă „mai sănătos”.',
      sub: 'Verifică miturile alimentare pe verifact.ro.',
    },
    caption: `Zahărul brun ≠ zahăr sănătos. Are urme de melasă (de aici culoarea și mitul), dar la cantitățile pe care le folosești real, diferența nutrițională e zero. 387 vs 380 kcal/100g. Corpul tău nu vede diferența. Salvează înainte de următoarea ceartă la cafea.`,
    hashtags: ['#verifact', '#factcheck', '#nutriție', '#mituri', '#zahăr', '#sănătate'],
  },

  // ─────────────────────────────────────────── 1d · BAROMETRUL ──────────────
  {
    id: 'barometru-saptamanal',
    format: 'barometru',
    sound: 'instrumental de „date/redacție”, tobe reținute',
    // ⚠ ÎNLOCUIEȘTE cu cifrele REALE din dashboard înainte de postare.
    period: '11–17 august',
    total: '1.240',
    totalNote: 'afirmații verificate\nde comunitatea Verifact',
    statA: { val: '61%', note: 'false sau\nînșelătoare', tone: 'false' },
    statB: { val: '11.8s', note: 'timp mediu\nde verificare', tone: 'true' },
    barsTitle: 'Teme cu cel mai\nmult fake news',
    bars: [
      { label: 'Sănătate', pct: 40, tone: 'false' },
      { label: 'Economie', pct: 35, tone: 'partial' },
      { label: 'Tehnologie', pct: 25, tone: 'unclear' },
    ],
    cta: {
      line: 'Săptămâna asta, 6 din 10 „știri” verificate erau false.',
      sub: 'Barometrul apare vinerea. Urmărește ca să nu pici în plasă.',
    },
    caption: `BAROMETRUL VERIDICITĂȚII · 11–17 august. 1.240 de afirmații verificate de comunitate, 61% false sau înșelătoare. Cel mai lovit domeniu: sănătatea. Cifre reale, agregate, anonime. Urmărește pentru ediția de vinerea viitoare.`,
    hashtags: ['#verifact', '#barometru', '#factcheck', '#dezinformare', '#România', '#date'],
  },

  // ─────────────────────────────────────────── 1e · EXPLAINER ───────────────
  {
    id: 'trei-semne-frica',
    format: 'explainer',
    sound: 'lo-fi calm, educativ',
    eyebrow: 'Igienă digitală',
    kicker: '3 semne că o știre',
    title: 'vrea doar\nsă te sperie',
    signs: [
      { title: 'Ți se cere să te înfurii, nu să gândești',
        body: 'Titlu la persoana a II-a, majuscule și semne de exclamare. Emoția vinde share-uri; adevărul nu are nevoie de ele.' },
      { title: 'Zero date verificabile',
        body: 'Nicio dată exactă, niciun nume de instituție, niciun număr de lege. Doar „se spune”, „surse”, „un expert”.' },
      { title: 'Nu apare pe nicio sursă serioasă',
        body: 'Cauți titlul pe Google și nu-l găsește nicio redacție reală — doar pagini-clonă și grupuri de Facebook.' },
    ],
    cta: {
      line: 'Frica se distribuie. Verifică înainte.',
      sub: 'Un screenshot pe verifact.ro și vezi în ~12 secunde dacă e real.',
    },
    caption: `Cum recunoști în 5 secunde o știre făcută doar ca să te sperie: (1) îți cere să te înfurii, nu să gândești; (2) zero date verificabile; (3) nu apare pe nicio sursă serioasă. Salvează și trimite-le celor din grupul de familie. 🧠`,
    hashtags: ['#verifact', '#igienadigitala', '#fakenews', '#educațiemedia', '#factcheck'],
  },

  // ─────────────────────────────────────────── STATISTICĂ · sursă externă ───
  // Format „stat șoc + sursă”. Consum RAPID: un singur număr mare pe primul slide.
  // `source` e OBLIGATORIU — o statistică fără sursă nu se postează.
  {
    id: 'stat-reuters-tiktok',
    format: 'statistica',
    sound: 'beat tensionat, tobă pe apariția numărului',
    eyebrow: 'Cercetare · 2024',
    bigNumber: '59%',
    bigLabel: 'dintre oameni nu mai știu\nce e real și ce e fals online',
    source: 'Reuters Institute · Digital News Report 2024',
    // slide 2: un contrast / de ce contează
    twist: {
      kicker: 'Și partea ironică?',
      title: 'Cea mai mare neîncredere e\nchiar pe TikTok și X',
      body: 'Exact aplicațiile pe care derulezi acum sunt cele în care oamenii au cel mai greu de spus ce e adevărat. Nu ești paranoic — ai dreptate să te îndoiești.',
    },
    cta: {
      line: 'Nu ghici. Verifică.',
      sub: 'Screenshot pe verifact.ro → raport cu surse în ~12 secunde.',
    },
    caption: `59% dintre oameni spun că nu mai știu ce e real online (Reuters Institute, Digital News Report 2024). Cea mai mare neîncredere? Chiar pe TikTok și X — adică aici. Dacă simți că nu mai poți avea încredere în ce vezi pe feed, statistica îți dă dreptate. De-asta există Verifact.`,
    hashtags: ['#verifact', '#dezinformare', '#TikTok', '#factcheck', '#ReutersInstitute', '#date'],
  },
  {
    id: 'stat-romania-expunere',
    format: 'statistica',
    sound: 'instrumental „date/redacție”, sobru',
    eyebrow: 'România · Eurobarometru 2024',
    bigNumber: '1 din 2',
    bigLabel: 'români a văzut dezinformare\nsau fake news săptămâna trecută',
    source: 'Eurobarometru 2024 (55% — expunere percepută, 7 zile)',
    twist: {
      kicker: 'Dar iată capcana',
      title: '62% cred că pot recunoaște\nsingur dezinformarea',
      body: 'Ne expunem mult și ne credem imuni. Exact această încredere în plus e ce exploatează un fals bine făcut. Îndoiala sănătoasă bate încrederea oarbă.',
    },
    cta: {
      line: 'Încrederea nu verifică. Sursele da.',
      sub: 'Pune orice afirmație la îndoială pe verifact.ro.',
    },
    caption: `1 din 2 români a văzut fake news săptămâna trecută (Eurobarometru 2024). Și totuși 62% credem că îl recunoaștem singuri. Fix această încredere în plus e ce exploatează un fals bun. Nu-ți verifici memoria — verifici sursa. Salvează.`,
    hashtags: ['#verifact', '#România', '#dezinformare', '#Eurobarometru', '#factcheck', '#igienadigitala'],
  },

  // ─────────────────────────────────────────── 1f · ANALIZĂ FOTO ────────────
  {
    id: 'papa-balenciaga',
    format: 'analizaFoto',
    sound: 'cinematic tensionat, sub-bas',
    eyebrow: 'Analiză · Real vs AI',
    coverTitle: 'A rupt internetul.\nDar e reală?',
    photo: '[ SCREENSHOT VIRAL: „Papa în geacă albă Balenciaga” ]',
    photoHow: 'Pune screenshot-ul viral pe care îl demontezi (aici: imaginea AI cu Papa în geacă puf). Marcajele roșii („FĂRĂ SURSĂ”, cerc pe mâini) rămân peste imagine ca într-un dosar de investigație.',
    coverScore: '51%',
    coverVerdict: 'Neclar',
    coverNote: 'încă în verificare →',
    findingsTitle: 'Semnale de alarmă',
    findings: [
      'Nicio agenție de presă (Reuters, AFP, AP) nu a publicat imaginea.',
      'Reverse image search o duce la un cont de „AI art”, nu la un eveniment real.',
      'Artefacte tipice de generare: mâini, ochelari, textura gecii.',
    ],
    finalScore: '96%',
    finalNote: 'probabil generată de AI',
    cta: {
      line: 'Dacă „a rupt internetul”, verific-o de două ori.',
      sub: 'Trage poza pe verifact.ro și vezi dacă are vreo sursă reală.',
    },
    caption: `Poza cu „Papa în geacă Balenciaga” a păcălit milioane de oameni. Cum îți dai seama că e AI, fără aplicații complicate: nicio agenție serioasă nu a publicat-o, reverse image search duce la conturi de „AI art”, iar detaliile (mâini, textură) cedează. Când o imagine e prea bună ca să fie adevărată — de obicei nu e.`,
    hashtags: ['#verifact', '#AI', '#deepfake', '#factcheck', '#realvsAI', '#igienadigitala'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  LOT 10 postări — pe canale (folderele: facebook / instagram / tiktok)
  // ══════════════════════════════════════════════════════════════════════════

  // ─── FACEBOOK (2) · public matur, debunk de zvon viral + protecție familie ──
  {
    id: 'fb-01-microunde-cancer',
    channel: 'facebook',
    format: 'verdictStamp',
    sound: 'fără sunet special / voce AI calmă',
    eyebrow: 'Afirmație verificată',
    claimIntro: 'Se spune că',
    claim: '„Cuptorul cu microunde\nface mâncarea\ncancerigenă.”',
    verdict: 'false',
    score: '16%',
    confidenceNote: 'certitudinea\nverdictului',
    evidenceTitle: 'Ce spun sursele',
    evidence: [
      { src: 'FDA · SUA', tone: 'false', text: 'Microundele încălzesc mâncarea; nu o fac radioactivă și nu cauzează cancer.' },
      { src: 'who.int · OMS', tone: 'false', text: 'Corect folosit, cuptorul e sigur; pierderea de nutrienți e ca la orice gătire termică.' },
      { src: 'Verificat de Verifact', tone: 'neutral', text: 'Zero studii care leagă cuptorul cu microunde de cancer.' },
    ],
    cta: { line: 'Trimite-le celor care\nevită microundele de frică.', sub: 'Verifică orice zvon de sănătate pe verifact.ro — gratuit.' },
    caption: `„Microundele fac mâncarea cancerigenă” — un clasic pe grupurile de familie. Ce spun FDA și OMS: cuptorul doar încălzește, nu face mâncarea radioactivă și nu cauzează cancer. Pierzi cam aceiași nutrienți ca la orice fierbere. Dacă rudele tale se feresc de microunde, arată-le asta cu blândețe. 🙂`,
    hashtags: ['#verifact', '#factcheck', '#sănătate', '#mituri', '#familie'],
  },
  {
    id: 'fb-02-whatsapp-pacaleala',
    channel: 'facebook',
    format: 'explainer',
    sound: 'fără sunet special',
    eyebrow: 'Igienă digitală',
    kicker: '3 semne că mesajul',
    title: 'de pe WhatsApp\ne o păcăleală',
    signs: [
      { title: '„Distribuie până nu se șterge!”', body: 'Urgență falsă. Nimic real nu depinde de share-ul tău. E fix butonul care oprește gândirea.' },
      { title: 'Zero sursă — doar „cică” și „un doctor”', body: 'Fără nume, fără link, fără dată. O informație reală vine mereu cu o sursă pe care o poți deschide.' },
      { title: 'Îți cere să dai mai departe la 10 persoane', body: 'Lanțul clasic. Nicio instituție serioasă nu comunică prin mesaje de lanț.' },
    ],
    cta: { line: 'Ai primit așa ceva?\nNu da mai departe — verifică.', sub: 'Un screenshot pe verifact.ro și afli în ~12 secunde dacă e real.' },
    caption: `Cum recunoști în 5 secunde un mesaj-păcăleală pe WhatsApp: (1) „distribuie până nu se șterge” — urgență falsă; (2) zero sursă, doar „cică”; (3) „trimite la 10 persoane” — lanțul clasic. Salvează și arată-le părinților și bunicilor. Îi scutești de multă panică.`,
    hashtags: ['#verifact', '#WhatsApp', '#fakenews', '#familie', '#igienadigitala'],
  },

  // ─── INSTAGRAM (2) · postări de PIN — „despre ce e vorba” pe profil ─────────
  {
    id: 'ig-01-ce-e-verifact',
    channel: 'instagram',
    format: 'manifest',
    pin: true,
    sound: 'ambient calm, editorial',
    eyebrow: 'Ce e Verifact',
    statement: 'Nu-ți spunem\nce să crezi.\nÎți arătăm dovada.',
    sub: 'Verifact e un fact-checker cu AI. Text, screenshot sau link → verdict cu surse citate, în ~12 secunde.',
    listTitle: 'Ce facem · ce nu facem',
    list: [
      { k: 'Facem', tone: 'true', v: 'Căutăm în surse oficiale, presă și baze de fact-check și îți arătăm de unde vine verdictul.' },
      { k: 'Nu facem', tone: 'false', v: 'Nu-ți dăm opinii politice și nu inventăm răspunsuri. Fără sursă, fără verdict.' },
      { k: 'Pentru cine', tone: 'neutral', v: 'Pentru oricine derulează un feed și vrea să știe, în 12 secunde, dacă e real.' },
    ],
    cta: { line: 'Pleci mai bine informat.', sub: 'Începe pe verifact.ro — primele verificări sunt gratuite.' },
    caption: `Bun venit pe Verifact 👋 Nu-ți spunem ce să crezi — îți arătăm dovada. Trimiți un text, un screenshot sau un link, iar AI-ul îți dă un verdict cu surse citate în ~12 secunde. Fără opinii politice, fără răspunsuri inventate. Dă follow ca să pleci mereu mai bine informat de pe feed.`,
    hashtags: ['#verifact', '#factcheck', '#dezinformare', '#igienadigitala', '#România'],
  },
  {
    id: 'ig-02-cum-functioneaza',
    channel: 'instagram',
    format: 'manifest',
    pin: true,
    sound: 'ambient calm, editorial',
    eyebrow: 'Cum funcționează',
    statement: 'Un screenshot.\n12 secunde.\nUn verdict cu surse.',
    sub: 'Nu trebuie să tastezi nimic. Tragi poza, AI-ul citește textul și caută dovezile pentru tine.',
    listTitle: 'În 3 pași',
    list: [
      { k: 'Pasul 1', tone: 'neutral', v: 'Trimiți textul, un screenshot sau un link suspect.' },
      { k: 'Pasul 2', tone: 'neutral', v: 'AI-ul extrage afirmația și o caută în surse oficiale, presă și fact-check-uri.' },
      { k: 'Pasul 3', tone: 'neutral', v: 'Primești scor + verdict + lista de surse. Salvezi sau dai raportul mai departe.' },
    ],
    cta: { line: 'Gata. Fără căutat pe Google\nun sfert de oră.', sub: 'Prima verificare, acum, pe verifact.ro.' },
    caption: `Cum verifici orice în 12 secunde, fără să tastezi nimic: (1) trimiți un screenshot/text/link; (2) AI-ul extrage afirmația și caută dovezile în surse oficiale + presă + fact-check; (3) primești scor, verdict și sursele. Salvezi raportul sau îl trimiți mai departe. Simplu ca un search — dar cu surse. verifact.ro`,
    hashtags: ['#verifact', '#cumfunctioneaza', '#factcheck', '#AI', '#igienadigitala'],
  },

  // ─── TIKTOK (6) · consum rapid, formate variate ────────────────────────────
  {
    id: 'tt-01-fals-6x-mai-repede',
    channel: 'tiktok',
    format: 'statistica',
    sound: 'beat tensionat, tobă pe apariția numărului',
    eyebrow: 'Cercetare · MIT',
    bigNumber: '6×',
    bigLabel: 'mai repede se răspândește\nun fals decât adevărul',
    source: 'MIT · Science (2018) — Vosoughi, Roy, Aral · 126.000 lanțuri pe Twitter',
    twist: {
      kicker: 'Și de ce?',
      title: 'Nu boții.\nNoi.',
      body: 'Studiul a arătat că oamenii, nu roboții, distribuie falsul — pentru că e mai nou și mai șocant. Adevărul e „plictisitor”; de-aia pierde cursa.',
    },
    cta: { line: 'Rupe lanțul. Verifică\nînainte de share.', sub: 'verifact.ro — raport cu surse în ~12 secunde.' },
    caption: `Un fals ajunge la 1.500 de oameni de ~6 ori mai repede decât adevărul — și e cu 70% mai probabil să fie distribuit (studiu MIT, Science 2018, 126.000 de lanțuri pe Twitter). Vinovatul? Nu boții — noi. Falsul e mai nou și mai șocant, așa că îl dăm mai departe. Tu poți rupe lanțul: verifică înainte de share.`,
    hashtags: ['#verifact', '#fakenews', '#MIT', '#dezinformare', '#factcheck'],
  },
  {
    id: 'tt-02-deepfake-3x',
    channel: 'tiktok',
    format: 'statistica',
    sound: 'cinematic tensionat, sub-bas',
    eyebrow: 'AI · deepfakes',
    bigNumber: '3×',
    bigLabel: 'mai multe deepfake-uri video\nde la un an la altul',
    source: 'Estimări industrie (DeepMedia, raportat 2023–2024)',
    twist: {
      kicker: 'Ce înseamnă pentru tine',
      title: 'Nu mai poți crede un clip\ndoar pentru că „se vede”',
      body: 'Vocea și fața se falsifică acum în minute. Regula nouă: dacă un clip te șochează, caută-l la o sursă reală înainte să reacționezi.',
    },
    cta: { line: 'Ai un clip dubios?\nVerifică-l.', sub: 'Trage-l pe verifact.ro.' },
    caption: `Numărul de deepfake-uri video aproape se triplează de la an la an (estimări industrie, DeepMedia). Adică vocea și fața cuiva pot fi falsificate în câteva minute. Noua regulă de igienă digitală: dacă un clip te șochează, nu reacționa — caută-l întâi la o sursă reală. verifact.ro`,
    hashtags: ['#verifact', '#deepfake', '#AI', '#dezinformare', '#factcheck'],
  },
  {
    id: 'tt-03-ceaiuri-detox',
    channel: 'tiktok',
    format: 'mitAdevar',
    sound: 'punchy, drop pe tranziția mit→adevăr',
    myth: 'Ceaiurile „detox” îți curăță organismul de toxine.',
    mythNote: 'reclamă peste tot pe TikTok',
    truth: 'Ficatul și rinichii fac deja asta. „Detoxul” nu are bază — pierzi apă și bani.',
    inner: {
      title: 'De unde vine mitul',
      body: 'Sună a wellness, dar niciun ceai nu „scoate toxine”. <f>Efect real: laxativ și diuretic</f> — nu curățare.',
      stat: { aLabel: 'Ce promite', aVal: 'detoxifiere', bLabel: 'Ce face de fapt', bVal: 'te deshidratează' },
    },
    cta: { line: '„Natural” nu înseamnă „dovedit”.', sub: 'Verifică miturile de wellness pe verifact.ro.' },
    caption: `Ceaiurile „detox” nu-ți curăță organismul — ficatul și rinichii tăi fac deja treaba asta non-stop, gratis. Ce fac ceaiurile: efect laxativ + diuretic, adică pierzi apă (și bani). „Natural” nu e sinonim cu „dovedit”. Salvează înainte de următoarea reclamă.`,
    hashtags: ['#verifact', '#detox', '#wellness', '#mituri', '#sănătate'],
  },
  {
    id: 'tt-04-zid-chinezesc-spatiu',
    channel: 'tiktok',
    format: 'verdictStamp',
    sound: 'synth misterios',
    eyebrow: 'Afirmație verificată',
    claimIntro: 'Se spune că',
    claim: '„Zidul Chinezesc\nse vede din spațiu\ncu ochiul liber.”',
    verdict: 'false',
    score: '9%',
    confidenceNote: 'certitudinea\nverdictului',
    evidenceTitle: 'Ce spun sursele',
    evidence: [
      { src: 'NASA', tone: 'false', text: 'Astronauții confirmă: nu e vizibil cu ochiul liber de pe orbită.' },
      { src: 'Yang Liwei · primul astronaut chinez', tone: 'false', text: 'A declarat public că nu a putut vedea Zidul din spațiu.' },
      { src: 'Verificat de Verifact', tone: 'neutral', text: 'Mit de manual, repetat de zeci de ani, fără nicio dovadă.' },
    ],
    cta: { line: 'Repetat de mii de ori\n≠ adevărat.', sub: 'Verifică „faptele” pe care le știi de-o viață — pe verifact.ro.' },
    caption: `„Zidul Chinezesc se vede din spațiu cu ochiul liber” — ți-au spus-o la școală, nu? E fals. NASA și primul astronaut chinez (Yang Liwei) confirmă că nu se vede cu ochiul liber de pe orbită. Un mit repetat de zeci de ani rămâne… un mit. Repetiția nu e dovadă.`,
    hashtags: ['#verifact', '#mituri', '#spațiu', '#NASA', '#factcheck'],
  },
  {
    id: 'tt-05-pentagon-ai',
    channel: 'tiktok',
    format: 'analizaFoto',
    sound: 'cinematic tensionat, sub-bas',
    eyebrow: 'Analiză · Real vs AI',
    coverTitle: 'A mișcat bursa.\nDar s-a întâmplat?',
    photo: '[ SCREENSHOT VIRAL: „explozie lângă Pentagon” ]',
    photoHow: 'Pune screenshot-ul viral cu falsul „explozie la Pentagon” (mai 2023). Marcajele roșii („FĂRĂ SURSĂ”, cerc) rămân peste imagine ca într-un dosar.',
    coverScore: '43%',
    coverVerdict: 'Neclar',
    coverNote: 'încă în verificare →',
    findingsTitle: 'Semnale de alarmă',
    findings: [
      'Nicio agenție de presă și nicio autoritate nu a confirmat evenimentul.',
      'Pompierii din zonă au dezmințit public în câteva minute.',
      'Fum și clădire cu artefacte tipice de generare AI (contur, geometrie).',
    ],
    finalScore: '0%',
    finalNote: 'imagine falsă, generată AI',
    cta: { line: 'O poză poate mișca bursa.\nNu o crede pe cuvânt.', sub: 'Verifică orice imagine virală pe verifact.ro.' },
    caption: `În mai 2023, o poză AI cu o „explozie lângă Pentagon” a devenit virală și a făcut bursa americană să scadă pentru câteva minute — până a fost dezmințită. Cum îți dai seama: zero confirmare oficială, pompierii au negat imediat, iar imaginea avea artefacte tipice de AI. O singură poză falsă poate mișca piețe. Verifică înainte să reacționezi.`,
    hashtags: ['#verifact', '#AI', '#deepfake', '#Pentagon', '#factcheck'],
  },
  {
    id: 'tt-06-tehnici-propaganda',
    channel: 'tiktok',
    format: 'explainer',
    sound: 'lo-fi tensionat',
    eyebrow: 'Cum funcționează propaganda',
    kicker: '3 tehnici pe care',
    title: 'le vezi\nzilnic pe feed',
    signs: [
      { title: 'Firehose of falsehood', body: 'Torent de minciuni rapide și contradictorii. Scopul nu e să te convingă, ci să te obosească până nu mai știi ce să crezi.' },
      { title: 'Whataboutism', body: '„Dar voi ce-ați făcut?” Mută discuția de la fapt la vină, ca să nu mai verifici afirmația inițială.' },
      { title: 'Repetiția', body: 'O minciună repetată de 100 de ori sună a adevăr. Familiaritatea păcălește creierul — nu dovezile.' },
    ],
    cta: { line: 'Le recunoști → nu te mai prind.', sub: 'Verifică afirmația, nu tonul — pe verifact.ro.' },
    caption: `3 tehnici de propaganda pe care le vezi zilnic pe feed: (1) Firehose of falsehood — te obosește cu un torent de minciuni; (2) Whataboutism — mută vina ca să nu mai verifici; (3) Repetiția — o minciună repetată sună a adevăr. Odată ce le recunoști, nu te mai prind. Salvează.`,
    hashtags: ['#verifact', '#propaganda', '#dezinformare', '#educațiemedia', '#factcheck'],
  },

];
