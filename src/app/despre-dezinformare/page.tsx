'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

const CONTENT = {
  ro: {
    eyebrow: 'Ghid de autoapărare digitală',
    title: 'Dezinformarea pe înțelesul tuturor: cum o recunoști și o oprești',
    lead: 'Falsurile din mediul online nu mai arată ca niște minciuni evidente. Sunt ambalate în jumătăți de adevăr, clipuri vechi scoase din context și titluri construite special să stârnească frică sau revoltă. Iată cum funcționează manipularea și cum te aperi în 5 pași rapizi.',
    calloutLabel: 'Regula de aur',
    calloutText:
      'Cel mai puternic filtru împotriva dezinformării ești chiar tu, în cele 5 secunde dinainte de a apăsa „Distribuie”. O pauză scurtă rupe un lanț de panică ce altfel ar ajunge la mii de oameni.',

    // Section 1: Pillars
    pillarsTitle: 'Anatomia manipulării: de ce prind știrile false?',
    pillarsLead:
      'Dezinformarea nu se răspândește pentru că oamenii ar fi naivi, ci pentru că este optimizată psihologic și algoritmic să ocolească rațiunea.',
    pillars: [
      {
        badge: '01 · Emoție',
        title: 'Miza pe frică și revoltă',
        text: 'Conținutul care stârnește indignare sau teamă se distribuie de 6 ori mai repede decât o analiză factuală. Furia este comutatorul care deconectează gândirea critică și provoacă reacția impulsivă de share.',
      },
      {
        badge: '02 · Psihologie',
        title: 'Capcana confirmării',
        text: 'Avem tendința să acceptăm instantaneu orice zvon care se potrivește cu temerile sau convingerile noastre și să contestăm doar ce ne contrazice. Creatorii de falsuri știu exact ce butoane să apese.',
      },
      {
        badge: '03 · Algoritm',
        title: 'Asimetria vitezei',
        text: 'O minciună senzațională face înconjurul internetului în 2 ore. O verificare documentată sau o dezmințire oficială durează ore sau zile și ajunge doar la o mică parte din publicul inițial.',
      },
    ],

    // Section 2: Real Techniques (Inforadar style)
    techniquesTitle: 'Tipare și tehnici frecvente (cu exemple reale)',
    techniquesLead:
      'Iată principalele mecanisme de dezinformare documentate în spațiul public și cum le demaști imediat:',
    techniques: [
      {
        tag: 'Context fals',
        title: 'Reciclarea imaginilor și clipurilor vechi',
        trap: 'O filmare dramatică (exercițiu militar din 2021, o explozie industrială veche sau chiar secvențe dintr-un joc video) este reetichetată drept „ACUM: Atac în direct!”.',
        reality:
          'Materialul vizual este real, dar data și locul sunt 100% false. Se mizează pe faptul că nimeni nu verifică originea clipului.',
        example:
          'Exemplu real: Filmări de la exerciții militare din anii trecuți prezentate pe TikTok drept trupe care intră în țară în această dimineață.',
      },
      {
        tag: 'Alarmism extrem',
        title: 'Victimizare și cifre dramatice inventate',
        trap: 'Mesaje alarmiste cu detalii emoționale fabricate: „800 de soldați răniți secretizați în spitale” sau „victime ascunse de autorități”.',
        reality:
          'Scopul este crearea de panică și neîncredere generală. Dacă un eveniment de o asemenea amploare ar fi real, ar fi imposibil de ținut secret de presă și medici.',
        example:
          'Exemplu real: Zvonuri virale pe WhatsApp despre presupuse convoaie medicale secrete și unități spitalicești blocate.',
      },
      {
        tag: 'Teoria trădării',
        title: 'Narațiunea complotului instituțional',
        trap: 'Afirmația că instituțiile sau aliații „știu, dar lasă intenționat să se întâmple” incidente grave din trădare sau lașitate.',
        reality:
          'Se urmărește slăbirea încrederii în capacitatea de apărare și în mecanismele democratice fundamentale ale societății.',
        example:
          'Exemplu real: Speculații că armata „a lăsat intenționat o dronă să cadă” pentru a ascunde un incident diplomatic.',
      },
      {
        tag: 'Clickbait & trunchiere',
        title: 'Titlul care minte în locul textului',
        trap: 'Titluri panicarde cu majuscule: „SE INTERZIC BANII CASH DE LUNA VIITOARE!”. În corpul articolului, se vorbește despre un simplu sondaj orientativ.',
        reality:
          'Peste 60% dintre oameni dau share citind doar titlul. Creatorii de conținut senzaționalist monetizează frica ta prin vizualizări și clicuri.',
        example:
          'Exemplu real: O declarație oficială scoasă din context prin eliminarea condițiilor nuanțate care schimbau complet sensul frazei.',
      },
    ],

    // Section 3: 5-Step Checklist
    stepsTitle: 'Ghid practic de verificare în 5 pași (sub 1 minut)',
    stepsLead:
      'Nu trebuie să fii jurnalist de investigație. Respectă acest checklist rapid înainte de a da mai departe orice informație suspectă:',
    steps: [
      {
        num: '01',
        title: 'Reflexul de 5 secunde: verifică-ți emoția',
        text: 'Dacă o postare te face să simți frică acută, furie sau revoltă instantanee, respiră. Furia este combustibilul manipulării. Nu apăsa pe „Distribuie” la primul impuls.',
      },
      {
        num: '02',
        title: 'Urmărește sursa primară',
        text: 'Cine a spus concret asta? Există un comunicat oficial, o declarație filmată integral sau o instituție asumată? O postare care începe cu „Se aude că...” sau „Mi-a trimis o cunoștință din sistem” este un zvon, nu o dovadă.',
      },
      {
        num: '03',
        title: 'Deschide linkul și citește dincolo de titlu',
        text: 'Intră pe link înainte de a da share. Verifică data publicării (să nu fie o știre din 2019 reciclată) și vezi dacă textul conține date concrete sau doar speculații vagi.',
      },
      {
        num: '04',
        title: 'Fă o căutare inversă de imagini (Google Lens)',
        text: 'Dacă vezi o fotografie șocantă, caut-o cu Google Lens pe telefon sau pe Google Images. În câteva secunde vei afla unde, când și în ce context a fost făcută fotografia originală.',
      },
      {
        num: '05',
        title: 'Raportează direct și rupe lanțul viral',
        text: 'Dacă lași un comentariu nervos de tipul „E o minciună!”, algoritmul interpretează interacțiunea ta ca pe un semnal de popularitate și distribuie postarea mai departe. Folosește butonul de raportare (Report → False information).',
      },
    ],

    // Section 4: Family & WhatsApp
    familyTitle: 'Cum vorbești cu cei dragi când distribuie un fals',
    familyLead:
      'Cei mai mulți dintre noi întâlnim dezinformarea pe grupurile de familie sau de la prieteni apropiați care o dau mai departe din grijă, cu bună-credință. Iată cum ajuți eficient fără să strici relația:',
    familyRules: [
      {
        title: '1. Discută în privat',
        text: 'Nu corecta persoana pe grupul mare sau în comentarii publice. Oamenii devin defensivi când se simt judecați în fața altora. Un mesaj privat cald funcționează mult mai bine.',
      },
      {
        title: '2. Trimite sursa, nu etichete',
        text: 'În loc de „Cum ai putut crede prostia asta?”, scrie: „M-am speriat și eu când am văzut, dar am căutat și uite ce spun verificările oficiale și presa independentă: [link]”.',
      },
      {
        title: '3. Fără superioritate morală',
        text: 'Falsurile moderne sunt realizate profesionist. Oricine poate fi păcălit într-un moment de neatenție. Focusează-te pe informare corectă, nu pe a câștiga o dispută.',
      },
    ],

    // Section 5: Guides & Tools
    guidesTitle: 'Ghiduri practice și instrumente Verifact',
    guidesLead:
      'Aprofundează tehnicile de securitate digitală și verifică rapid orice afirmație suspectă:',
    guides: [
      {
        tag: 'Ghid Practic',
        title: 'Cum identifici un Deepfake',
        desc: 'Recunoaște vocile clonate și fețele generate cu inteligență artificială în clipurile virale.',
        href: '/despre-dezinformare/cum-identifici-deepfake',
        action: 'Citește ghidul →',
      },
      {
        tag: 'Securitate',
        title: 'Scheme de Phishing & Înșelăciuni',
        desc: 'Cum te protejezi de conturile false, reclamele frauduloase și linkurile capcană.',
        href: '/despre-dezinformare/scheme-phishing-social-media',
        action: 'Află mai multe →',
      },
      {
        tag: 'Educație',
        title: 'Glosarul de Dezinformare',
        desc: 'Dicționar clar cu termeni esențiali: malinformare, boți, camere de ecou și surse primare.',
        href: '/resurse/glosar-dezinformare',
        action: 'Explorează glosarul →',
      },
    ],

    closingText: 'Ai dubii despre ceva ce ai văzut online? ',
    verifyLink: 'Verifică acum pe Verifact',
    orText: ' sau consultă ',
    methodologyLink: 'metodologia noastră de verificare',
    sourcesNote:
      'Inspirat din bunele practici de conștientizare și prevenție dezvoltate de platforme de referință precum InfoRadar (MApN) și EUvsDisinfo.',
  },

  en: {
    eyebrow: 'Digital Self-Defense Guide',
    title: 'Understanding Disinformation: How to Spot and Stop It',
    lead: 'Modern online falsehoods rarely look like obvious lies. They are packaged in half-truths, recycled footage taken out of context, and headlines engineered to trigger fear or outrage. Here is how manipulation works and how to protect yourself in 5 fast steps.',
    calloutLabel: 'Golden Rule',
    calloutText:
      'The most powerful filter against disinformation is you, in the 5 seconds before tapping "Share". A short pause breaks a chain of panic that would otherwise reach thousands.',

    // Section 1: Pillars
    pillarsTitle: 'The Anatomy of Manipulation: Why False News Spreads',
    pillarsLead:
      'Disinformation does not spread because people are naive, but because it is psychologically and algorithmically engineered to bypass reason.',
    pillars: [
      {
        badge: '01 · Emotion',
        title: 'Exploiting Fear and Anger',
        text: 'Content that triggers outrage or fear travels 6 times faster than factual reporting. Anger is the mental switch that turns off critical thinking and prompts an instant share.',
      },
      {
        badge: '02 · Psychology',
        title: 'The Confirmation Trap',
        text: 'We tend to immediately believe rumors that confirm our pre-existing fears or beliefs, while scrutinizing only what contradicts us. Bad actors know exactly which emotional triggers to pull.',
      },
      {
        badge: '03 · Algorithm',
        title: 'The Speed Asymmetry',
        text: 'A sensational lie circles the globe in 2 hours. A rigorous fact-check or official correction takes hours or days and rarely reaches the same original audience.',
      },
    ],

    // Section 2: Real Techniques
    techniquesTitle: 'Common Patterns and Techniques (With Real Examples)',
    techniquesLead:
      'Here are key disinformation mechanisms documented in public discourse and how to spot them instantly:',
    techniques: [
      {
        tag: 'False Context',
        title: 'Recycling Old Photos and Videos',
        trap: 'Dramatic footage (a 2021 military drill, an old industrial accident, or even video game clips) is relabeled as "BREAKING: Live attack right now!".',
        reality:
          'The visuals are genuine, but the timestamp and location are completely fake. The tactic relies on nobody taking 10 seconds to check origin dates.',
        example:
          'Real case: Past training footage circulated on TikTok claiming foreign troops were crossing borders this morning.',
      },
      {
        tag: 'Extreme Alarmism',
        title: 'Fabricated Victims and Panic Numbers',
        trap: 'Alarmist messages with heart-wrenching fabricated details: "800 wounded soldiers hidden in secret wards" or "casualties covered up by officials".',
        reality:
          'The goal is sowing societal panic and distrust. If an event of this scale were real, independent reporters, hospitals, and locals would make it impossible to conceal.',
        example:
          'Real case: Viral WhatsApp voice notes claiming secret medical convoys and overwhelmed trauma centers.',
      },
      {
        tag: 'Conspiracy Theory',
        title: 'The Institutional Betrayal Narrative',
        trap: 'Claims that authorities or international allies "know everything but intentionally let disasters happen" out of cowardice or treason.',
        reality:
          'Designed to undermine public trust in national defense and democratic institutions.',
        example:
          'Real case: False claims alleging military officials deliberately permitted a drone strike to cover up diplomatic tensions.',
      },
      {
        tag: 'Clickbait & Distortion',
        title: 'Headlines That Contradict the Article',
        trap: 'Alarmist all-caps headlines: "CASH MONEY BANNED STARTING NEXT MONTH!". Inside, the article merely mentions a non-binding exploratory survey.',
        reality:
          'Over 60% of social media users share links without reading past the headline. Sensationalist content creators monetize fear through clicks and ad impressions.',
        example:
          'Real case: Official statements taken out of context by chopping off qualifying clauses that completely altered the meaning.',
      },
    ],

    // Section 3: 5-Step Checklist
    stepsTitle: '5-Step Verification Checklist (Under 1 Minute)',
    stepsLead:
      'You do not need to be an investigative journalist. Follow this simple checklist before passing on any suspicious claim:',
    steps: [
      {
        num: '01',
        title: 'The 5-Second Rule: Check Your Emotion',
        text: 'If a post triggers acute panic, outrage, or instant fury, pause and breathe. Outrage is the engine of manipulation. Never share on immediate impulse.',
      },
      {
        num: '02',
        title: 'Trace the Primary Source',
        text: 'Who specifically said this? Is there an official statement, unedited video footage, or an identifiable institution? A post starting with "Heard from an insider..." is a rumor, not evidence.',
      },
      {
        num: '03',
        title: 'Open the Link and Read Past the Headline',
        text: 'Always open the article before sharing. Check the publication date (ensure it is not a recycled 2019 story) and see if the body text actually backs up the alarming headline.',
      },
      {
        num: '04',
        title: 'Run a Reverse Image Search (Google Lens)',
        text: 'When you see a shocking photo, drop it into Google Lens or Google Images. Within seconds, you will discover where, when, and in what context the photo was originally taken.',
      },
      {
        num: '05',
        title: 'Report Directly and Break the Viral Chain',
        text: 'Leaving angry comments like "This is fake!" tells the platform algorithm that the post has high engagement, boosting it to more people. Instead, use the platform report button (Report → False information).',
      },
    ],

    // Section 4: Family & WhatsApp
    familyTitle: 'How to Talk to Loved Ones When They Share Falsehoods',
    familyLead:
      'Most of us encounter misinformation not from malicious bots, but in family group chats from loved ones sharing out of genuine concern. Here is how to help without straining relationships:',
    familyRules: [
      {
        title: '1. Reach Out Privately',
        text: 'Never call someone out in front of the entire group chat. People become defensive when corrected in public. A gentle private message is far more effective.',
      },
      {
        title: '2. Share Sources, Not Labels',
        text: 'Instead of "How could you believe this?", write: "I was worried when I saw this too, but I looked it up and found what official agencies and independent journalists actually reported: [link]".',
      },
      {
        title: '3. Avoid Condescension',
        text: 'Modern fakes are crafted to deceive. Anyone can be misled in an unguarded moment. Focus on sharing clear facts rather than winning an argument.',
      },
    ],

    // Section 5: Guides & Tools
    guidesTitle: 'Practical Guides & Verifact Tools',
    guidesLead:
      'Deepen your digital literacy skills and quickly verify any questionable claim:',
    guides: [
      {
        tag: 'Practical Guide',
        title: 'How to Spot a Deepfake',
        desc: 'Learn to detect AI-generated voices, synthetic video artifacts, and altered faces.',
        href: '/despre-dezinformare/cum-identifici-deepfake',
        action: 'Read guide →',
      },
      {
        tag: 'Security',
        title: 'Phishing & Social Media Scams',
        desc: 'Protect yourself against impersonator accounts, fraudulent ads, and trap links.',
        href: '/despre-dezinformare/scheme-phishing-social-media',
        action: 'Learn more →',
      },
      {
        tag: 'Education',
        title: 'Disinformation Glossary',
        desc: 'Clear definitions of key terms: malinformation, bot networks, echo chambers, and primary sources.',
        href: '/resurse/glosar-dezinformare',
        action: 'Explore glossary →',
      },
    ],

    closingText: 'Not sure about something you saw online? ',
    verifyLink: 'Check it now on Verifact',
    orText: ' or inspect ',
    methodologyLink: 'our verification methodology',
    sourcesNote:
      'Inspired by digital verification standards developed by leading initiatives including InfoRadar (MApN) and EUvsDisinfo.',
  },

  fr: {
    eyebrow: 'Guide d’auto-défense numérique',
    title: 'Comprendre la désinformation : la repérer et la stopper',
    lead: 'Les fausses informations modernes ne ressemblent plus à des mensonges évidents. Elles s’appuient sur des demi-vérités, des vidéos anciennes hors contexte et des titres sensationnels conçus pour susciter la peur ou la colère. Voici comment fonctionne la manipulation et comment s’en prémunir en 5 étapes rapides.',
    calloutLabel: 'Règle d’or',
    calloutText:
      'Le premier rempart contre la désinformation, c’est vous, dans les 5 secondes qui précèdent le partage. Une courte pause brise une chaîne virale qui toucherait des milliers de personnes.',

    // Section 1: Pillars
    pillarsTitle: 'L’anatomie de la manipulation : pourquoi les fausses nouvelles prennent-elles ?',
    pillarsLead:
      'La désinformation ne prolifère pas parce que les internautes sont naïfs, mais parce qu’elle est calibrée pour contourner notre esprit critique.',
    pillars: [
      {
        badge: '01 · Émotion',
        title: 'Exploiter la peur et l’indignation',
        text: 'Les contenus suscitant la colère ou l’angoisse se propagent 6 fois plus vite qu’une analyse factuelle. L’émotion vive court-circuite la réflexion et pousse au partage réflexe.',
      },
      {
        badge: '02 · Psychologie',
        title: 'Le piège de la confirmation',
        text: 'Nous avons naturellement tendance à valider les rumeurs qui confortent nos opinions préexistantes. Les créateurs de fausses nouvelles savent exactement sur quels leviers appuyer.',
      },
      {
        badge: '03 · Algorithme',
        title: 'L’asymétrie de vitesse',
        text: 'Un mensonge spectaculaire fait le tour des réseaux en 2 heures. Une rectification étayée prend des heures voire des jours et n’atteint souvent qu’une fraction de l’audience.',
      },
    ],

    // Section 2: Real Techniques
    techniquesTitle: 'Techniques courantes et exemples réels',
    techniquesLead:
      'Voici les principaux mécanismes de désinformation observés et la manière de les déjouer :',
    techniques: [
      {
        tag: 'Contexte trompeur',
        title: 'Le recyclage d’anciennes images et vidéos',
        trap: 'Une vidéo percutante (un vieil exercice militaire ou un extrait de jeu vidéo) est republiée avec la mention « EN DIRECT : Attaque imminente ! ».',
        reality:
          'L’image est authentique mais la date et le lieu sont faux. La tromperie repose sur le fait que peu d’internautes vérifient la date d’origine.',
        example:
          'Exemple réel : D’anciennes manœuvres militaires présentées sur TikTok comme une invasion en cours ce matin.',
      },
      {
        tag: 'Alarmisme aigu',
        title: 'Victimes inventées et chiffres anxiogènes',
        trap: 'Des messages alertant sur des bilans effrayants : « 800 soldats blessés dissimulés » ou « victimes cachées par les autorités ».',
        reality:
          'L’objectif est de générer la panique et la défiance. Un événement d’une telle ampleur ne pourrait être dissimulé aux soignants et aux journalistes de terrain.',
        example:
          'Exemple réel : Rumeurs virales sur WhatsApp prétendant que des hôpitaux sont secrètement saturés.',
      },
      {
        tag: 'Théorie du complot',
        title: 'Le récit de la trahison institutionnelle',
        trap: 'L’affirmation selon laquelle les autorités « savaient et ont laissé faire » des incidents graves par lâcheté ou trahison.',
        reality:
          'Le but est d’affaiblir la confiance des citoyens dans les institutions démocratiques et les dispositifs de sécurité.',
        example:
          'Exemple réel : Spéculations affirmant qu’un drone a été volontairement ignoré pour masquer un incident diplomatique.',
      },
      {
        tag: 'Piège à clics',
        title: 'Le titre trompeur qui contredit le texte',
        trap: 'Des titres anxiogènes en lettres capitales : « L’ARGENT LIQUIDE INTERDIT DÈS LE MOIS PROCHAIN ! », alors que l’article évoque seulement un rapport consultatif lointain.',
        reality:
          'Plus de 60 % des internautes partagent un article sans en lire le contenu. Les éditeurs sensationnalistes monétisent votre anxiété par le clic.',
        example:
          'Exemple réel : Une citation officielle tronquée de sa condition essentielle pour en inverser totalement la signification.',
      },
    ],

    // Section 3: 5-Step Checklist
    stepsTitle: 'Guide pratique en 5 étapes (en moins d’une minute)',
    stepsLead:
      'Pas besoin d’être journaliste d’investigation. Appliquez ces réflexes simples avant de relayer une information douteuse :',
    steps: [
      {
        num: '01',
        title: 'Le réflexe des 5 secondes : observez votre émotion',
        text: 'Si une publication suscite en vous une panique ou une colère immédiate, marquez un temps d’arrêt. Ne partagez jamais sous le coup de l’impulsion.',
      },
      {
        num: '02',
        title: 'Remontez à la source primaire',
        text: 'Qui s’exprime précisément ? Existe-t-il un communiqué officiel ou une déclaration enregistrée ? Les mentions vagues du type « d’après un proche bien informé » relèvent de la rumeur.',
      },
      {
        num: '03',
        title: 'Ouvrez le lien et lisez au-delà du titre',
        text: 'Consultez l’article avant tout partage. Vérifiez la date de parution (pour éviter les actualités recyclées) et assurez-vous que les faits soutiennent le titre.',
      },
      {
        num: '04',
        title: 'Effectuez une recherche d’image inversée (Google Lens)',
        text: 'Face à une photo choquante, utilisez Google Lens ou Google Images pour identifier en quelques secondes sa première publication sur le web.',
      },
      {
        num: '05',
        title: 'Signalez directement sans relayer la polémique',
        text: 'Commenter « C’est faux ! » signale à l’algorithme un fort engagement et favorise la diffusion du contenu. Utilisez directement l’option de signalement (Signaler → Fausse information).',
      },
    ],

    // Section 4: Family & WhatsApp
    familyTitle: 'Comment dialoguer avec ses proches sur les réseaux',
    familyLead:
      'La plupart des fausses nouvelles proviennent de discussions familiales ou d’amis partageant ces contenus de bonne foi, par précaution. Voici comment réagir avec bienveillance :',
    familyRules: [
      {
        title: '1. Échangez en privé',
        text: 'Ne contredisez pas la personne publiquement sur le groupe. Les gens se braquent lorsqu’ils sont repris devant d’autres. Un message privé et calme est bien plus constructif.',
      },
      {
        title: '2. Partagez des sources, pas des jugements',
        text: 'Plutôt que « Comment peux-tu croire ça ? », écrivez : « J’ai eu un doute aussi, mais j’ai vérifié et voici ce qu’indiquent les sources officielles et la presse : [lien] ».',
      },
      {
        title: '3. Faites preuve d’empathie',
        text: 'Les fausses informations actuelles sont sophistiquées. N’importe qui peut se faire piéger. Privilégiez l’explication plutôt que la confrontation.',
      },
    ],

    // Section 5: Guides & Tools
    guidesTitle: 'Guides pratiques et outils Verifact',
    guidesLead:
      'Approfondissez vos compétences de vérification et testez les déclarations suspectes :',
    guides: [
      {
        tag: 'Guide Pratique',
        title: 'Comment repérer un Deepfake',
        desc: 'Apprenez à déceler les voix synthétisées et les visages manipulés par IA.',
        href: '/despre-dezinformare/cum-identifici-deepfake',
        action: 'Lire le guide →',
      },
      {
        tag: 'Sécurité',
        title: 'Arnaques et Phishing sur les Réseaux',
        desc: 'Protégez-vous contre l’usurpation d’identité et les liens frauduleux.',
        href: '/despre-dezinformare/scheme-phishing-social-media',
        action: 'En savoir plus →',
      },
      {
        tag: 'Pédagogie',
        title: 'Glossaire de la Désinformation',
        desc: 'Définitions claires : mésinformation, fermes à trolls, bulles de filtres et sources primaires.',
        href: '/resurse/glosar-dezinformare',
        action: 'Explorer le glossaire →',
      },
    ],

    closingText: 'Un doute sur une information repérée sur internet ? ',
    verifyLink: 'Vérifier sur Verifact',
    orText: ' ou consulter ',
    methodologyLink: 'notre méthodologie de vérification',
    sourcesNote:
      'Inspiré des standards de sensibilisation développés par des plateformes de référence comme InfoRadar (MApN) et EUvsDisinfo.',
  },
} as const;

