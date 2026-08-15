'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

const CONTENT = {
  ro: {
    eyebrow: 'Misiune',
    title: 'De ce există Verifact',
    calloutLabel: 'Misiunea produsului',
    calloutText:
      'Construim instrumente simple și accesibile pentru a ajuta pe oricine să verifice rapid zvonurile, afirmațiile și screenshot-urile din social media prin dovezi factuale și surse deschise.',
    problemTitle: 'Ce probleme de dezinformare adresăm',
    problemText1:
      'În fiecare zi, milioane de oameni se lovesc de citate fabricate, imagini sau screenshot-uri scoase din context, titluri de senzație și zvonuri virale pe platforme precum WhatsApp, Facebook sau TikTok. O informație falsă se propagă în doar câteva minute pentru că stârnește reacții emoționale puternice (frică, indignare), în timp ce o verificare manuală de presă poate dura ore sau zile.',
    problemText2:
      'Verifact intervine fix în momentul de îndoială — oferindu-ți o modalitate rapidă și transparentă de a verifica dacă o afirmație virală are acoperire în fapte înainte de a o da mai departe.',
    criticalThinkingTitle: 'De ce contează gândirea critică',
    criticalThinkingText1:
      'Dezinformarea funcționează deoarece ocolește rațiunea și mizează pe impulsul de moment. Când o știre ne provoacă furie sau entuziasm, prima tendință este să o distribuim imediat fără a-i chestiona veridicitatea.',
    criticalThinkingText2:
      'Gândirea critică nu înseamnă să devii suspicios față de orice, ci să faci o scurtă pauză și să pui trei întrebări simple: Cine afirmă asta? Pe ce dovezi se bazează? Ce context lipsește? Verifact nu este un arbitru care îți spune ce să crezi, ci un sprijin pentru ca tu să îți poți trage singur propriile concluzii informate.',
    algorithmTitle: 'Cum ajută algoritmul concret (fără termeni tehnici)',
    algorithmSteps: [
      'Extrage afirmațiile cheie: Când introduci un text sau o imagine, sistemul identifică faptele concrete care pot fi verificate (date, cifre, declarații, evenimente).',
      'Caută în surse verificate: Compară automat aceste afirmații cu baze de date de fact-checking existente, arhive oficiale și articole din presă de încredere.',
      'Explică dovezi și nuanțe: În loc să îți ofere doar un simplu verdict opac, îți arată clar ce fapte se confirmă, ce este scos din context și unde poți citi sursa primară.',
    ],
    romaniaTitle: 'De ce România, mai întâi',
    romaniaBullets: [
      'Nu există în prezent un instrument automat de fact-checking nativ în limba română, gratuit și open source.',
      'Nevoia de verificare independentă a informațiilor din spațiul public românesc este ridicată și în continuă creștere.',
      'Jurnalismul de investigație și redacțiile independente (ex: G4Media, PressOne, Recorder) sunt surse de încredere și parteneri naturali în lupta cu falsurile.',
    ],
    notTitle: 'Ce nu suntem',
    notText:
      'Nu suntem un „judecător al adevărului” și nu înlocuim jurnalismul. Un raport automat Verifact este un punct de plecare bazat pe surse transparente, nu o decizie editorială absolută. Fiecare raport vine cu scorul și legăturile directe la vedere, astfel încât să poți verifica singur concluziile noastre.',
    valuesTitle: 'Valorile după care lucrăm',
    values: [
      {
        title: 'Transparență',
        text: 'Algoritmul și criteriile de evaluare sunt open source. Oricine poate inspecta modul în care se face verificarea.',
      },
      {
        title: 'Corectitudine',
        text: 'Nu luăm poziții politice și nu evaluăm opinii. Verificăm doar afirmații factuale în raport cu date reale.',
      },
      {
        title: 'Accesibilitate',
        text: 'Instrument gratuit și ușor de înțeles pentru utilizatorul obișnuit, fără jargon tehnic sau bariere de utilizare.',
      },
      {
        title: 'Responsabilitate',
        text: 'Fiecare verdict include trimiteri directe către surse verificabile, nu doar opinii sau scoruri opace.',
      },
      {
        title: 'Confidențialitate',
        text: 'Fișierele și screenshot-urile încărcate sunt procesate în siguranță, fără stocare permanentă nejustificată.',
      },
    ],
    followText: 'Află mai multe despre ',
    methodologyLink: 'metodologia de verificare',
    orText: ' sau consultă ',
    openSourceLink: 'codul open-source',
  },
  en: {
    eyebrow: 'Mission',
    title: 'Why Verifact Exists',
    calloutLabel: 'Product Mission',
    calloutText:
      'We build simple, accessible tools to help anyone quickly verify rumors, claims, and screenshots on social media through factual evidence and open sources.',
    problemTitle: 'The Misinformation Problem We Address',
    problemText1:
      'Every day, millions of people scroll past fake quotes, cropped screenshots, manipulated headlines, and viral rumors on platforms like WhatsApp, Facebook, or TikTok. False claims spread in minutes because they trigger strong emotions like fear or anger, while manual fact-checks take hours or days to produce.',
    problemText2:
      'Verifact steps in right at the moment of doubt—giving users a fast, transparent way to check whether a viral claim has real evidence behind it before sharing it further.',
    criticalThinkingTitle: 'Why Critical Thinking Matters',
    criticalThinkingText1:
      'Disinformation works because it bypasses logical reasoning and appeals directly to emotional reactions. When a headline makes us angry or thrilled, our natural instinct is to share it immediately without questioning its truth.',
    criticalThinkingText2:
      'Critical thinking isn’t about being skeptical of everything; it’s about pausing to ask three simple questions: Who is saying this? What evidence is provided? What context might be missing? Verifact doesn’t dictate what you should think—it provides the evidence so you can decide for yourself.',
    algorithmTitle: 'How the Algorithm Helps (Concretely, Without Technical Jargon)',
    algorithmSteps: [
      'Extracts key claims: When you upload a screenshot or text, the system isolates the specific factual assertions being made (dates, numbers, quotes, events).',
      'Cross-references trusted sources: It automatically searches database archives, official reports, and reputable journalism to see if the claim has been analyzed or verified.',
      'Breaks down evidence & context: Instead of giving an opaque rating, it highlights verified facts, missing context, or fabrications with direct links to primary sources.',
    ],
    romaniaTitle: 'Why Focus on Romania First',
    romaniaBullets: [
      'No native, open-source automated verification tool currently exists for the Romanian language.',
      'Public demand for fast, independent, non-partisan fact-checking is growing rapidly.',
      'Independent newsrooms (e.g. G4Media, PressOne, Recorder) are natural allies and sources of trustworthy context.',
    ],
    notTitle: 'What We Are Not',
    notText:
      'We are not an "arbiter of truth" and we do not replace journalists or editors. An automated report is an objective starting point grounded in source links, not an unquestionable verdict. Every result displays its sources and methodology so you can audit our findings yourself.',
    valuesTitle: 'Core Principles',
    values: [
      {
        title: 'Transparency',
        text: 'The algorithm and scoring criteria are completely open source so anyone can inspect how claims are checked.',
      },
      {
        title: 'Neutrality',
        text: 'We do not take political sides or evaluate opinions. We only compare factual claims against verifiable data.',
      },
      {
        title: 'Accessibility',
        text: 'Free and simple to use for everyday internet users, without paywalls or complex technical jargon.',
      },
      {
        title: 'Accountability',
        text: 'Every score is backed by direct, traceable source links so you don’t have to take our word for it.',
      },
      {
        title: 'Privacy First',
        text: 'User uploads and screenshots are processed safely without permanent storage or tracking.',
      },
    ],
    followText: 'Learn more about our ',
    methodologyLink: 'verification methodology',
    orText: ' or inspect our ',
    openSourceLink: 'open-source codebase',
  },
  fr: {
    eyebrow: 'Mission',
    title: 'Pourquoi Verifact existe',
    calloutLabel: 'Notre mission',
    calloutText:
      'Nous concevons des outils simples et accessibles permettant à chacun de vérifier instantanément rumeurs, déclarations et captures d’écran grâce à des preuves factuelles et des sources ouvertes.',
    problemTitle: 'Le défi de la désinformation',
    problemText1:
      'Chaque jour, des millions d’internautes font face à de fausses citations, des captures tronquées et des rumeurs virales sur WhatsApp, Facebook ou TikTok. Une fausse nouvelle se répand en quelques minutes en exploitant nos émotions, tandis qu’un fact-checking manuel requiert des heures voire des jours.',
    problemText2:
      'Verifact intervient précisément au moment du doute — en offrant un moyen rapide et transparent de s’assurer de la véracité d’une information avant de la relayer.',
    criticalThinkingTitle: 'L’importance de l’esprit critique',
    criticalThinkingText1:
      'La désinformation fonctionne en court-circuitant le raisonnement logique au profit de l’émotion immédiate. Quand un titre nous indigne, notre premier réflexe est de le partager sans recul.',
    criticalThinkingText2:
      'L’esprit critique ne consiste pas à douter de tout sans discernement, mais à se poser trois questions élémentaires : Qui s’exprime ? Quelles sont les preuves apportées ? Quel contexte manque-t-il ? Verifact ne vous dicte pas quoi penser — nous fournissons les sources pour que vous forgiez votre propre jugement.',
    algorithmTitle: 'Comment l’algorithme vous aide (sans jargon technique)',
    algorithmSteps: [
      'Extraction des faits clés : Lorsque vous soumettez un texte ou une capture, le système isole les affirmations factuelles précises (dates, chiffres, citations, événements).',
      'Recoupement avec des sources vérifiées : Il interroge automatiquement les archives de fact-checking, les bases institutionnelles et les médias de référence.',
      'Explication des nuances et preuves : Plutôt qu’un verdict binaire opaque, il explicite les faits confirmés, le contexte omis et fournit les liens vers les sources primaires.',
    ],
    romaniaTitle: 'Notre vision européenne et multilingue',
    romaniaBullets: [
      'Développer des solutions de vérification factuelle performantes et ouvertes à l’ensemble des citoyens européens.',
      'Répondre à une demande sociétale forte pour une information rigoureuse, transparente et indépendante.',
      'S’appuyer sur le journalisme d’investigation et les médias indépendants comme partenaires clés.',
    ],
    notTitle: 'Ce que nous ne sommes pas',
    notText:
      'Nous ne prétendons pas être des juges absolus de la vérité et ne nous substituons pas aux journalistes. Un rapport automatisé constitue une base d’investigation appuyée sur des sources, non un dogme. Chaque analyse affiche ses sources et sa méthode pour que vous puissiez auditer nos conclusions.',
    valuesTitle: 'Nos principes d’action',
    values: [
      {
        title: 'Transparence',
        text: 'L’algorithme et les critères d’évaluation sont entièrement open source et auditables par tous.',
      },
      {
        title: 'Neutralité',
        text: 'Nous ne prenons aucune position politique. Nous comparons uniquement les faits aux données vérifiables.',
      },
      {
        title: 'Accessibilité',
        text: 'Gratuit et conçu pour un usage simple par tous les citoyens.',
      },
      {
        title: 'Responsabilité',
        text: 'Chaque résultat renvoie directement vers des sources primaires traçables.',
      },
      {
        title: 'Confidentialité',
        text: 'Vos données et captures sont traitées de façon sécurisée sans conservation injustifiée.',
      },
    ],
    followText: 'En savoir plus sur notre ',
    methodologyLink: 'méthodologie de vérification',
    orText: ' ou consulter notre ',
    openSourceLink: 'code source open source',
  },
} as const;

