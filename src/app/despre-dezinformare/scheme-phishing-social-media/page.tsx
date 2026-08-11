import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import shell from '../../page-shell.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Cum Recunoști Escrocheriile și Phishing-ul pe Social Media — Verifact',
  description:
    'Ghid practic împotriva ciber-escrocheriilor de pe Facebook, WhatsApp și TikTok. Învață să identifici ofertele financiare false, mesajele capcană și furtul de identitate.',
  alternates: {
    canonical: 'https://verifact.ro/despre-dezinformare/scheme-phishing-social-media',
  },
  openGraph: {
    title: 'Cum Recunoști Escrocheriile și Phishing-ul pe Social Media — Verifact',
    description:
      'Învață să identifici mesajele capcană, ofertele de investiții false și reclamele înșelătoare.',
    url: 'https://verifact.ro/despre-dezinformare/scheme-phishing-social-media',
    siteName: 'Verifact',
    locale: 'ro_RO',
    type: 'article',
  },
};

export default function PhishingGuidePage() {
  return (
    <div className={`container ${styles.guidePage}`}>
      <header className={styles.guideHeader}>
        <span className={styles.categoryTag}>Ghid Educațional</span>
        <h1 className={styles.guideTitle}>Cum recunoști escrocheriile și phishing-ul pe rețelele sociale</h1>
        <p className={styles.guideLead}>
          De la reclame false cu oportunități miraculoase de investiții până la mesaje de la prieteni ale căror conturi au fost sparte, escrocheriile digitale devin tot mai convingătoare.
        </p>
      </header>

      <div className={styles.guideBody}>
        <Callout label="Regula de aur">
          Dacă o ofertă pare prea bună ca să fie adevărată, 99.9% este o escrocherie. Nicio instituție financiară sau companie serioasă nu îți va cere date bancare, codul PIN sau parole prin mesagerie privată.
        </Callout>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>1. Reclame financiare cu figuri publice cunoscute</h2>
          <p className={styles.paragraph}>
            Una dintre cele mai răspândite scheme din România folosește clipuri video modificate prin AI sau poze ale unor televiziuni populare, pretinzând că personalități sau companii naționale îți garantează câștiguri uriașe din criptomonede ori acțiuni. Verifică întotdeauna adresa web (URL-ul) unde trimite reclama!
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>2. Mesaje urgente de la cunoscuți: „Ajută-mă cu un împrumut”</h2>
          <p className={styles.paragraph}>
            Atunci când un prieten sau o rudă îți trimite brusc un mesaj neobișnuit pe WhatsApp sau Facebook cerându-ți bani sau introducerea unui cod primit pe SMS, oprește-te. Sună persoana respectivă direct pe numărul ei de telefon înainte de a face orice transfer.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>3. Link-uri scurte și domenii clonate</h2>
          <p className={styles.paragraph}>
            Escrocii creează pagini web care imită perfect site-urile oficiale de bancă sau de poștă, cerându-ți să „verifici coletul” sau să „actualizezi datele”. Uită-te atent la bara de adrese: dacă domeniul nu este exact cel oficial (de ex. are litere modificate sau extensii suspecte), închide imediat pagina.
          </p>
        </section>

        <div className={shell.sectionRule}>
          <Link href="/despre-dezinformare" className={styles.backLink}>
            ← Înapoi la Ghidul despre dezinformare
          </Link>
        </div>
      </div>
    </div>
  );
}
