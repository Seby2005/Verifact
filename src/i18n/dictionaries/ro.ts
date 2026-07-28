export const ro = {
  /** Shared chrome that belongs to no single page — keep this list short. */
  common: {
    close: 'Închide',
    closeAria: 'Închide dialogul',
  },
  header: {
    nav: {
      reports: 'Rapoarte',
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
      'Totul este privat. Rapoartele tale, istoricul tău și contul tău rămân ale tale — nu vindem date și nu publicăm nimic fără să ceri tu asta explicit.',
    sections: {
      product: {
        title: 'Produs',
        verify: 'Verifică o afirmație',
        reports: 'Rapoarte',
        pricing: 'Prețuri',
        account: 'Cont',
      },
      project: {
        title: 'Proiect',
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
      title: 'Adevărat sau fals?',
      titleAccent: 'Verifică pe surse.',
      lead:
        'Lipești o afirmație — primești un verdict, un scor și sursele pe care se sprijină.',
    },
    try: {
      label: 'Încearcă',
      example1: 'Fulgerul nu lovește de două ori în același loc',
      example2: 'Folosim doar 10% din creier',
      example3: 'Zidul Chinezesc se vede din spațiu cu ochiul liber',
    },
    trust: {
      line: 'Un verdict fără surse e doar o altă opinie.',
    },
    sample: {
      eyebrow: 'Așa arată un răspuns',
      title: 'Verdictul, nu o pagină de text.',
      scoreCaption: 'scor',
      meta: '4/4 straturi cu dovezi · 12,3 s',
      sourcesLabel: 'Sursele pe care se sprijină',
      claim: 'Vaccinurile ARNm modifică ADN-ul uman.',
      summary:
        'ARN-ul mesager din vaccin nu ajunge în nucleul celulei, unde se află ADN-ul, și se degradează în câteva zile după ce celula produce proteina spike. Nu există niciun mecanism cunoscut prin care acest proces să modifice genomul uman.',
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
      privacyHint: 'Rapoartele tale rămân private până când alegi tu să le publici.',
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
  rapoartePage: {
    metadata: {
      title: 'Rapoarte publicate',
      description: 'Rapoartele publicate de comunitatea Verifact și istoricul verificărilor tale.',
    },
    eyebrow: 'Rapoarte',
    title: 'Verificări publicate',
    lead: 'Rapoartele apar aici doar dacă autorul lor alege să le publice. Verificările tale rămân private în mod implicit.',
    calloutTitle: 'Feed public în dezvoltare',
    calloutText: 'Mai jos este structura pe care o va avea lista, cu exemple ilustrative de verificări.',
    listAriaLabel: 'Exemple de rapoarte publicate',
    sourcesCount: '{count} surse citate',
    yourHistoryTitle: 'Istoricul tău',
    yourHistoryText: 'Dacă ai un cont, verificările tale se salvează automat și le vezi doar tu. Poți șterge oricare dintre ele, oricând.',
    loginBtn: 'Intră în cont',
    verifyLink: 'Verifică o afirmație',
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
      emailLabel: 'Email',
      emailPlaceholder: 'nume@exemplu.ro',
      passwordLabel: 'Parolă',
      passwordPlaceholder: 'Minimum 8 caractere',
      passwordHelperSignup: 'Alege o parolă de cel puțin 8 caractere.',
      submitLogin: 'Intră în cont',
      submitSignup: 'Creează cont',
      socialGoogle: 'Conectează-te cu Google',
      socialFacebook: 'Conectează-te cu Facebook',
      socialGithub: 'Conectează-te cu GitHub',
      orDivider: 'sau cu email și parolă',
      privacyNote:
        'Totul este privat: rapoartele și istoricul tău nu sunt vizibile pentru nimeni altcineva și nu sunt vândute mai departe.',
      successSignup:
        'Contul a fost creat. Verifică-ți emailul pentru linkul de confirmare.',
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
  preturiPage: {
    metadata: {
      title: 'Prețuri',
      description:
        'Verifact este gratuit pentru uz personal. Planuri Pro și Business pentru jurnaliști, redacții și organizații.',
    },
    eyebrow: 'Prețuri',
    title: 'Gratuit pentru cetățeni. Plătit doar la volum.',
    lead:
      'Verificarea informației nu ar trebui să fie un privilegiu. Planul gratuit acoperă nevoia unui utilizator obișnuit; plătesc doar cei care verifică la scară profesională.',
    plans: [
      {
        name: 'Free',
        price: 'Gratuit',
        cadence: null,
        forWho: 'Pentru oricine vrea să verifice ce vede în feed.',
        checks: '10 verificări pe lună',
        features: [
          'Raport standard cu surse citate',
          'Verificare din text, screenshot sau URL',
          'Istoric personal al verificărilor',
          'Partajare publică a unui raport, dacă alegi tu',
        ],
        cta: 'Începe gratuit',
      },
      {
        name: 'Pro',
        price: '€7,99',
        cadence: 'pe lună',
        forWho: 'Pentru jurnaliști, cercetători și profesori.',
        checks: '200 de verificări pe lună',
        features: [
          'Tot ce include planul Free',
          'Raport detaliat pe straturi de verificare',
          'Export PDF pentru citare',
          'Cheie API personală',
        ],
        cta: 'Alege Pro',
      },
      {
        name: 'Business',
        price: '€49',
        cadence: 'pe lună',
        forWho: 'Pentru redacții, ONG-uri și platforme.',
        checks: '2000 de verificări pe lună',
        features: [
          'Tot ce include planul Pro',
          'Acces API complet și webhook-uri',
          'Dashboard de analytics pentru echipă',
          'Suport prioritar',
        ],
        cta: 'Contactează-ne',
      },
    ],
    callout: {
      label: 'Fără costuri ascunse',
      text:
        'Planul gratuit nu se transformă în plată automat și nu îți cere card la înregistrare. Dacă depășești limita lunară, verificările se opresc până în luna următoare — nu te taxăm surpriză.',
    },
    footnote: {
      text: 'Prețurile nu includ TVA. Ai nevoie de altceva? ',
      linkText: 'Creează un cont',
      suffix: ' și scrie-ne.',
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
    calloutLabel: 'Statusul implementării',
    calloutText:
      'Metodologia de mai sus este specificația după care se construiește motorul de verificare. Pipeline-ul nu este încă activ public — progresul poate fi urmărit în repository.',
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
    leadPrefix: 'Ultima actualizare: 28 iulie 2026. Versiunea pe scurt e pe pagina ',
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
    sec2SocialNote: 'Nu colectăm date printr-un login social (Google/GitHub) — doar email și parolă.',
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
      { name: 'Vercel', desc: 'găzduirea aplicației și statisticile de trafic agregate.' },
    ],
    sec4Outro:
      'Toți au sediul sau infrastructură inclusiv în SUA; transferurile se bazează pe Clauzele Contractuale Standard ale UE sau pe EU-US Data Privacy Framework. Niciunul nu primește mai multe date decât are nevoie ca să presteze serviciul respectiv — de exemplu, Tavily primește doar cuvintele cheie extrase din afirmație, nu contul tău.',
    sec5Title: '5. Cât păstrăm datele',
    sec5List: [
      'Datele de cont — cât timp ai un cont activ.',
      'Verificările private — până le ștergi tu sau îți ștergi contul.',
      'Verificările publicate — dacă îți ștergi contul, raportul rămâne în baza publică dar e anonimizat definitiv (legătura cu contul tău e eliminată la nivel de bază de date, nu doar ascunsă).',
    ],
    sec6Title: '6. Ștergerea contului',
    sec6Text:
      'Poți cere ștergerea definitivă a contului și a datelor asociate oricând, scriindu-ne la adresa de mai sus — ștergem imediat ce confirmăm identitatea solicitării. Rapoartele tale private se șterg definitiv; cele pe care le-ai publicat explicit rămân în baza publică, dar anonimizate. Lucrăm la un buton de auto-ștergere direct din cont, ca acest pas să nu mai necesite un email.',
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
    lead: 'Ultima actualizare: 28 iulie 2026. Prin folosirea Verifact ești de acord cu termenii de mai jos.',
    intro:
      'Verifact este operat de Sebi Iancu, persoană fizică, ca proiect open-source („Noi”, „Operatorul”). Acești termeni guvernează accesarea și folosirea aplicației web Verifact („Serviciul”). Dacă nu ești de acord cu ei, te rugăm să nu folosești Serviciul.',
    sec1Title: '1. Ce este Serviciul',
    sec1Text1:
      'Verifact este un instrument care primește text, un link sau un screenshot și generează un raport automat despre veridicitatea afirmației, agregând surse din presă, baze de fact-checking, surse oficiale și rezultate de căutare, sintetizate cu ajutorul unui model AI.',
    sec1Text2Prefix: 'Contul este gratuit, cu o limită lunară de verificări. Planurile Pro și Business, afișate pe ',
    pricingLinkText: 'pagina de prețuri',
    sec1Text2Suffix: ', cresc acea limită; activarea lor se face momentan prin contact direct, nu printr-un flux de plată automat în aplicație.',
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
    sec5Title: '5. Cod deschis și conținutul tău',
    sec5Text1Prefix: 'Codul sursă este publicat sub licența MIT (Copyright (c) 2026 Sebi Iancu) în ',
    repoLinkText: 'repository-ul oficial',
    sec5Text1Suffix: '. Licența acoperă codul, nu numele „Verifact”, infrastructura sau baza de date pe care o operăm noi.',
    sec5Text2Prefix: 'Păstrezi drepturile asupra textului pe care îl trimiți spre verificare. Prin trimiterea lui, ne dai voie să îl procesăm — și să îl transmitem furnizorilor terți enumerați în ',
    privacyLinkText: 'Politica de confidențialitate',
    sec5Text2Suffix: ' — strict ca să generăm raportul cerut. Dacă alegi explicit să publici un raport, ne dai voie să îl afișăm, anonimizat, în secțiunea publică.',
    sec5Text3:
      'Dacă încarci un screenshot al conținutului altcuiva, garantezi că o faci în scop de verificare personală — o folosire care se încadrează în limitele dreptului la citat prevăzute de Legea nr. 8/1996. Imaginea este folosită doar pentru a extrage textul (OCR) și nu este păstrată după aceea.',
    sec6Title: '6. Corectarea unui raport',
    sec6TextPrefix: 'Verifact nu are un mecanism formal de contestare — vezi disclaimerul de la punctul 3. Dacă găsești o eroare factuală într-un raport, poți deschide un ',
    issueLinkText: 'issue pe GitHub',
    sec6TextSuffix: ' sau ne poți scrie la adresa din secțiunea Contact. Citim fiecare mesaj, dar nu promitem un termen de răspuns sau eliminarea automată a unui raport.',
    sec7Title: '7. Limitarea răspunderii',
    sec7Text:
      'În limita permisă de lege, nu răspundem pentru daune indirecte, incidentale sau de consecință (pierderi de profit, de date sau de reputație) rezultate din folosirea Serviciului, din erori ale rapoartelor generate automat sau din deciziile pe care le iei pe baza lor. Răspunderea noastră totală față de tine, pentru orice pretenție legată de acești termeni, este limitată la suma plătită de tine în ultimele 12 luni, sau 100 RON, oricare e mai mare.',
    sec8Title: '8. Contul tău',
    sec8TextPrefix: 'Poți renunța la Serviciu oricând. Dreptul tău de a-ți șterge definitiv contul și datele asociate e descris în ',
    sec8PrivacyLinkText: 'Politica de confidențialitate',
    sec8TextSuffix: '. Ne rezervăm dreptul de a suspenda un cont care încalcă repetat secțiunea 4.',
    sec9Title: '9. Modificări',
    sec9Text:
      'Putem modifica acești termeni; data de mai sus arată ultima actualizare. Continuarea folosirii Serviciului după o modificare înseamnă că ești de acord cu noua versiune.',
    sec10Title: '10. Legea aplicabilă',
    sec10Text: 'Acești termeni sunt guvernați de legea română. Orice litigiu se supune instanțelor competente din România.',
    sec11Title: '11. Contact',
    sec11Text: 'Pentru întrebări despre acești termeni, scrie la ',
  },
};

export type Translations = typeof ro;
