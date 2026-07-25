import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import shell from '../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Politica de confidențialitate',
  description:
    'Ce date colectează Verifact, de ce, cui le trimite și cum îți poți exercita drepturile GDPR.',
};

export default function ConfidentialitatePage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Legal</p>
        <h1 className={shell.title}>Politica de confidențialitate</h1>
        <p className={shell.lead}>
          Ultima actualizare: 26 iulie 2026. Versiunea pe scurt e pe pagina{' '}
          <Link href="/open-source" className={shell.textLink}>
            Open source și confidențialitate
          </Link>
          . Aici e versiunea completă, conform GDPR.
        </p>
      </header>

      <div className={shell.body}>
        <div className={shell.prose}>
          <h2>1. Operatorul de date</h2>
          <p>
            Datele tale sunt operate de Sebi Iancu, persoană fizică,
            dezvoltatorul și administratorul proiectului Verifact. Pentru
            orice solicitare legată de datele tale, scrie la{' '}
            <a href="mailto:sebi.iancu23@gmail.com" className={shell.textLink}>
              sebi.iancu23@gmail.com
            </a>
            .
          </p>

          <h2>2. Ce date colectăm</h2>
          <h3>Cont</h3>
          <ul>
            <li>Adresă de email și parolă (stocată criptat de Supabase Auth, nu o vedem niciodată în clar).</li>
            <li>Un nume de utilizator opțional.</li>
            <li>Nivelul de plan (free / pro / business).</li>
          </ul>
          <h3>Conținut trimis spre verificare</h3>
          <ul>
            <li>Textul, linkul sau imaginea pe care le trimiți.</li>
            <li>
              Pentru screenshot-uri: imaginea e trimisă către Google Cloud
              Vision pentru extragerea textului (OCR) și nu este păstrată
              după aceea — reținem doar textul extras.
            </li>
            <li>
              Istoricul verificărilor tale (dacă ești autentificat): raportul
              generat, scorul, verdictul.
            </li>
          </ul>
          <h3>Date tehnice</h3>
          <ul>
            <li>
              Adresa IP, folosită temporar pentru limitarea numărului de
              cereri (rate limiting) și prevenirea abuzului.
            </li>
            <li>
              Statistici de trafic agregate prin Vercel Analytics — un
              serviciu fără cookie-uri, care nu identifică vizitatorii
              individual și nu urmărește pe niciun alt site.
            </li>
          </ul>
          <p>
            Nu colectăm date printr-un login social (Google/GitHub) — doar
            email și parolă.
          </p>

          <h2>3. De ce colectăm aceste date</h2>
          <ul>
            <li>
              <strong>Executarea contractului:</strong> ca să creăm și
              administrăm contul tău și să generăm raportul cerut.
            </li>
            <li>
              <strong>Consimțământul tău:</strong> ca să afișăm un raport
              public, dar numai dacă apeși explicit butonul de publicare.
            </li>
            <li>
              <strong>Interesul nostru legitim:</strong> pentru cache-uirea
              rezultatelor (ca să nu replătim aceleași apeluri API), pentru
              securitate și pentru statisticile de trafic agregate.
            </li>
          </ul>

          <h2>4. Cui trimitem datele</h2>
          <p>
            Ca să funcționeze verificarea, anumite date ajung la furnizori
            terți, strict pentru scopul descris:
          </p>
          <ul>
            <li><strong>Supabase</strong> — baza de date și autentificarea.</li>
            <li><strong>Google Cloud Vision</strong> — extragerea textului din screenshot-uri.</li>
            <li><strong>Google Gemini</strong> — sinteza raportului AI.</li>
            <li><strong>Google Fact Check Tools / Custom Search</strong> — căutarea în surse oficiale.</li>
            <li><strong>Tavily</strong> — căutarea de articole de presă pe web.</li>
            <li><strong>Vercel</strong> — găzduirea aplicației și statisticile de trafic agregate.</li>
          </ul>
          <p>
            Toți au sediul sau infrastructură inclusiv în SUA; transferurile
            se bazează pe Clauzele Contractuale Standard ale UE sau pe
            EU-US Data Privacy Framework. Niciunul nu primește mai multe date
            decât are nevoie ca să presteze serviciul respectiv — de exemplu,
            Tavily primește doar cuvintele cheie extrase din afirmație, nu
            contul tău.
          </p>

          <h2>5. Cât păstrăm datele</h2>
          <ul>
            <li>Datele de cont — cât timp ai un cont activ.</li>
            <li>Verificările private — până le ștergi tu sau îți ștergi contul.</li>
            <li>
              Verificările publicate — dacă îți ștergi contul, raportul
              rămâne în baza publică dar e anonimizat definitiv (legătura cu
              contul tău e eliminată la nivel de bază de date, nu doar
              ascunsă).
            </li>
          </ul>

          <h2>6. Ștergerea contului</h2>
          <p>
            Poți cere ștergerea definitivă a contului și a datelor asociate
            oricând, scriindu-ne la adresa de mai sus — ștergem imediat ce
            confirmăm identitatea solicitării. Rapoartele tale private se
            șterg definitiv; cele pe care le-ai publicat explicit rămân în
            baza publică, dar anonimizate. Lucrăm la un buton de auto-ștergere
            direct din cont, ca acest pas să nu mai necesite un email.
          </p>

          <h2>7. Drepturile tale GDPR</h2>
          <p>Ai dreptul să:</p>
          <ul>
            <li>afli ce date avem despre tine și să primești o copie;</li>
            <li>ceri corectarea datelor greșite;</li>
            <li>ceri ștergerea datelor tale (vezi punctul 6);</li>
            <li>te opui prelucrării bazate pe interes legitim;</li>
            <li>
              depui o plângere la Autoritatea Națională de Supraveghere a
              Prelucrării Datelor cu Caracter Personal (ANSPDCP) —{' '}
              <a href="https://www.dataprotection.ro" target="_blank" rel="noreferrer noopener" className={shell.textLink}>
                dataprotection.ro
              </a>
              .
            </li>
          </ul>
          <p>Pentru oricare dintre ele, scrie-ne — răspundem în maximum o lună.</p>

          <h2>8. Cookie-uri</h2>
          <p>
            Folosim un singur cookie de sesiune, strict necesar, care te ține
            autentificat (gestionat de Supabase). Nu necesită consimțământ,
            conform Directivei ePrivacy, fiindcă e indispensabil funcționării
            serviciului pe care îl ceri direct.
          </p>
          <p>
            Vercel Analytics nu folosește cookie-uri și nu construiește un
            profil al tău — de asta nu afișăm un banner de cookie-uri. Dacă
            adăugăm vreodată un instrument care ar necesita consimțământ, vom
            adăuga și bannerul corespunzător.
          </p>

          <h2>9. Securitate</h2>
          <ul>
            <li>Tot traficul este criptat prin HTTPS/TLS.</li>
            <li>Parolele sunt hash-uite de Supabase Auth, nu le vedem niciodată în clar.</li>
            <li>Row Level Security (RLS) în baza de date, ca fiecare utilizator să vadă doar ce e al lui.</li>
            <li>Imaginile trimise pentru OCR sunt procesate în memorie, niciodată salvate pe disc.</li>
          </ul>

          <h2>10. Modificări</h2>
          <p>
            Putem actualiza această politică; data de sus arată ultima
            revizuire. Dacă schimbăm ceva semnificativ, te anunțăm prin email
            sau printr-un mesaj vizibil în aplicație.
          </p>
        </div>
      </div>
    </div>
  );
}
