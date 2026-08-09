export const ro = {
  /** Shared chrome that belongs to no single page — keep this list short. */
  common: {
    close: 'Închide',
    closeAria: 'Închide dialogul',
  },
  header: {
    nav: {
      disinformation: 'Dezinformare',
      transparency: 'Transparență',
      pricing: 'Prețuri',
      account: 'Cont',
      ariaNav: 'Navigare principală',
      toggleLangAria: 'Schimbă limba în engleză',
    },
    theme: {
      toDark: 'Comută pe tema întunecată',
      toLight: 'Comută pe tema luminoasă',
    },
  },
  verdict: {
    copy: {
      true: 'Probabil adevărat',
      partial: 'Parțial adevărat',
      unclear: 'Neclar',
      false: 'Probabil fals',
    },
    note: {
      partial: 'Context lipsă',
      unclear: 'Insuficient verificat',
    },
    scoreLabel: 'Scor de veridicitate: ',
  },

  footer: {
    privacy:
      'Ce verifici rămâne al tău. Nu vindem date și nu publicăm nimic fără acordul tău.',
    sections: {
      product: {
        title: 'Produs',
        verify: 'Verifică o afirmație',
        pricing: 'Prețuri',
        account: 'Cont',
      },
      project: {
        title: 'Proiect',
        disinformation: 'Despre dezinformare',
        mission: 'Misiune',
        transparency: 'Transparență',
        openSource: 'Open source și confidențialitate',
      },
      legal: {
        title: 'Legal',
        terms: 'Termeni și condiții',
        privacy: 'Politica de confidențialitate',
      },
    },
    copyright: '© {year} Verifact. Licență MIT.',
    repoLink: 'Cod sursă pe GitHub',
  },
  home: {
    hero: {
      eyebrow: 'Verificare independentă · surse publice',
      title: 'Informația e cea mai puternică',
      titleAccent: 'armă.',
      lead:
        'Lipești o afirmație, un link sau un screenshot — primești un verdict, un scor și sursele pe care se sprijină.',
    },
    try: {
      label: 'Încearcă',
      example1: 'Vaccinurile provoacă autism.',
      example2: 'Rețeaua 5G răspândește coronavirusul.',
      example3: 'Usturoiul vindecă infecția cu COVID-19.',
    },
    trust: {
      line: 'Nu-ți cerem să ne crezi pe cuvânt — îți arătăm sursele.',
    },
    sample: {
      eyebrow: 'Așa arată un răspuns',
      title: 'Verdictul, nu o pagină de text.',
      claim: 'Antibioticele tratează infecțiile virale precum răceala și gripa.',
      summary:
        'Antibioticele acționează asupra bacteriilor, nu a virusurilor. Răceala și gripa sunt cauzate de virusuri, așa că antibioticele nu le tratează — iar folosirea lor inutilă accelerează rezistența la antibiotice, avertizează OMS și ECDC.',
    },
    steps: {
      title: 'Cum funcționează',
      step1: {
        number: '01',
        title: 'Trimiți afirmația',
        text: 'Text, link către un articol sau screenshot dintr-o postare. Nu ai nevoie de cont pentru o verificare.',
      },
      step2: {
        number: '02',
        title: 'Căutăm în surse, nu în memoria unui model',
        text: 'Afirmația este căutată în baze de date de fact-checking, presă convențională, surse oficiale și declarații publice — patru straturi independente.',
      },
      step3: {
        number: '03',
        title: 'Primești un raport cu surse',
        text: 'Verdict, scor de veridicitate și lista completă a surselor pe care se bazează concluzia, ca să o poți verifica singur.',
      },
    },
    callout: {
      label: 'Principiul de bază',
      text:
        'Un verdict fără surse este doar o altă opinie. De aceea fiecare raport Verifact citează integral sursele pe care se sprijină, iar algoritmul care le cântărește este public.',
      methodologyLink: 'Vezi metodologia completă',
      openSourceLink: 'Open source și confidențialitate',
    },
  },
  verifyTool: {
    layers: {
      ariaLabel: 'Straturile de surse consultate',
      searching: 'se caută…',
      found: '{count} rezultate',
      foundOne: '1 rezultat',
      empty: 'fără rezultate',
      unavailable: 'indisponibil',
      notApplicable: 'nu se aplică',
      aiScored: 'evaluat {score}/100',
      done: 'gata',
    },
    heading: 'Verifică o afirmație',
    ariaTabContent: 'Tip de conținut de verificat',
    tabs: {
      text: 'Text',
      screenshot: 'Screenshot',
      url: 'URL',
    },
    textarea: {
      label: 'Afirmația de verificat',
      placeholder: 'Lipește aici textul sau afirmația pe care vrei să o verifici.',
      helper: 'Minimum 10 caractere. Funcționează cel mai bine cu o singură afirmație concretă.',
    },
    dropzone: {
      title: 'Alege o imagine sau trage-o aici',
      hint: 'PNG, JPG sau WebP — maximum 10 MB',
      fileSelected: 'Fișier selectat: {name}',
    },
    urlInput: {
      label: 'Link către articol sau postare',
      placeholder: 'https://exemplu.ro/articol',
      helper: 'Extragem textul articolului și verificăm afirmațiile principale.',
    },
    actions: {
      submit: 'Verifică acum',
      privacyHint: 'Verificarea rămâne privată până o publici tu.',
      pending: 'Se verifică…',
    },
    errors: {
      emptyText: 'Introdu conținutul pe care vrei să îl verifici.',
      emptyImage: 'Alege o imagine înainte de a porni verificarea.',
      ocrFailed:
        'Nu am putut extrage text lizibil din imagine. Încearcă un screenshot mai clar sau lipește textul manual.',
      generic: 'A apărut o eroare la verificare.',
      network: 'Nu am putut contacta serverul. Verifică conexiunea și încearcă din nou.',
      unavailableLabel: 'Momentan indisponibil',
      errorLabel: 'Eroare',
    },
  },
  reportView: {
    analyzedIn: 'analizat în {seconds}s',
    layersWithEvidence: '{count}/4 straturi cu dovezi',
    claimLabel: 'Afirmația verificată',
    partialAnalysisLabel: 'Analiză parțială',
    partialAnalysisText:
      'Analiza în limbaj natural nu a putut fi generată pentru acest raport. Verdictul și sursele de mai jos provin din căutarea în surse și sunt complete; lipsește doar explicația narativă.',
    summaryLabel: 'Rezumat',
    sourcesLabel: 'Surse ({count})',
    disclaimerLabel: 'Disclaimer',
    disclaimerText:
      'Raportul este generat automat și nu reprezintă o decizie editorială finală. Citește sursele citate pentru contextul complet.',
    downloadBtn: 'Descarcă PDF',
    downloadDocTitle: 'Raport de verificare',
    downloadGeneratedOn: 'Generat pe',
    downloadScoreLabel: 'Scor de veridicitate',
    premiumModalTitle: 'Raportul PDF complet e pentru Pro',
    premiumModalLead:
      'Mai jos vezi un fragment din raport și câteva surse exacte. Raportul PDF complet — cu fiecare sursă legată direct la propoziția verificată — vine cu planul Pro.',
    premiumSourcesLabel: 'Câteva dintre surse',
    premiumUpgradeCta: 'Vezi planurile',
    premiumCloseCta: 'Închide',
    /** Shown only on the printed page, which loses the site header. */
    printId: 'ID raport',
  },
  cite: {
    button: 'Copiază citarea',
    copiedShort: 'Copiat',
    copied: 'Citare copiată în clipboard',
    failed: 'Nu am putut copia citarea. Selectează textul manual.',
    heading: 'Verifact — verificare independentă a informației',
    claimLabel: 'Afirmație',
    verdictLabel: 'Verdict',
    scoreLabel: 'scor de veridicitate',
    layersLabel: 'Straturi cu dovezi',
    sourcesLabel: 'Surse consultate',
    reportLabel: 'Raport',
    accessed: 'accesat',
  },
  dispute: {
    reportErrorBtn: 'Raportează eroare',
    modalTitle: 'Raportează o eroare',
    sentLabel: 'Trimis',
    sentText:
      'Mulțumim. Contestația a fost înregistrată și raportul a fost marcat pentru reverificare.',
    reasonLabel: 'Ce e greșit în acest raport?',
    reasonHelper: 'Minimum 10 caractere.',
    reasonMinError: 'Descrie eroarea în cel puțin 10 caractere.',
    emailLabel: 'Email (opțional)',
    emailPlaceholder: 'nume@exemplu.ro',
    emailHelper: 'Doar dacă vrei să te contactăm în legătură cu această contestație.',
    submitBtn: 'Trimite contestația',
    legalNote: 'Raportările de erori sunt analizate în mod confidențial pentru menținerea acurateței.',
    errorGeneric: 'A apărut o eroare. Te rugăm să încerci din nou.',
    errorNetwork: 'Nu am putut contacta serverul. Verifică conexiunea și încearcă din nou.',
  },
  auth: {
    tabs: {
      login: 'Intră în cont',
      signup: 'Creează cont',
      ariaLabel: 'Mod autentificare',
    },
    session: {
      heading: 'Contul tău',
      email: 'Email',
      plan: 'Plan',
      verificationsThisMonth: 'Verificări luna asta',
      verificationsValue: '{current} din {limit}',
      verificationsUnlimited: 'Nelimitat',
      adminPlan: 'Admin',
      signOut: 'Deconectare',
      dangerLead:
        'Ștergerea contului este definitivă: rapoartele tale private se șterg pentru totdeauna, iar cele publicate rămân în baza publică, anonimizated. Detalii în Politica de confidențialitate.',
      deleteBtn: 'Șterge contul',
    },
    deleteModal: {
      title: 'Ștergi contul definitiv?',
      lead:
        'Această acțiune nu poate fi anulată. Toate rapoartele tale private vor fi șterse. Rapoartele publicate rămân, dar fără nicio legătură cu contul tău.',
      confirmLabel: 'Scrie „{phrase}” ca să confirmi',
      cancelBtn: 'Renunță',
      confirmBtn: 'Șterge definitiv contul',
      errorLabel: 'Nu a funcționat',
      errorGeneric: 'Ștergerea contului a eșuat.',
    },
    form: {
      ariaLabel: 'Autentificare',
      loginSubtitle: 'Bine ai revenit. Intră în cont ca să-ți continui verificările.',
      signupSubtitle: 'Cont gratuit în câteva secunde. Fără card, fără spam.',
      emailLabel: 'Email',
      emailPlaceholder: 'nume@exemplu.ro',
      passwordLabel: 'Parolă',
      passwordPlaceholder: 'Minimum 8 caractere',
      passwordHelperSignup: 'Alege o parolă de cel puțin 8 caractere.',
      confirmPasswordLabel: 'Confirmă parola',
      confirmPasswordPlaceholder: 'Repetă parola',
      passwordMismatch: 'Parolele nu coincid.',
      forgotPassword: 'Ai uitat parola?',
      resetSent: 'Ți-am trimis pe email un link de resetare a parolei.',
      resetError: 'Nu am putut trimite emailul de resetare. Încearcă din nou.',
      resetNeedsEmail: 'Scrie-ți adresa de email mai sus, apoi apasă din nou.',
      resetSending: 'Se trimite…',
      submitLogin: 'Intră în cont',
      submitSignup: 'Creează cont',
      socialGoogle: 'Continuă cu Google',
      orDivider: 'sau cu email și parolă',
      termsPrefix: 'Creând un cont, accepți ',
      termsLink: 'Termenii',
      termsMid: ' și ',
      privacyLink: 'Politica de confidențialitate',
      termsSuffix: '.',
      privacyNote:
        'Verificările tale rămân private. Nu le vede nimeni altcineva.',
      successSignup:
        'Contul a fost creat. Verifică-ți emailul pentru linkul de confirmare.',
      successSignupToast: 'Cont creat! Verifică-ți emailul pentru confirmare.',
      successLogin: 'Autentificare reușită.',
      errorGeneric: 'A apărut o eroare la autentificare.',
      errorLabel: 'Nu a funcționat',
      successLabel: 'Gata',
    },
    tiers: {
      free: 'Free',
      pro: 'Pro',
      business: 'Business',
    },
    twoFactor: {
      hint: 'Am trimis un cod pe adresa {email}. Introdu-l mai jos ca să confirmi că e chiar contul tău.',
      codeLabel: 'Cod din email',
      codePlaceholder: '123456',
      submitBtn: 'Confirmă codul',
      resendBtn: 'Retrimite codul',
      resendSuccess: 'Am retrimis codul pe email.',
      backBtn: 'Înapoi',
      errorGeneric: 'Codul introdus nu este valid.',
    },
    resetPassword: {
      eyebrow: 'Resetare parolă',
      title: 'Setează o parolă nouă',
      lead: 'Alege o parolă nouă pentru contul tău. După ce o salvezi, ești conectat automat.',
      verifying: 'Se verifică linkul de resetare…',
      invalidLabel: 'Link invalid',
      invalidText:
        'Linkul de resetare este invalid sau a expirat. Cere unul nou din pagina de cont.',
      backToLogin: 'Înapoi la cont',
      newPasswordLabel: 'Parolă nouă',
      newPasswordPlaceholder: 'Minimum 8 caractere',
      confirmLabel: 'Confirmă parola nouă',
      confirmPlaceholder: 'Repetă parola',
      submitBtn: 'Salvează parola',
      successLabel: 'Gata',
      successText: 'Parola a fost schimbată. Ești conectat.',
      goToAccount: 'Mergi la cont',
      errorLabel: 'Nu a funcționat',
      errorTooShort: 'Parola trebuie să aibă cel puțin 8 caractere.',
      errorGeneric: 'Nu am putut schimba parola. Încearcă din nou.',
    },
  },
  contPage: {
    metadata: {
      title: 'Cont',
      description:
        'Creează un cont Verifact sau autentifică-te. Rapoartele și istoricul tău rămân private.',
    },
    eyebrow: 'Cont',
    title: 'Intră în cont sau creează unul',
    lead:
      'Ai nevoie de cont doar dacă vrei să îți păstrezi istoricul verificărilor. O verificare simplă funcționează și fără.',
    oauthError: {
      label: 'Eroare autentificare',
      message:
        'Autentificarea cu rețeaua socială a eșuat. Încearcă din nou sau folosește email și parolă.',
    },
    aside: {
      title: 'Ce se întâmplă cu datele tale',
      bullet1Strong: 'Totul este privat.',
      bullet1Text:
        ' Rapoartele tale, istoricul tău și contul tău rămân ale tale. Un raport devine public doar dacă apeși tu butonul de publicare.',
      bullet2Strong: 'Nu vindem date.',
      bullet2Text:
        ' Nu există brokeri de date, profilare publicitară sau tracker-e terțe în Verifact.',
      bullet3Strong: 'Screenshot-urile nu se păstrează.',
      bullet3Text:
        ' Imaginile încărcate sunt folosite pentru extragerea textului și apoi șterse, nu arhivate.',
      bullet4Strong: 'Poți pleca oricând.',
      bullet4Text: ' Ștergerea contului îți șterge și rapoartele, definitiv.',
      noteText: 'Detaliile complete sunt pe pagina ',
      noteLink: 'Open source și confidențialitate',
    },
  },
  misiunePage: {
    metadata: {
      title: 'Misiune',
      description:
        'De ce există Verifact: acces instant la verificarea informației, prin AI transparentă și surse verificabile.',
    },
    eyebrow: 'Misiune',
    title: 'De ce există Verifact',
    calloutLabel: 'Misiunea produsului',
    calloutText:
      'Oferim fiecărui cetățean acces instant la adevăr, prin inteligență artificială transparentă și surse verificabile.',
    problemTitle: 'Problema',
    problemText1:
      'O știre falsă ajunge la milioane de oameni în câteva ore. Dezmințirea vine zile mai târziu — dacă vine.',
    problemText2:
      'Verifact face verificarea instantă, transparentă și gratuită pentru uz personal.',
    romaniaTitle: 'De ce România, întâi',
    romaniaBullets: [
      'Nu există un instrument automat de fact-checking nativ în limba română.',
      'Cererea de verificare independentă este mare și în creștere.',
      'Jurnalismul independent — G4Media, PressOne, Recorder — sunt parteneri naturali, nu concurenți.',
    ],
    notTitle: 'Ce nu suntem',
    notText:
      'Nu suntem un arbitru al adevărului și nu înlocuim redacțiile. Un raport automat e un punct de plecare cu surse, nu o decizie editorială. De aceea fiecare verdict vine cu scorul și sursele la vedere — ca să poți verifica concluzia singur, inclusiv împotriva noastră.',
    valuesTitle: 'Valorile după care lucrăm',
    values: [
      {
        title: 'Transparență',
        text: 'Algoritmul este open source. Orice persoană poate vedea cum se face verificarea.',
      },
      {
        title: 'Corectitudine',
        text: 'Nu luăm poziții politice. Verificăm fapte, nu opinii.',
      },
      {
        title: 'Accesibilitate',
        text: 'Gratuit pentru utilizatorul de rând.',
      },
      {
        title: 'Responsabilitate',
        text: 'Fiecare raport include surse verificabile, nu doar concluzii.',
      },
      {
        title: 'Confidențialitate',
        text: 'Screenshot-urile utilizatorilor nu sunt stocate permanent.',
      },
    ],
    followText: 'Vezi și ',
    methodologyLink: 'metodologia de verificare',
    orText: ' sau ',
    openSourceLink: 'codul și politica de confidențialitate',
  },
  transparentaPage: {
    metadata: {
      title: 'Transparență',
      description:
        'Metodologia Verifact: cele patru straturi de surse, cum se calculează scorul de veridicitate și ce înseamnă fiecare verdict.',
    },
    eyebrow: 'Transparență',
    title: 'Cum ajungem la un verdict',
    lead:
      'Un verdict fără metodă e o opinie cu autoritate împrumutată. Mai jos: ce consultăm, cum cântărim, unde ne oprim.',
    layersTitle: 'Cele patru straturi de surse',
    layersWeight: 'Pondere {weight}',
    layers: [
      {
        number: '01',
        title: 'Fact-check-uri existente',
        weight: '35%',
        text:
          'Căutăm afirmația în baze de fact-checking publicate. Dacă o organizație de profil a verificat-o deja, asta cântărește cel mai mult.',
      },
      {
        number: '02',
        title: 'Presă convențională',
        weight: '30%',
        text:
          'Cum a fost relatat subiectul în publicații cu istoric editorial — pentru context și relatări contradictorii.',
      },
      {
        number: '03',
        title: 'Surse oficiale',
        weight: '25%',
        text:
          'Site-uri instituționale — .gov.ro, .europa.eu, OMS, ONU și alte instituții publice relevante.',
      },
      {
        number: '04',
        title: 'Rețele sociale și declarații publice',
        weight: '10%',
        text:
          'Verificăm dacă o declarație atribuită cuiva a fost făcută cu adevărat. Se aplică doar afirmațiilor care numesc o persoană publică; altfel stratul e sărit.',
      },
      {
        number: '05',
        title: 'Analiză contextuală AI',
        weight: '10%',
        text:
          'Un model AI evaluează afirmația față de dovezile de mai sus și semnalează contextul lipsă. Ponderea nominală e mică, dar când căutările nu găsesc nimic, ponderile lor se redistribuie și evaluarea AI ajunge să cântărească mult mai mult — până la a purta singură scorul.',
      },
    ],
    scoreTitle: 'Ce înseamnă scorul',
    scoreIntro:
      'Scorul final e media ponderată a celor cinci straturi. Banda în care cade determină verdictul — nimic altceva.',
    bands: [
      {
        range: '85–100%',
        label: 'Probabil adevărat',
        text: 'Confirmată de mai multe surse independente, fără contradicții semnificative.',
      },
      {
        range: '60–84%',
        label: 'Parțial adevărat / context lipsă',
        text: 'Nucleul afirmației se susține, dar lipsește context care schimbă interpretarea.',
      },
      {
        range: '40–59%',
        label: 'Neclar / insuficient verificat',
        text: 'Sursele sunt puține, contradictorii sau de calitate incertă. Nu tragem o concluzie.',
      },
      {
        range: '0–39%',
        label: 'Probabil fals',
        text: 'Contrazisă de surse credibile sau bazată pe o premisă demonstrat falsă.',
      },
    ],
    limitsTitle: 'Limitele metodei',
    /** Split into a heading and its detail so the list can be scanned first. */
    limits: [
      {
        title: 'Verificăm fapte, nu opinii',
        text: 'Nu evaluăm predicții sau judecăți de valoare. „X este greșit” nu poate primi un scor.',
      },
      {
        title: 'Dacă lipsesc sursele, spunem „neclar”',
        text: 'Pentru un subiect recent sau de nișă, verdictul rămâne „neclar”, nu „fals”.',
      },
      {
        title: 'Un scor mare nu e o garanție',
        text: 'E o măsură a cât se susține afirmația în sursele de la momentul verificării.',
      },
      {
        title: 'Nu detectăm satira fiabil',
        text: 'O afirmație preluată dintr-un context satiric poate fi evaluată literal.',
      },
    ],
    calloutLabel: 'Cod deschis',
    calloutText:
      'Aceasta este metodologia după care funcționează verificarea. Codul care o implementează este public și poate fi urmărit în repository.',
    openSourceLead: 'Codul care implementează toate acestea este public. ',
    openSourceLink: 'Vezi pagina open source',
  },
  openSourcePage: {
    metadata: {
      title: 'Open source și confidențialitate',
      description:
        'De ce codul Verifact este public sub licență MIT și ce se întâmplă cu datele tale: totul este privat.',
    },
    eyebrow: 'Cod și date',
    title: 'Codul e public. Datele tale nu.',
    lead:
      'Două promisiuni care merg împreună: oricine poate audita cum funcționează Verifact, și nimeni nu poate vedea ce ai verificat tu.',
    jumpNavAria: 'Secțiuni',
    jumpOpenSource: 'Open source',
    jumpPrivacy: 'Confidențialitate',
    part1Eyebrow: 'Partea I',
    part1Title: 'De ce codul e deschis',
    part1Intro:
      'Un instrument care îți spune ce e adevărat are o putere considerabilă. Singurul mod onest de a o deține e să lași pe oricine să verifice cum o folosești.',
    auditTitle: 'Ce poți verifica singur',
    auditList: [
      'Ce surse sunt consultate și în ce ordine — inclusiv interogările din spate.',
      'Cum se calculează scorul, cu ponderile exacte ale fiecărui strat.',
      'Ce prompt-uri primește modelul AI și unde poate — sau nu poate — influența verdictul.',
      'Orice schimbare de metodologie, vizibilă în istoricul repository-ului.',
    ],
    licenseTitle: 'Licență și contribuții',
    licenseText:
      'Verifact e publicat sub licență MIT: poți folosi, modifica și rula codul pe infrastructura ta, inclusiv comercial. Contribuțiile sunt binevenite — mai ales semnalările de verdicte greșite.',
    seeCodeBtn: 'Vezi codul pe GitHub',
    methodologyLink: 'Metodologia de verificare',
    part2Eyebrow: 'Partea II',
    part2Title: 'Confidențialitate',
    calloutLabel: 'Pe scurt',
    calloutText:
      'Totul este privat — rapoartele tale, istoricul tău, contul tău. Nimic din ce verifici nu devine public decât dacă apeși tu butonul de publicare.',
    collectTitle: 'Ce colectăm',
    collectBullets: {
      noAccStrong: 'Fără cont:',
      noAccText:
        ' textul sau linkul pe care îl trimiți spre verificare, folosit doar pentru a genera raportul cerut.',
      withAccStrong: 'Cu cont:',
      withAccText:
        ' adresa de email și istoricul propriilor verificări, ca să le regăsești.',
      techStrong: 'Date tehnice',
      techText: ' minime necesare funcționării (de exemplu, limitarea abuzurilor).',
    },
    notDoTitle: 'Ce nu facem',
    notDoBullets: [
      'Nu vindem și nu închiriem date.',
      'Nu folosim tracker-e publicitare și nu construim profiluri de utilizator.',
      'Nu publicăm verificările tale și nu le arătăm altor utilizatori.',
      'Nu păstrăm screenshot-urile: imaginea e folosită pentru extragerea textului, apoi ștearsă.',
    ],
    controlTitle: 'Controlul tău',
    controlBullets: [
      'Poți șterge orice raport din istoricul tău, oricând.',
      'Poți șterge contul complet — ștergerea contului șterge și rapoartele asociate, definitiv.',
      'Poți publica un raport dacă vrei să îl citeze cineva; publicarea este întotdeauna o acțiune explicită a ta.',
    ],
    privacyQuestionText:
      'Ai o întrebare despre datele tale sau vrei să raportezi o problemă de confidențialitate? Deschide un issue public în ',
    repoLinkText: 'repository',
    orWriteFromText: ' sau scrie-ne din ',
    accountLinkText: 'contul tău',
  },
  confidentialitatePage: {
    metadata: {
      title: 'Politica de confidențialitate',
      description:
        'Ce date colectează Verifact, de ce, cui le trimite și cum îți poți exercita drepturile GDPR.',
    },
    eyebrow: 'Legal',
    title: 'Politica de confidențialitate',
    leadPrefix: 'Ultima actualizare: 8 august 2026. Versiunea pe scurt e pe pagina ',
    shortVersionLink: 'Open source și confidențialitate',
    leadSuffix: '. Aici e versiunea completă, conform GDPR.',
    sec1Title: '1. Operatorul de date',
    sec1Text:
      'Datele tale sunt operate de Sebi Iancu, persoană fizică, dezvoltatorul și administratorul proiectului Verifact. Pentru orice solicitare legată de datele tale, scrie la ',
    sec2Title: '2. Ce date colectăm',
    sec2AccountTitle: 'Cont',
    sec2AccountList: [
      'Adresă de email și parolă (stocată criptat de Supabase Auth, nu o vedem niciodată în clar).',
      'Un nume de utilizator opțional.',
      'Nivelul de plan (free / pro / business).',
      'Dacă alegi un plan plătit: Creem stochează datele de plată (card, facturare) pe serverele lor. Verifact nu vede și nu stochează niciodată numărul cardului tău — primim doar confirmarea plății și ID-ul abonamentului.',
    ],
    sec2ContentTitle: 'Conținut trimis spre verificare',
    sec2ContentList: [
      'Textul, linkul sau imaginea pe care le trimiți.',
      'Pentru screenshot-uri: imaginea e trimisă către Google Cloud Vision pentru extragerea textului (OCR) și nu este păstrată după aceea — reținem doar textul extras.',
      'Istoricul verificărilor tale (dacă ești autentificat): raportul generat, scorul, verdictul.',
    ],
    sec2TechTitle: 'Date tehnice',
    sec2TechList: [
      'Adresa IP, folosită temporar pentru limitarea numărului de cereri (rate limiting) și prevenirea abuzului.',
      'Statistici de trafic agregate prin Vercel Analytics — un serviciu fără cookie-uri, care nu identifică vizitatorii individual și nu urmărește pe niciun alt site.',
    ],
    sec2SocialNote: 'Dacă te autentifici cu Google, primim de la Google doar adresa ta de email și un identificator de cont — nimic din restul activității tale Google.',
    sec3Title: '3. De ce colectăm aceste date',
    sec3List: [
      'Executarea contractului: ca să creăm și administrăm contul tău și să generăm raportul cerut.',
      'Consimțământul tău: ca să afișăm un raport public, dar numai dacă apeși explicit butonul de publicare.',
      'Interesul nostru legitim: pentru cache-uirea rezultatelor (ca să nu replătim aceleași apeluri API), pentru securitate și pentru statisticile de trafic agregate.',
    ],
    sec4Title: '4. Cui trimitem datele',
    sec4Intro: 'Ca să funcționeze verificarea, anumite date ajung la furnizori terți, strict pentru scopul descris:',
    sec4Vendors: [
      { name: 'Supabase', desc: 'baza de date și autentificarea.' },
      { name: 'Google Cloud Vision', desc: 'extragerea textului din screenshot-uri.' },
      { name: 'Google Gemini', desc: 'sinteza raportului AI.' },
      { name: 'Google Fact Check Tools / Custom Search', desc: 'căutarea în surse oficiale.' },
      { name: 'Tavily', desc: 'căutarea de articole de presă pe web.' },
      { name: 'Creem', desc: 'procesarea plăților pentru planurile Pro și Business. Primește datele cardului tău direct; Verifact nu le vede.' },
      { name: 'Vercel', desc: 'găzduirea aplicației și statisticile de trafic agregate.' },
    ],
    sec4Outro:
      'Toți au sediul sau infrastructură inclusiv în SUA; transferurile se bazează pe Clauzele Contractuale Standard ale UE sau pe EU-US Data Privacy Framework. Niciunul nu primește mai multe date decât are nevoie ca să presteze serviciul respectiv — de exemplu, Tavily primește doar cuvintele cheie extrase din afirmație, nu contul tău.',
    sec5Title: '5. Cât păstrăm datele',
    sec5List: [
      'Datele de cont — cât timp ai un cont activ.',
      'Verificările private — până le ștergi tu sau îți ștergi contul.',
      'Verificările publicate — dacă îți ștergi contul, raportul rămâne în baza publică dar e anonimizat definitiv (legătura cu contul tău e eliminată la nivel de bază de date, nu doar ascunsă).',
      'Datele de plată — Creem le păstrează conform propriei politici de confidențialitate și a obligațiilor legale de evidență fiscală. La anularea abonamentului sau la ștergerea contului, îi trimitem lui Creem cererea de ștergere.',
    ],
    sec6Title: '6. Ștergerea contului',
    sec6Text:
      'Poți șterge contul definitiv direct din pagina de cont — rapoartele tale private se șterg imediat. Cele pe care le-ai publicat explicit rămân în baza publică, dar anonimizate (legătura cu contul tău e eliminată definitiv la nivel de bază de date). Dacă ai un abonament activ, anulează-l înainte de ștergerea contului. Alternativ, ne poți scrie la adresa de mai sus.',
    sec7Title: '7. Drepturile tale GDPR',
    sec7Intro: 'Ai dreptul să:',
    sec7List: [
      'afli ce date avem despre tine și să primești o copie;',
      'ceri corectarea datelor greșite;',
      'ceri ștergerea datelor tale (vezi punctul 6);',
      'te opui prelucrării bazate pe interes legitim;',
      'depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP) — dataprotection.ro.',
    ],
    sec7Outro: 'Pentru oricare dintre ele, scrie-ne — răspundem în maximum o lună.',
    sec8Title: '8. Cookie-uri',
    sec8Text1:
      'Folosim un singur cookie de sesiune, strict necesar, care te ține autentificat (gestionat de Supabase). Nu necesită consimțământ, conform Directivei ePrivacy, fiindcă e indispensabil funcționării serviciului pe care îl ceri direct.',
    sec8Text2:
      'Vercel Analytics nu folosește cookie-uri și nu construiește un profil al tău — de asta nu afișăm un banner de cookie-uri. Dacă adăugăm vreodată un instrument care ar necesita consimțământ, vom adăuga și bannerul corespunzător.',
    sec9Title: '9. Securitate',
    sec9List: [
      'Tot traficul este criptat prin HTTPS/TLS.',
      'Parolele sunt hash-uite de Supabase Auth, nu le vedem niciodată în clar.',
      'Row Level Security (RLS) în baza de date, ca fiecare utilizator să vadă doar ce e al lui.',
      'Imaginile trimise pentru OCR sunt procesate în memorie, niciodată salvate pe disc.',
    ],
    sec10Title: '10. Modificări',
    sec10Text:
      'Putem actualiza această politică; data de sus arată ultima revizuire. Dacă schimbăm ceva semnificativ, te anunțăm prin email sau printr-un mesaj vizibil în aplicație.',
  },
  termeniPage: {
    metadata: {
      title: 'Termeni și condiții',
      description:
        'Termenii și condițiile de utilizare a Verifact: ce este serviciul, limitele lui și cum e limitată răspunderea.',
    },
    eyebrow: 'Legal',
    title: 'Termeni și condiții',
    lead: 'Ultima actualizare: 8 august 2026. Prin folosirea Verifact ești de acord cu termenii de mai jos.',
    intro:
      'Verifact este operat de Sebi Iancu, persoană fizică, ca proiect open-source („Noi”, „Operatorul”). Acești termeni guvernează accesarea și folosirea aplicației web Verifact („Serviciul”). Dacă nu ești de acord cu ei, te rugăm să nu folosești Serviciul.',
    sec1Title: '1. Ce este Serviciul',
    sec1Text1:
      'Verifact este un instrument care primește text, un link sau un screenshot și generează un raport automat despre veridicitatea afirmației, agregând surse din presă, baze de fact-checking, surse oficiale și rezultate de căutare, sintetizate cu ajutorul unui model AI.',
    sec1Text2Prefix: 'Contul este gratuit, cu o limită lunară de verificări. Planurile Pro și Business, afișate pe ',
    pricingLinkText: 'pagina de prețuri',
    sec1Text2Suffix: ', cresc acea limită și sunt disponibile ca abonamente lunare sau anuale, procesate prin Creem.',
    sec2Title: '2. Vârstă minimă',
    sec2Text:
      'Trebuie să ai cel puțin 16 ani pentru a-ți crea un cont gratuit și cel puțin 18 ani pentru a solicita un plan plătit, în linie cu legislația română privind consimțământul pentru serviciile societății informaționale.',
    sec3Title: '3. Disclaimer — limitele algoritmului',
    sec3Text1Strong: 'Citește această secțiune cu atenție. ',
    sec3Text1Text:
      'Rapoartele Verifact au caracter exclusiv informativ. Ele sunt generate automat, printr-un algoritm și un model AI, din surse terțe, și nu constituie o decizie oficială, juridică sau jurnalistică definitivă și nici o recomandare juridică, medicală sau financiară.',
    sec3Text2:
      'Algoritmul poate greși: poate eticheta o afirmație adevărată drept incertă sau falsă (fals pozitiv) sau una falsă drept adevărată (fals negativ). Nu garantăm exactitatea, completitudinea sau actualitatea rezultatelor. Tu ești responsabil pentru cum interpretezi și folosești un raport — verifică sursele citate înainte să tragi o concluzie.',
    sec3Text3Prefix: 'Metodologia exactă, inclusiv limitele ei cunoscute, este publică pe pagina ',
    transparencyLinkText: 'Transparență',
    sec3Text3Suffix: '.',
    sec4Title: '4. Reguli de utilizare',
    sec4Intro: 'Nu poți folosi Serviciul pentru a:',
    sec4List: [
      'trimite conținut ilegal, defăimător, care incită la ură sau violență;',
      'încerca manipularea deliberată a algoritmului pentru a obține verdicte false, în scop de propagandă sau dezinformare;',
      'ocoli limitele de rată, măsurile de securitate sau restricțiile contului tău;',
      'ataca infrastructura (scraping abuziv, inginerie inversă, încercări de acces neautorizat).',
    ],
    sec5Title: '5. Plăți și abonamente',
    sec5Intro:
      'Planurile plătite (Pro, Business) sunt disponibile ca abonamente lunare sau anuale, procesate prin Creem (creem.io), furnizorul nostru de plăți. Verifact nu stochează și nu procesează datele cardului tău — acestea sunt gestionate integral de Creem, în conformitate cu standardele PCI DSS.',
    sec5RenewalTitle: 'Reînnoire automată',
    sec5RenewalText:
      'Abonamentele se reînnoiesc automat la sfârșitul fiecărei perioade de facturare (lună sau an), la prețul afișat în momentul reînnoirii. Poți anula reînnoirea oricând din contul tău; accesul la funcțiile Pro rămâne activ până la sfârșitul perioadei plătite.',
    sec5RefundTitle: 'Rambursări',
    sec5RefundText:
      'Dacă nu ai folosit verificări din planul plătit în perioada curentă de facturare, poți solicita o rambursare integrală scriindu-ne în primele 14 zile de la activare. După prima verificare efectuată sau după 14 zile, nu mai acordăm rambursări — dar poți anula oricând reînnoirea automată.',
    sec5PriceTitle: 'Modificări de preț',
    sec5PriceText:
      'Putem modifica prețurile planurilor plătite. Te vom notifica prin email cu cel puțin 30 de zile înainte de intrarea în vigoare a noului preț. Dacă nu ești de acord, poți anula abonamentul înainte de următoarea reînnoire.',
    sec6Title: '6. Cod deschis și conținutul tău',
    sec6Text1Prefix: 'Codul sursă este publicat sub licența MIT (Copyright (c) 2026 Sebi Iancu) în ',
    repoLinkText: 'repository-ul oficial',
    sec6Text1Suffix: '. Licența acoperă codul, nu numele „Verifact”, infrastructura sau baza de date pe care o operăm noi.',
    sec6Text2Prefix: 'Păstrezi drepturile asupra textului pe care îl trimiți spre verificare. Prin trimiterea lui, ne dai voie să îl procesăm — și să îl transmitem furnizorilor terți enumerați în ',
    privacyLinkText: 'Politica de confidențialitate',
    sec6Text2Suffix: ' — strict ca să generăm raportul cerut. Dacă alegi explicit să publici un raport, ne dai voie să îl afișăm, anonimizat, în secțiunea publică.',
    sec6Text3:
      'Dacă încarci un screenshot al conținutului altcuiva, garantezi că o faci în scop de verificare personală — o folosire care se încadrează în limitele dreptului la citat prevăzute de Legea nr. 8/1996. Imaginea este folosită doar pentru a extrage textul (OCR) și nu este păstrată după aceea.',
    sec7Title: '7. Proprietate intelectuală',
    sec7Text:
      'Numele „Verifact”, logoul, designul interfeței și identitatea vizuală sunt proprietatea Operatorului. Licența MIT aplicabilă codului sursă nu se extinde asupra acestor elemente. Nu poți folosi numele sau identitatea vizuală Verifact într-un mod care ar sugera o afiliere, o aprobare sau o asociere cu Operatorul, fără acordul nostru prealabil în scris.',
    sec8Title: '8. Corectarea unui raport',
    sec8TextPrefix: 'Dacă găsești o eroare factuală într-un raport, poți folosi butonul „Raportează eroare” din raport, poți deschide un ',
    issueLinkText: 'issue pe GitHub',
    sec8TextSuffix: ' sau ne poți scrie la adresa din secțiunea Contact. Citim fiecare mesaj; contestația ta va fi înregistrată iar raportul marcat pentru reverificare.',
    sec9Title: '9. Disponibilitatea serviciului',
    sec9Text:
      'Verifact este furnizat „așa cum este” (as is), fără garanții de funcționare neîntreruptă. Ne propunem o disponibilitate ridicată, dar pot apărea întreruperi planificate sau neprevăzute. Nu răspundem pentru pierderile cauzate de indisponibilitatea temporară a Serviciului.',
    sec10Title: '10. Limitarea răspunderii',
    sec10Text:
      'În limita permisă de lege, nu răspundem pentru daune indirecte, incidentale sau de consecință (pierderi de profit, de date sau de reputație) rezultate din folosirea Serviciului, din erori ale rapoartelor generate automat sau din deciziile pe care le iei pe baza lor. Răspunderea noastră totală față de tine, pentru orice pretenție legată de acești termeni, este limitată la suma plătită de tine în ultimele 12 luni, sau 100 RON, oricare e mai mare.',
    sec11Title: '11. Contul tău',
    sec11TextPrefix: 'Poți renunța la Serviciu oricând. Dreptul tău de a-ți șterge definitiv contul și datele asociate e descris în ',
    sec11PrivacyLinkText: 'Politica de confidențialitate',
    sec11TextSuffix: '. Ne rezervăm dreptul de a suspenda un cont care încalcă repetat secțiunea 4.',
    sec12Title: '12. Modificări',
    sec12Text:
      'Putem modifica acești termeni; data de mai sus arată ultima actualizare. Continuarea folosirii Serviciului după o modificare înseamnă că ești de acord cu noua versiune. Dacă schimbăm ceva semnificativ, te anunțăm prin email sau printr-un mesaj vizibil în aplicație.',
    sec13Title: '13. Legea aplicabilă și litigii',
    sec13Text: 'Acești termeni sunt guvernați de legea română. Orice litigiu se supune instanțelor competente din România. Părțile vor încerca mai întâi rezolvarea pe cale amiabilă, în termen de 30 de zile de la notificare.',
    sec14Title: '14. Contact',
    sec14Text: 'Pentru întrebări despre acești termeni, scrie la ',
  },
};

export type Translations = typeof ro;
