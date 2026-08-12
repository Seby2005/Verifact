import fs from 'fs';
import path from 'path';
import { renderReportPdf } from '../src/lib/pdf/ReportDocument';
import type { VerificationReport } from '../src/types/verification';
import type { ReportSynthesis } from '../src/lib/ai/report-synthesis';

const sampleReport: VerificationReport = {
  id: 'vf-8f92a10b-2026',
  inputText: 'Primăria Capitalei și STB oferă 500 de carduri de călătorie gratuite valabile 1 an de zile pentru doar 12 RON din cauza aniversării de 115 ani!',
  verifiedClaim: 'STB / Primăria Capitalei oferă carduri cadou cu abonament gratuit pe 1 an pentru suma de 12 RON.',
  posterCommentary: 'Grăbiți-vă oameni buni, am primit și eu cardul azi dimineață în poștă!! Oferta este valabilă doar până la sfârșitul săptămânii!',
  inputType: 'screenshot',
  verdict: 'false',
  score: 12,
  confidenceLevel: 'high',
  riskLevel: 'critical',
  executiveSummary: 'Anunțul privind oferirea de carduri de călătorie STB gratuite sau la prețul simbolic de 12 RON este o tentativă de dezinformare și fraude tip phishing. Societatea de Transport București și Primăria Municipiului București au dezmințit oficial existența acestei campanii.',
  createdAt: '2026-08-12T09:30:00.000Z',
  isPublic: true,
  language: 'ro',
  scoreBreakdown: {
    finalScore: 12,
    availableLayers: 4,
    layer1Score: 0,
    layer2Score: 10,
    layer3Score: 0,
    layer4Score: 15,
    weights: { factCheck: 0.4, news: 0.3, official: 0.2, social: 0.1 }
  },
  sources: [
    {
      title: 'Avertisment STB privind tentativele de fraudă online și paginile false de Facebook',
      publisher: 'Societatea de Transport București (STB SA)',
      url: 'https://stbsa.ro/comunicate_text?id=1842',
      publishedAt: '2026-08-10',
      date: '2026-08-10',
      sourceType: 'official',
      supports: false,
      relevance: 0.98,
      excerpt: 'STB SA informează publicul că nu desfășoară nicio campanie de promovare care să ofere abonamente de călătorie la prețuri reduse sau gratuite prin intermediul unor link-uri externe ori pagini nesecurizate de social media.'
    },
    {
      title: 'ALERTĂ PHISHING: Pagină falsă STB promite carduri cadou pe rețelele sociale',
      publisher: 'Digi24 Știri',
      url: 'https://www.digi24.ro/stiri/actualitate/alerta-phishing-stb-carduri-cadou-2891021',
      publishedAt: '2026-08-11',
      date: '2026-08-11',
      sourceType: 'news',
      supports: false,
      relevance: 0.95,
      excerpt: 'Expertul în securitate cibernetică avertizează că site-ul din spatele postării clonează grafica oficială STB pentru a fura datele bancare ale utilizatorilor.'
    },
    {
      title: 'FALS: STB nu distribuie abonamente pe 1 an cu 12 lei',
      publisher: 'FactCheck.ro',
      url: 'https://factcheck.ro/fals-stb-carduri-cadou-12-lei',
      publishedAt: '2026-08-11',
      date: '2026-08-11',
      sourceType: 'fact_check',
      supports: false,
      relevance: 0.99,
      excerpt: 'Postările folosesc imagini generate digital și pagini nou create care imită sigla STB. Nicio ofertă de acest tip nu este menționată pe canalele oficiale ale instituției.'
    }
  ],
  disclaimer: 'Acest raport a fost generat automat de platforma Verifact pe baza verificării încliniției factuale din surse publice și baze de date oficiale. Raportul nu constituie consiliere juridică.'
};