export default function DespreDezinformarePage() {
  const { locale } = useLanguage();
  const content = CONTENT[locale] ?? CONTENT.ro;

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 className={shell.title}>{content.title}</h1>
        <p className={shell.lead}>{content.lead}</p>
      </header>

      <div className={shell.body}>
        <Callout label={content.calloutLabel}>{content.calloutText}</Callout>

        {/* Section 1: Anatomy / Pillars */}
        <section className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{content.pillarsTitle}</h2>
          <p className={styles.sectionLead}>{content.pillarsLead}</p>
          <div className={styles.pillarsGrid}>
            {content.pillars.map((pillar) => (
              <div key={pillar.badge} className={styles.pillarCard}>
                <span className={styles.pillarBadge}>{pillar.badge}</span>
                <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                <p className={styles.pillarText}>{pillar.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Real Techniques & Examples */}
        <section className={shell.sectionRule}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{content.techniquesTitle}</h2>
            <p className={styles.sectionLead}>{content.techniquesLead}</p>
          </div>
          <div className={styles.techniquesGrid}>
            {content.techniques.map((item) => (
              <article key={item.title} className={styles.techniqueCard}>
                <div className={styles.techniqueHeader}>
                  <span className={styles.techniqueTag}>{item.tag}</span>
                  <h3 className={styles.techniqueTitle}>{item.title}</h3>
                </div>
                <div className={styles.techniqueBody}>
                  <div className={styles.techniqueRow}>
                    <span className={`${styles.techniqueLabel} ${styles.labelTrap}`}>
                      {locale === 'en' ? 'In the feed (The Trap)' : locale === 'fr' ? 'Dans le flux (Le Piège)' : 'În feed (Capcana)'}
                    </span>
                    <p className={styles.techniqueContent}>{item.trap}</p>
                  </div>
                  <div className={styles.techniqueRow}>
                    <span className={`${styles.techniqueLabel} ${styles.labelReality}`}>
                      {locale === 'en' ? 'The Reality' : locale === 'fr' ? 'La Réalité' : 'Realitatea din spate'}
                    </span>
                    <p className={styles.techniqueContent}>{item.reality}</p>
                  </div>
                  <div className={styles.techniqueExampleBox}>
                    {item.example}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section 3: 5-Step Action Checklist */}
        <section className={shell.sectionRule}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{content.stepsTitle}</h2>
            <p className={styles.sectionLead}>{content.stepsLead}</p>
          </div>
          <ol className={styles.stepsList}>
            {content.steps.map((step) => (
              <li key={step.num} className={styles.stepCard}>
                <span className={styles.stepNumber}>{step.num}</span>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Section 4: Family & WhatsApp Conversations */}
        <section className={shell.sectionRule}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{content.familyTitle}</h2>
            <p className={styles.sectionLead}>{content.familyLead}</p>
          </div>
          <div className={styles.familyBox}>
            <div className={styles.familyRulesGrid}>
              {content.familyRules.map((rule) => (
                <div key={rule.title} className={styles.familyRule}>
                  <h3 className={styles.familyRuleTitle}>{rule.title}</h3>
                  <p className={styles.familyRuleText}>{rule.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Specific Guides & Verifact Tools */}
        <section className={shell.sectionRule}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{content.guidesTitle}</h2>
            <p className={styles.sectionLead}>{content.guidesLead}</p>
          </div>
          <div className={styles.guidesGrid}>
            {content.guides.map((guide) => (
              <Link key={guide.title} href={guide.href} className={styles.guideCard}>
                <div>
                  <span className={styles.guideTag}>{guide.tag}</span>
                  <h3 className={styles.guideTitle}>{guide.title}</h3>
                  <p className={styles.guideDesc}>{guide.desc}</p>
                </div>
                <span className={styles.guideAction}>{guide.action}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 6: Closing & Citation note */}
        <section className={shell.sectionRule}>
          <p className={styles.closing}>
            {content.closingText}
            <Link href="/" className={styles.textLink}>
              {content.verifyLink}
            </Link>
            {content.orText}
            <Link href="/transparenta" className={styles.textLink}>
              {content.methodologyLink}
            </Link>
            .
          </p>
          <p className={styles.closing} style={{ marginTop: 'var(--space-3)', opacity: 0.75 }}>
            {content.sourcesNote}
          </p>
        </section>
      </div>
    </div>
  );
}
