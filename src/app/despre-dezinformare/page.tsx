'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

const CONTENT = {
  ro: {
    eyebrow: 'Despre dezinformare',
    title: 'Dezinformarea și cum o oprești',
    calloutLabel: 'Pe scurt',
    calloutText:
      'Cel mai puternic filtru împotriva dezinformării ești tu, în secunda dinainte de a apăsa „distribuie”. Câteva secunde de verificare rup un lanț care altfel ar ajunge la mii de oameni.',
    whatTitle: 'Ce este, de fapt, dezinformarea',
    whatText1:
      'Dezinformarea este conținut fals sau înșelător răspândit intenționat — ca să inducă în eroare, să aducă bani sau să influențeze ce cred oamenii. Nu e același lucru cu informarea greșită, adică un fals distribuit de cineva care chiar crede că e adevărat. Afirmația poate fi identică; diferă doar intenția din spate.',
    whatText2:
      'În practică rareori știi intenția, și oricum contează prea puțin când tu ești cel care e pe cale să dea mai departe. Contează o singură întrebare: e adevărat, și de unde aș ști?',
    whyTitle: 'De ce se răspândește atât de repede',
    whyIntro:
      'Falsul e construit — de multe ori inconștient — ca să circule. Câteva mecanisme fac aproape toată treaba:',
    whyBullets: [
      'Emoția bate acuratețea. Conținutul care te înfurie, te sperie sau te indignează se distribuie mai repede decât cel care doar informează. Reacția puternică e cel mai bun semn că ceva urmează să devină viral.',
      'Îți confirmă ce crezi deja. Lăsăm garda jos în fața afirmațiilor care ne convin și le scrutăm pe cele care ne contrazic. Dezinformarea e croită special ca să ți se potrivească.',
      'Titlul minte în locul textului. Mulți distribuie doar pe baza titlului, fără să deschidă articolul — iar titlul spune adesea mai mult decât susține textul.',
      'Vechiul scos din context bate falsul nou. O poză reală din alt an sau altă țară, reetichetată drept „breaking”, e mai ieftină și mai convingătoare decât una fabricată.',
      'Viteza bate dezmințirea. Un fals ajunge la aproape tot publicul lui în câteva ore; dezmințirea, dacă vine, ajunge la o fracțiune, zile mai târziu.',
    ],
    resharingTitle: 'Problema republicării fără verificare',
    resharingText1:
      'Fiecare distribuire e un vot de încredere. Când dai ceva mai departe fără să verifici, îi împrumuți numele tău și rețeaua ta — iar pentru algoritm, distribuirea ta arată exact ca o girare din partea cuiva care a verificat. Așa ajunge o singură postare neverificată la oameni care nu ar fi văzut niciodată originalul.',
    resharingText2:
      'Asimetria e brutală: varianta falsă circulă larg și rapid pentru că așa a fost gândită; dezmințirea e tăcută, plictisitoare și întârziată. Odată ce cineva a văzut o afirmație, faptul că e demontată mai târziu rareori șterge complet prima impresie. Cel mai ieftin loc în care oprești un fals e înainte să-ți iasă din mâini.',
    checkTitle: 'Cum verifici, în sub un minut',
    checkIntro: 'Nu trebuie să fii expert. O pauză scurtă și onestă acoperă majoritatea cazurilor:',
    checkBullets: [
      { strong: 'Oprește-te înainte să distribui.', text: ' Dacă o postare te face să reacționezi instant, exact pentru asta a fost construită. Dă-i zece secunde.' },
      { strong: 'Caută sursa primară.', text: ' Cine a spus, unde și când? O afirmație fără o origine pe care s-o urmărești e o afirmație, nu un fapt.' },
      { strong: 'Verifică data.', text: ' Știrea veche reciclată e unul dintre cele mai frecvente trucuri. Asigură-te că e despre acum, nu de acum un an.' },
      { strong: 'Citește dincolo de titlu.', text: ' Deschide articolul. De multe ori textul nu susține titlul care te-a făcut să vrei să distribui.' },
      { strong: 'Caută imaginea invers.', text: ' O poză reală poate fi lipită peste o poveste falsă. O căutare după imagine arată unde a apărut prima dată.' },
      { strong: 'Vezi dacă mai relatează cineva.', text: ' Dacă ceva important e adevărat, îl relatează și surse credibile. Tăcerea în rest e un semnal de alarmă.' },
    ],
    everydayTitle: 'În viața de zi cu zi și în grupurile de familie',
    everydayText1:
      'Cei mai mulți dintre noi întâlnim dezinformarea nu de la troli anonimi, ci de la oameni dragi care dau ceva mai departe cu bună-credință. Asta face răspunsul mai greu, nu mai ușor.',
    everydayText2:
      'Corectează în privat, nu în fața unui public; vino cu o sursă, nu cu o etichetă; și nu face niciodată persoana să se simtă vinovată că a crezut — asta o face doar să se apere. Scopul nu e să câștigi o ceartă, ci să rămâneți amândoi mai bine informați.',
    closingText: 'Ai dubii despre ceva ce ai văzut online? ',
    verifyLink: 'Verifică acum',
    orText: ' sau citește ',
    methodologyLink: 'cum ajungem la un verdict',
  },
  en: {
    eyebrow: 'About disinformation',
    title: 'Disinformation, and how to stop it',
    calloutLabel: 'The short version',
    calloutText:
      'The strongest filter against disinformation is you, in the second before you tap “share”. A few seconds of checking break a chain that would otherwise reach thousands.',
    whatTitle: 'What disinformation actually is',
    whatText1:
      'Disinformation is false or misleading content spread on purpose — to deceive, to profit, or to influence what people believe. It is not the same as misinformation, which is false content shared by someone who genuinely thinks it is true. The claim can be identical; what differs is the intent behind it.',
    whatText2:
      'In practice you rarely know the intent, and it barely matters when you are the one about to pass it on. What matters is one question: is this actually true, and how would I know?',
    whyTitle: 'Why it spreads so fast',
    whyIntro:
      'False content is engineered — often unconsciously — to travel. A few mechanics do most of the work:',
    whyBullets: [
      'Emotion beats accuracy. Content that makes you angry, afraid, or outraged is shared faster than content that informs. Strong feeling is the single best predictor that something is about to go viral.',
      'It flatters what you already believe. We lower our guard for claims that fit our worldview and scrutinise the ones that do not. Disinformation is built to fit.',
      'Headlines do the lying. Many people share on the strength of a headline alone, without opening the article — and the headline often says more than the text supports.',
      'Old and out-of-context beats new. A real photo from another year or another country, relabelled as “breaking”, is cheaper and more convincing than a fake one.',
      'Speed beats correction. A false claim reaches most of its audience in hours; the correction, if it comes, reaches a fraction of them, days later.',
    ],
    resharingTitle: 'The problem with resharing without checking',
    resharingText1:
      'Every share is a vote of confidence. When you forward something without checking, you lend it your name and your network — and to the algorithm, your share looks exactly like an endorsement from someone who verified it. That is how a single unchecked post reaches people who would never have seen the original.',
    resharingText2:
      'The asymmetry is brutal: the false version travels wide and fast because it was designed to; the correction is quiet, boring, and late. Once someone has seen a claim, seeing it debunked rarely fully undoes the first impression. The cheapest place to stop a falsehood is before it leaves your hands.',
    checkTitle: 'How to check, in under a minute',
    checkIntro: 'You do not need to be an expert. A short, honest pause covers most cases:',
    checkBullets: [
      { strong: 'Pause before you share.', text: ' If a post makes you react instantly, that reaction is exactly what it was built for. Give it ten seconds.' },
      { strong: 'Find the primary source.', text: ' Who said this, where, and when? A claim with no traceable origin is a claim, not a fact.' },
      { strong: 'Check the date.', text: ' Recycled old news is one of the most common tricks. Make sure it is about now, not a year ago.' },
      { strong: 'Read past the headline.', text: ' Open the article. Often the text does not support the headline that made you want to share it.' },
      { strong: 'Reverse-search the image.', text: ' A real photo can be dropped into a false story. An image search shows where it first appeared.' },
      { strong: 'Look for independent coverage.', text: ' If something big is true, credible outlets will report it too. Silence everywhere else is a warning.' },
    ],
    everydayTitle: 'In everyday life and family group chats',
    everydayText1:
      'Most of us meet disinformation not from anonymous trolls but from people we love, forwarding something in good faith. That makes the reply harder, not easier.',
    everydayText2:
      'Correct in private rather than in front of an audience, lead with a source rather than a verdict, and never make the person feel stupid for having believed it — that only makes them defend the claim. The goal is not to win the argument; it is to leave everyone a little better informed.',
    closingText: 'Not sure about something you saw? ',
    verifyLink: 'Check it now',
    orText: ' or read ',
    methodologyLink: 'how we reach a verdict',
  },
  fr: {
    eyebrow: 'Comprendre la désinformation',
    title: 'La désinformation et comment la stopper',
    calloutLabel: 'En résumé',
    calloutText:
      'Le premier rempart contre la désinformation, c’est vous, dans la seconde qui précède le clic sur « partager ». Quelques secondes de vérification brisent une chaîne virale touchant des milliers de personnes.',
    whatTitle: 'Qu’est-ce que la désinformation ?',
    whatText1:
      'La désinformation est un contenu faux ou trompeur diffusé délibérément pour tromper, générer des profits ou influencer l’opinion. Elle se distingue de la mésinformation, qui est partagée de bonne foi par une personne persuadée de sa véracité.',
    whatText2:
      'En pratique, l’intention est rarement évidente. L’unique question qui compte au moment de relayer une information est : est-ce véridique et comment puis-je le vérifier ?',
    whyTitle: 'Pourquoi se propage-t-elle si vite ?',
    whyIntro:
      'Les fausses informations sont conçues pour être virales. Quelques mécanismes clés expliquent leur succès :',
    whyBullets: [
      'L’émotion prime sur l’exactitude. Les contenus suscitant la colère, la peur ou l’indignation se partagent bien plus vite que les faits neutres.',
      'Le biais de confirmation. Nous baissons notre vigilance face aux affirmations confortant nos croyances préexistantes.',
      'Les titres trompeurs (clickbait). Beaucoup d’internautes partagent un article sur la seule base de son titre sensationnel.',
      'Le recyclage d’images hors contexte. Réutiliser une vraie photo ancienne en la prétendant « en direct » est redoutablement efficace.',
      'La vitesse dépasse le démenti. Une fausse nouvelle fait le tour du web en quelques heures, tandis que la rectification arrive souvent trop tard.',
    ],
    resharingTitle: 'Le danger du partage sans vérification',
    resharingText1:
      'Chaque partage est perçu comme une caution personnelle auprès de vos proches. Pour les algorithmes, votre relais ressemble à une validation vérifiée.',
    resharingText2:
      'L’asymétrie est forte : le faux va vite, le démenti est lent. Le moyen le plus sûr d’arrêter une tromperie est de la bloquer avant de la relayer.',
    checkTitle: 'Comment vérifier en moins d’une minute',
    checkIntro: 'Pas besoin d’être un expert. Quelques réflexes simples suffisent dans la plupart des cas :',
    checkBullets: [
      { strong: 'Faites une pause avant de relayer.', text: ' Si une publication provoque une réaction émotionnelle vive, donnez-vous 10 secondes de recul.' },
      { strong: 'Recherchez la source primaire.', text: ' Qui l’a affirmé, où et quand ? Sans source directe traçable, une affirmation reste une simple rumeur.' },
      { strong: 'Vérifiez la date de parution.', text: ' Le recyclage de vieilles actualités est un piège classique. Vérifiez la fraîcheur temporelle.' },
      { strong: 'Lisez au-delà du titre.', text: ' Ouvrez l’article. Le corps du texte contredit souvent le titre racoleur.' },
      { strong: 'Effectuez une recherche d’image inversée.', text: ' Identifiez où et quand une photo a été publiée pour la première fois.' },
      { strong: 'Recoupez avec d’autres médias.', text: ' Un fait marquant réel est systématiquement couvert par plusieurs rédactions de référence.' },
    ],
    everydayTitle: 'Dans la vie quotidienne et les discussions de famille',
    everydayText1:
      'La désinformation provient souvent de proches partageant des messages en toute sincérité. Cela exige une approche bienveillante.',
    everydayText2:
      'Dialoguez en privé plutôt qu’en public, apportez une source fiable plutôt qu’un jugement péremptoire, et ne culpabilisez pas votre interlocuteur.',
    closingText: 'Un doute sur une information repérée sur internet ? ',
    verifyLink: 'Vérifier maintenant',
    orText: ' ou découvrir ',
    methodologyLink: 'notre méthodologie de vérification',
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
      </header>

      <div className={shell.body}>
        <Callout label={content.calloutLabel}>{content.calloutText}</Callout>

        <div className={`${shell.prose} ${styles.prose}`}>
          <h2>{content.whatTitle}</h2>
          <p>{content.whatText1}</p>
          <p>{content.whatText2}</p>

          <h2>{content.whyTitle}</h2>
          <p>{content.whyIntro}</p>
          <ul>
            {content.whyBullets.map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>

          <h2>{content.resharingTitle}</h2>
          <p>{content.resharingText1}</p>
          <p>{content.resharingText2}</p>

          <h2>{content.checkTitle}</h2>
          <p>{content.checkIntro}</p>
          <ul>
            {content.checkBullets.map((bullet, idx) => (
              <li key={idx}>
                <strong className={styles.checkStrong}>{bullet.strong}</strong>
                {bullet.text}
              </li>
            ))}
          </ul>

          <h2>{content.everydayTitle}</h2>
          <p>{content.everydayText1}</p>
          <p>{content.everydayText2}</p>
        </div>

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
            . Consultă și{' '}
            <Link href="/resurse/glosar-dezinformare" className={styles.textLink}>
              Glosarul de dezinformare
            </Link>{' '}
            sau alte{' '}
            <Link href="/resurse" className={styles.textLink}>
              resurse educaționale
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
