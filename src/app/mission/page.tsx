import React from 'react';
import Link from 'next/link';
import { createMetadata } from '@/lib/seo/metadata';
import styles from './page.module.css';

export const metadata = createMetadata({
  title: 'Misiunea noastră — de ce există Verifact',
  description:
    'De ce am construit Verifact: dezinformarea circulă mai repede decât dezmințirile, iar verificarea unei afirmații costă mai mult timp decât are cineva la dispoziție într-o conversație de grup.',
  path: '/mission',
});

export default function MissionPage() {
  return (
    <main className={styles.page}>
      <article className={styles.container}>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Misiune</p>
          <h1 className={styles.title}>
            O minciună ajunge la mii de oameni în cinci minute.
            <br />
            Dezmințirea ei durează o oră.
          </h1>
          <p className={styles.lead}>
            Verifact există ca să reducă distanța dintre cele două.
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.h2}>Problema nu e că oamenii sunt creduli</h2>
          <p className={styles.p}>
            E ușor să crezi că dezinformarea prinde pentru că oamenii nu gândesc
            destul. Din experiența mea, nu asta se întâmplă. Oamenii sunt
            sceptici — doar că scepticismul costă timp, iar timpul nu e
            distribuit egal.
          </p>
          <p className={styles.p}>
            Cineva scrie o postare falsă în două minute. Ca s-o verifici, îți
            trebuie o jumătate de oră: cauți sursa originală, verifici dacă
            citatul e real, te uiți dacă vreo instituție a comentat, compari cu
            ce scriu publicațiile serioase. Până termini, postarea a fost deja
            distribuită de patruzeci de ori.
          </p>
          <p className={styles.p}>
            <strong>Asta e asimetria.</strong> Producerea dezinformării e
            ieftină, combaterea ei e scumpă. Nu poți câștiga o cursă în care
            adversarul aleargă gratis, iar tu plătești fiecare pas. Singura
            soluție e să ieftinești verificarea.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Ce face concret Verifact</h2>
          <p className={styles.p}>
            Îi dai un screenshot, un text sau un link. Caută în aceleași locuri
            în care ai căuta și tu, dacă ai avea timp:
          </p>
          <ul className={styles.list}>
            <li>
              <strong>Verificări deja făcute de oameni</strong> — dacă un
              jurnalist a analizat deja afirmația, nu are rost s-o luăm de la
              zero.
            </li>
            <li>
              <strong>Presa acreditată</strong> — dacă o știre reală ar fi fost
              preluată de publicații serioase, absența lor spune ceva.
            </li>
            <li>
              <strong>Surse oficiale</strong> — ministere, instituții europene,
              OMS, ONU. Pentru cifre și declarații oficiale, sursa primară
              contează mai mult decât orice comentariu.
            </li>
            <li>
              <strong>Rețelele sociale</strong> — dacă un citat e atribuit unei
              persoane publice, verificăm dacă l-a spus într-adevăr.
            </li>
          </ul>
          <p className={styles.p}>
            Primești un verdict, un scor și — partea care contează cel mai mult
            — <strong>lista surselor pe care s-a bazat</strong>. Poți să verifici
            verificatorul.
          </p>
        </section>

        <section className={styles.sectionAccent}>
          <h2 className={styles.h2}>Regula după care e construit</h2>
          <p className={styles.p}>
            Un scor pe care nu-l poți audita e doar încă un lucru în care ți se
            cere să ai încredere. Dacă răspunsul la „de ce ar trebui să te cred?”
            este „pentru că sunt un algoritm”, atunci am înlocuit o problemă de
            încredere cu alta.
          </p>
          <p className={styles.p}>
            De aceea fiecare raport îți arată sursele. De aceea, când o sursă nu
            răspunde, scrie negru pe alb că nu a fost verificată — nu se preface
            că a fost. Și de aceea codul e public: poți citi exact cum se
            calculează scorul, cu ce ponderi și pe ce bază.
          </p>
          <p className={styles.p}>
            <strong>
              Un „nu știu” sincer e mai valoros decât un verdict fabricat.
            </strong>{' '}
            Când dovezile sunt insuficiente, Verifact spune „neclar”. Nu e un eșec
            al aplicației — e singurul răspuns onest.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Ce nu este Verifact</h2>
          <p className={styles.p}>
            La fel de important ca ce face e ce refuză să facă.
          </p>
          <ul className={styles.list}>
            <li>
              <strong>Nu e un arbitru al adevărului.</strong> E un instrument de
              căutare care îți strânge dovezile la un loc. Decizia rămâne a ta.
            </li>
            <li>
              <strong>Nu ia poziții politice.</strong> Verifică fapte, nu opinii.
              „Guvernul a alocat X lei” se poate verifica. „Guvernul a procedat
              greșit” nu — și nici nu încercăm.
            </li>
            <li>
              <strong>Nu înlocuiește jurnalismul.</strong> Se bazează pe munca
              jurnaliștilor și a instituțiilor. Dacă nimeni n-a investigat un
              subiect, Verifact n-are ce să găsească.
            </li>
            <li>
              <strong>Nu e infailibil.</strong> Sursele au și ele erori,
              căutarea automată ratează context, iar modelul lingvistic poate
              formula stângaci. De asta primești sursele — ca să poți verifica
              singur când ceva nu se leagă.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>De ce în română, întâi</h2>
          <p className={styles.p}>
            Majoritatea instrumentelor de fact-checking funcționează bine în
            engleză și prost în rest. Bazele de date internaționale de verificări
            au acoperire aproape inexistentă pentru limba română, iar asta se
            vede: o afirmație falsă în română poate circula luni întregi fără să
            existe nicăieri o dezmințire indexată.
          </p>
          <p className={styles.p}>
            Spațiul informațional românesc merită unelte construite pentru el,
            nu traduceri aproximative ale unora făcute pentru altcineva. De asta
            am început de aici. Engleza e suportată ca a doua limbă.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Povestea din spate</h2>
          <p className={styles.editorial}>
            [DE COMPLETAT DE SEBI: momentul concret care te-a făcut să începi
            proiectul. O situație reală — o postare virală din familie sau din
            grupul de prieteni, o știre falsă pe care ai văzut-o crezută de
            cineva apropiat, o experiență din facultate. Un paragraf, la
            persoana I. E cea mai citită parte a unei pagini de misiune și
            singura care nu poate fi dedusă din cod — de aceea nu am inventat-o.]
          </p>
          <p className={styles.editorial}>
            [DE COMPLETAT DE SEBI: cine ești și de ce tu. Câteva rânduri —
            student, dezvoltator, background. Nu e nevoie de CV, doar de context
            suficient cât cititorul să știe cine e în spatele proiectului.]
          </p>
          <p className={styles.editorial}>
            [DE COMPLETAT DE SEBI: unde vrei să ajungă proiectul în 2–3 ani.
            Rămâne un instrument gratuit pentru publicul larg? Devine
            infrastructură pentru redacții și profesori? Există un plan de
            sustenabilitate financiară? Aici e locul pentru viziune, nu pentru
            funcționalități.]
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Deschis, pe bune</h2>
          <p className={styles.p}>
            Codul e public sub licență MIT. Nu ca gest de marketing — un
            instrument care pretinde că-ți spune ce e adevărat și care nu poate
            fi inspectat își cere singur o încredere pe care n-a demonstrat-o.
          </p>
          <p className={styles.p}>
            Asta înseamnă și că problemele sunt publice. În repository există
            documente de audit care descriu ce nu funcționează încă bine, nu doar
            ce funcționează. Prefer să fiu criticat pentru limitări asumate
            decât crezut pe baza unor promisiuni nedocumentate.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/transparency" className={styles.primaryCta}>
              Cum funcționează algoritmul
            </Link>
            <a
              href="https://github.com/Seby2005/Verifact"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryCta}
            >
              Codul pe GitHub
            </a>
          </div>
        </section>

        <footer className={styles.closing}>
          <p className={styles.closingText}>
            Dacă ai ajuns până aici, probabil ți se pare și ție că merită
            încercat.
          </p>
          <Link href="/#verify-section" className={styles.primaryCta}>
            Verifică o afirmație
          </Link>
        </footer>

      </article>
    </main>
  );
}
