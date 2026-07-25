import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { REPO_URL } from '@/components/layout/routes';
import shell from '../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Termeni și condiții',
  description:
    'Termenii și condițiile de utilizare a Verifact: ce este serviciul, limitele lui și cum e limitată răspunderea.',
};

export default function TermeniPage() {
  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Legal</p>
        <h1 className={shell.title}>Termeni și condiții</h1>
        <p className={shell.lead}>
          Ultima actualizare: 26 iulie 2026. Prin folosirea Verifact ești de
          acord cu termenii de mai jos.
        </p>
      </header>

      <div className={shell.body}>
        <div className={shell.prose}>
          <p>
            Verifact este operat de Sebi Iancu, persoană fizică, ca proiect
            open-source („Noi”, „Operatorul”). Acești termeni guvernează
            accesarea și folosirea aplicației web Verifact („Serviciul”).
            Dacă nu ești de acord cu ei, te rugăm să nu folosești Serviciul.
          </p>

          <h2>1. Ce este Serviciul</h2>
          <p>
            Verifact este un instrument care primește text, un link sau un
            screenshot și generează un raport automat despre veridicitatea
            afirmației, agregând surse din presă, baze de fact-checking, surse
            oficiale și rezultate de căutare, sintetizate cu ajutorul unui
            model AI.
          </p>
          <p>
            Contul este gratuit, cu o limită lunară de verificări. Planurile
            Pro și Business, afișate pe{' '}
            <Link href="/preturi" className={shell.textLink}>
              pagina de prețuri
            </Link>
            , cresc acea limită; activarea lor se face momentan prin contact
            direct, nu printr-un flux de plată automat în aplicație.
          </p>

          <h2>2. Vârstă minimă</h2>
          <p>
            Trebuie să ai cel puțin 16 ani pentru a-ți crea un cont gratuit și
            cel puțin 18 ani pentru a solicita un plan plătit, în linie cu
            legislația română privind consimțământul pentru serviciile
            societății informaționale.
          </p>

          <h2>3. Disclaimer — limitele algoritmului</h2>
          <p>
            <strong>Citește această secțiune cu atenție.</strong> Rapoartele
            Verifact au caracter exclusiv informativ. Ele sunt generate
            automat, printr-un algoritm și un model AI, din surse terțe, și{' '}
            <strong>nu constituie</strong> o decizie oficială, juridică sau
            jurnalistică definitivă și nici o recomandare juridică, medicală
            sau financiară.
          </p>
          <p>
            Algoritmul poate greși: poate eticheta o afirmație adevărată drept
            incertă sau falsă (fals pozitiv) sau una falsă drept adevărată
            (fals negativ). Nu garantăm exactitatea, completitudinea sau
            actualitatea rezultatelor. Tu ești responsabil pentru cum
            interpretezi și folosești un raport — verifică sursele citate
            înainte să tragi o concluzie.
          </p>
          <p>
            Metodologia exactă, inclusiv limitele ei cunoscute, este publică
            pe pagina{' '}
            <Link href="/transparenta" className={shell.textLink}>
              Transparență
            </Link>
            .
          </p>

          <h2>4. Reguli de utilizare</h2>
          <p>Nu poți folosi Serviciul pentru a:</p>
          <ul>
            <li>
              trimite conținut ilegal, defăimător, care incită la ură sau
              violență;
            </li>
            <li>
              încerca manipularea deliberată a algoritmului pentru a obține
              verdicte false, în scop de propagandă sau dezinformare;
            </li>
            <li>
              ocoli limitele de rată, măsurile de securitate sau restricțiile
              contului tău;
            </li>
            <li>
              ataca infrastructura (scraping abuziv, inginerie inversă,
              încercări de acces neautorizat).
            </li>
          </ul>

          <h2>5. Cod deschis și conținutul tău</h2>
          <p>
            Codul sursă este publicat sub licența MIT (Copyright (c) 2026
            Sebi Iancu) în{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={shell.textLink}>
              repository-ul oficial
            </a>
            . Licența acoperă codul, nu numele „Verifact”, infrastructura sau
            baza de date pe care o operăm noi.
          </p>
          <p>
            Păstrezi drepturile asupra textului pe care îl trimiți spre
            verificare. Prin trimiterea lui, ne dai voie să îl procesăm — și
            să îl transmitem furnizorilor terți enumerați în{' '}
            <Link href="/confidentialitate" className={shell.textLink}>
              Politica de confidențialitate
            </Link>{' '}
            — strict ca să generăm raportul cerut. Dacă alegi explicit să
            publici un raport, ne dai voie să îl afișăm, anonimizat, în
            secțiunea publică.
          </p>
          <p>
            Dacă încarci un screenshot al conținutului altcuiva, garantezi că
            o faci în scop de verificare personală — o folosire care se
            încadrează în limitele dreptului la citat prevăzute de Legea nr.
            8/1996. Imaginea este folosită doar pentru a extrage textul (OCR)
            și nu este păstrată după aceea.
          </p>

          <h2>6. Corectarea unui raport</h2>
          <p>
            Verifact nu are un mecanism formal de contestare — vezi
            disclaimerul de la punctul 3. Dacă găsești o eroare factuală
            într-un raport, poți deschide un{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={shell.textLink}>
              issue pe GitHub
            </a>{' '}
            sau ne poți scrie la adresa din secțiunea Contact. Citim fiecare
            mesaj, dar nu promitem un termen de răspuns sau eliminarea automată
            a unui raport.
          </p>

          <h2>7. Limitarea răspunderii</h2>
          <p>
            În limita permisă de lege, nu răspundem pentru daune indirecte,
            incidentale sau de consecință (pierderi de profit, de date sau de
            reputație) rezultate din folosirea Serviciului, din erori ale
            rapoartelor generate automat sau din deciziile pe care le iei pe
            baza lor. Răspunderea noastră totală față de tine, pentru orice
            pretenție legată de acești termeni, este limitată la suma plătită
            de tine în ultimele 12 luni, sau 100 RON, oricare e mai mare.
          </p>

          <h2>8. Contul tău</h2>
          <p>
            Poți renunța la Serviciu oricând. Dreptul tău de a-ți șterge
            definitiv contul și datele asociate e descris în{' '}
            <Link href="/confidentialitate" className={shell.textLink}>
              Politica de confidențialitate
            </Link>
            . Ne rezervăm dreptul de a suspenda un cont care încalcă repetat
            secțiunea 4.
          </p>

          <h2>9. Modificări</h2>
          <p>
            Putem modifica acești termeni; data de mai sus arată ultima
            actualizare. Continuarea folosirii Serviciului după o modificare
            înseamnă că ești de acord cu noua versiune.
          </p>

          <h2>10. Legea aplicabilă</h2>
          <p>
            Acești termeni sunt guvernați de legea română. Orice litigiu se
            supune instanțelor competente din România.
          </p>

          <h2>11. Contact</h2>
          <p>
            Pentru întrebări despre acești termeni, scrie la{' '}
            <a href="mailto:sebi.iancu23@gmail.com" className={shell.textLink}>
              sebi.iancu23@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