const sampleSynthesis: ReportSynthesis = {
  verdictRationale: 'Verdictul de "Probabil fals" (Scor 12/100) se bazează pe dezmințirea oficială transmisă de STB SA și pe analiza tehnică a paginilor de phishing care clonau identitatea instituției.',
  whatToRemember: [
    'STB nu organizează nicio tombolă sau promoție cu abonamente la 12 RON.',
    'Link-urile din postările de pe rețelele sociale direcționează către site-uri de phishing create pentru furat date bancare.',
    'Orice campanie legitimă STB este anunțată exclusiv pe stbsa.ro și pmb.ro.',
    'Grafica postării conține elemente generate prin AI și sigle vechi ale instituției.'
  ],
  agreements: 'Toate sursele oficiale, jurnaliștii de investigație și experții în securitate cibernetică confirmă unanim că este o tentativă de fraudă.',
  contradictions: 'Postarea de pe social media susține că abonamentele se trimit prin poștă, în timp ce STB precizează că cardurile nominale se eliberează doar la centrele de emitere cu buletinul.',
  sourceInsights: [
    { index: 1, takeaway: 'Dezmințire oficială STB privind campaniile frauduloase din mediul online.', stance: 'contrazice' },
    { index: 2, takeaway: 'Analiză tehnică a vectorului de atac de phishing ce vizează utilizatorii din București.', stance: 'contrazice' },
    { index: 3, takeaway: 'Verificare factuală completă ce demonstrează că pagina de Facebook este creată recent.', stance: 'contrazice' }
  ],
  commentaryAssessment: 'Comentariul adăugat ("am primit și eu cardul azi") este un profil fals / bot creat pentru a da impresia de legitimitate (social proof).',
  deepReasoning: `Campania frauduloasă identificată face parte dintr-un val cibernetic bine structurat numit "Brand Impersonation Phishing". Atacatorii au creat o pagină de Facebook intitulată fals "Cardul de transport București", folosind identitatea vizuală a STB SA.

Mecanismul de manipulare se bazează pe crearea unei urgențe artificiale ("doar 500 de carduri", "doar până la sfârșitul săptămânii") și un preț derizoriu (12 RON pentru 1 an de transport neimitat), stimulând victimele să introducă datele cardului bancar pe un site clona nesecurizat.

Analiza Verifact arată că domeniul către care trimitea link-ul a fost înregistrat cu doar 48 de ore înainte și găzduit pe servere private anonimizate. Nicio comunicare publică de la Primăria Generală sau STB nu validează această inițiativă.`,
  subClaims: [
    { subClaim: 'STB oferă 500 de abonamente pe 1 an la 12 RON', verdict: 'false', explanation: 'Dezmințit oficial de STB SA; prețul real al unui abonament anual este 1000 RON.' },
    { subClaim: 'Oferta este prilejuită de aniversarea de 115 ani', verdict: 'false', explanation: 'Pretext inventat de atacatori pentru a justifica pretinsa reducere.' },
    { subClaim: 'Cardurile se primesc prin poștă', verdict: 'false', explanation: 'Abonamentele nominale STB se emit exclusiv la ghișee cu identificare fizică.' }
  ],
  manipulationTechniques: [
    { name: 'Phishing & Impersonare de Brand', description: 'Utilizarea neautorizată a siglei și numelui STB SA pentru a păcăli utilizatorii.' },
    { name: 'Urgență Artificială & Ultimele Bucăți', description: 'Limitarea la 500 de carduri pentru a determina victima să acționeze fără să verifice.' },
    { name: 'Fals Social Proof (Comentarii Bot)', description: 'Adăugarea de comentarii de la conturi false care susțin că au primit cardul.' }
  ],
  motiveAndImpact: 'Motivația atacatorilor este strict financiară (sustragerea datelor de pe cardurile bancare ale victimelor). Impactul este ridicat în rândul persoanelor în vârstă sau neexperimentate cu mediul online.',
  missingEvidence: [
    'Comunicat de presă pe site-ul oficial stbsa.ro sau pmb.ro.',
    'Hotărâre CGMB (Consiliul General) privind aprobarea unei gratuități de acest tip.',
    'Certificat SSL valid și domeniu oficial .ro pentru site-ul de înscriere.'
  ],
  journalistFaq: [
    {
      question: 'Cum pot jurnaliștii verifica rapid dacă o ofertă de transport este reală?',
      answer: 'Verificați întotdeauna pe stbsa.ro la secțiunea Noutăți/Comunicate sau solicitați o confirmare de la biroul de presă STB înainte de publicare.'
    },
    {
      question: 'Care sunt riscurile pentru cetățenii care au accesat link-ul?',
      answer: 'Risc iminent de compromitere a cardului bancar și abonare la servicii cu taxare recurentă neautorizată. Se recomandă blocarea imediată a cardului.'
    }
  ]
};

async function generateSample() {
  console.log('⏳ Generare Raport PDF de test...');
  const pdfBuffer = await renderReportPdf({
    report: sampleReport,
    synthesis: sampleSynthesis,
    locale: 'ro'
  });

  const outputPath = path.join(process.cwd(), 'Raport_Verifact_Test_STB.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`✅ Raport PDF generat cu succes la: ${outputPath}`);
}

generateSample().catch(console.error);