export default function MisiunePage() {
  const { locale } = useLanguage();
  const content = CONTENT[locale] ?? CONTENT.ro;

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 className={shell.title}>{content.title}</h1>
      </header>

      <div className={shell.body}>
        <Callout label={content.calloutLabel}>
          {content.calloutText}
        </Callout>

        <div className={`${shell.prose} ${styles.prose}`}>
          <h2>{content.problemTitle}</h2>
          <p>{content.problemText1}</p>
          <p>{content.problemText2}</p>

          <h2>{content.criticalThinkingTitle}</h2>
          <p>{content.criticalThinkingText1}</p>
          <p>{content.criticalThinkingText2}</p>

          <h2>{content.algorithmTitle}</h2>
          <ul>
            {content.algorithmSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>

          <h2>{content.romaniaTitle}</h2>
          <ul>
            {content.romaniaBullets.map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>

          <h2>{content.notTitle}</h2>
          <p>{content.notText}</p>
        </div>

        <section className={shell.sectionRule}>
          <h2 className={styles.valuesTitle}>{content.valuesTitle}</h2>
          <dl className={styles.values}>
            {content.values.map((value) => (
              <div key={value.title} className={styles.value}>
                <dt className={styles.valueTitle}>{value.title}</dt>
                <dd className={styles.valueText}>{value.text}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.follow}>
            {content.followText}
            <Link href="/transparenta" className={styles.textLink}>
              {content.methodologyLink}
            </Link>
            {content.orText}
            <Link href="/open-source" className={styles.textLink}>
              {content.openSourceLink}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
