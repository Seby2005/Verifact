# Analiză Tehnică și Juridică de Conformitate — Aplicația Verifact

> **Avertisment / Disclaimer**: Acest document reprezintă o analiză tehnică și legală preliminară pregătită ca punct de plecare informat. Antigravity/AI nu este un cabinet de avocatură și nu oferă consultanță juridică formală. Acest raport trebuie revizuit și validat de către un avocat înainte de lansare.

---

## Introducere

Această analiză a fost realizată prin inspectarea directă a codului sursă, a schemei bazei de date (Supabase PostgreSQL), a rutelor API și a documentației tehnice ale aplicației **Verifact** (platformă open-source de fact-checking bazată pe AI). 

Scopul documentului este de a furniza proprietarului proiectului o imagine clară și directă asupra obligațiilor legale, golurilor actuale de conformitate (GDPR, Directiva ePrivacy, drepturi de autor, răspundere civilă) și deciziilor juridice care trebuie luate.

---

## 1. Ce date despre utilizatori se colectează efectiv

Pe baza examinării bazei de date (tabelele `profiles`, `verifications`, `disputes`) și a fișierelor din `src/lib/user/gdpr.ts`:

### A. Date de cont și profil
* **Date colectate**: Adresă de email, parolă (hash-uită în mod securizat prin Supabase Auth), nume de utilizator (`username`), preferință de limbă (`ro`/`en`), rol (`user`, `admin`, `moderator`) și nivel abonament (`free`, `pro`, `business`).
* **Autentificare OAuth terță**: Suport pentru autentificare prin Google și GitHub (unde se preiau id-ul unic și email-ul furnizate de provideri).
* **Metadate GDPR**: Timestamp-uri pentru solicitările de export de date (`gdpr_data_export_requested_at`) și cererile de ștergere a contului (`gdpr_deletion_requested_at`).

### B. Conținut trimis de utilizatori spre verificare
* **Tipuri de input**:
  1. **Text**: Pasaje de text, afirmații sau citate introduse direct.
  2. **URL-uri**: Link-uri către articole web din presă sau rețele sociale.
  3. **Screenshot-uri/Imagini**: Fișiere imagine (PNG, JPEG, WEBP) trimise pentru extragere de text.
* **Stocarea și procesarea imaginilor (Privacy by Design)**:
  * Imaginile încărcate sunt trimise în memorie sub formă de buffer base64 către Google Cloud Vision API pentru detectarea textului (OCR).
  * **Imaginea brută NU se stochează permanent** în Supabase Storage sau pe disc. Se păstrează exclusiv textul extras prin OCR (`input_text`).
* **Stocarea verificărilor**:
  * Rezultatele și textele verificate sunt salvate în tabela `verifications`.
  * Fiecare verificare are un indicator de vizibilitate `is_public` (implicit `false` / privat).
  * **Utilizare internă**: Datele verificate sunt stocate în tabela `cached_results` (pe bază de SHA-256 hash al conținutului) pentru a preveni interogările redundante către API-urile terțe și a reduce costurile.
  * **Antrenare modele AI**: Codul aplicativ Verifact **nu** folosește conținutul utilizatorilor pentru antrenarea unor modele AI proprii. Totuși, conținutul este transmis prin API către furnizor terț (Google Gemini), conform termenilor API comerciali ai Google.

### C. Drepturile GDPR deja implementate tehnic
* **Export de date (Portabilitate)**: Ruta API `GET /api/user/export` și modulul `src/lib/user/gdpr.ts` agregă profilul și istoricul complet într-un format JSON descărcabil (`verifact-gdpr-export-v1`).
* **Ștergerea contului ("Dreptul de a fi uitat")**: Ruta API `DELETE /api/user/delete` apelează funcția PostgreSQL `request_account_deletion`. Aceasta:
  1. Anonimizează verificările publice scrise de utilizator (setează `user_id = NULL`), păstrând raportul anonim în baza comunitară.
  2. Șterge definitiv verificările private, abonamentele și contul din `auth.users`.

---

## 2. Cookie-uri și Tehnologii de Tracking

### A. Auditul cookie-urilor din cod
* **Cookie-uri de sesiune (Strict Necesare)**: Aplicația folosește pachetul `@supabase/ssr` în `middleware.ts` și `src/lib/supabase/server.ts` pentru gestionarea sesiunii de autentificare JWT (tokens de acces și refresh).
* **Analytics și Publicitate**: În versiunea actuală a codului **nu există integrat niciun serviciu de analytics** (cum ar fi Google Analytics, Plausible, PostHog) și nicio tehnologie de remarketing/tracking publicitar.

### B. GOL DE CONFORMITATE SIGNALAT (Cookie Consent Banner)
* **Constatare**: Aplicația **nu conține un banner de consimțământ pentru cookie-uri** (Cookie Consent Banner).
* **Impact juridic**: Conform Directivei ePrivacy și ghidurilor EDPB/ANSPDCP:
  * Cookie-urile de sesiune Supabase sunt "strict necesare" pentru funcționarea serviciului și **nu** necesită consimțământ prealabil.
  * Totuși, Regulamentul GDPR impune **informarea transparentă** a utilizatorilor cu privire la existența acestor cookie-uri (lucru ce trebuie acoperit în Politica de Confidențialitate).
  * **Recomandare**: Dacă pe viitor se adaugă orice instrument de analiză a traficului (inclusiv Google Analytics sau Plausible), implementarea unui Cookie Consent Banner cu opțiuni clare de Accept/Refuz devine o obligație legală strictă.

---

## 3. Servicii Terțe și Subprocesatori de Date

În timpul procesării unei cereri de verificare, datele utilizatorului (text, imagini, căutări) ajung la următoarele servicii terțe:

| Subprocesator | Serviciu furnizat | Date transmise | Locație prelucrare |
|---|---|---|---|
| **Supabase Inc.** | Bază de date PostgreSQL, Auth, Edge Functions | Email, profil, parole hash-uite, texte verificate, rapoarte | UE / SUA |
| **Google Ireland Ltd / Google LLC** | Google Cloud Vision API | Imaginea base64 încărcată pentru OCR | UE / SUA |
| **Google Ireland Ltd / Google LLC** | Gemini 2.0 Flash API | Textul extras + contextul căutărilor pentru sinteza raportului | UE / SUA |
| **Google Ireland Ltd / Google LLC** | Google Fact Check Tools API & Custom Search API | Cuvinte cheie din afirmație pentru verificare în surse oficiale/baze de date | UE / SUA |
| **Tavily Inc.** | Tavily Search API | Cuvinte cheie pentru căutare articole de presă și rețele sociale | SUA |
| **Vercel Inc.** | Găzduire Next.js & Serverless API | Adresă IP, User-Agent, loguri de acces | UE / SUA |
| **NewsAPI.org** *(opțional)* | News Search API | Termeni de căutare din știri | SUA |
| **X Corp. (Twitter)** *(opțional)* | Twitter Bearer API | Termeni de căutare postări publice | SUA |

---

## 4. Jurisdicție și Întrebări Deschise pentru Proprietar

### A. Ce știm din cod
* **Licență**: Codul este publicat sub licența open-source **MIT** (Copyright (c) 2026 Sebi Iancu).
* **Piață țintă**: România (limba română este limba nativă a interfeței și a prompt-urilor), cu extindere la nivelul UE și internațional.

### B. Întrebări deschise obligatorii (marcate ca `[DE COMPLETAT]` în drafturi)
Pentru finalizarea documentelor legale, proprietarul proiectului trebuie să clarifice următoarele:

1. **Forma juridică a entității**: Proiectul este operat de o persoană fizică (Sebi Iancu), un PFA, o societate comercială (SRL) sau un ONG (Asociație/Fundație)?
2. **Datele de identificare oficiale**: Sediu social, Cod Unic de Înregistrare (CUI/CIF), număr de înregistrare la Registrul Comerțului / Registrul Asociațiilor.
3. **Adresa de contact oficială**: Care este adresa de e-mail dedicată pentru chestiuni de protecție a datelor și solicitări legale (ex. `legal@verifact.ro` sau `confidentialitate@verifact.ro`)?
4. **Instanța competentă**: În caz de litigiu, ce instanță judecătorească se desemnează (ex. instanțele din Municipiul București, România)?

---

## 5. Riscuri Specifice unui Produs Anti-Dezinformare și Mitigări

Aplicațiile de fact-checking prezintă riscuri juridice particulare, depășind riscurile standard ale unui SaaS comercial.

### A. Răspundere pentru verdicte greșite (Erori ale AI/Algoritmului)
* **Risc**: Algoritmul poate clasifica o știre reală drept "Probabil Falsă" (fals pozitiv) sau o dezinformare drept "Probabil Adevărată" (fals negativ).
* **Mitigare în Termeni**:
  * Clauză explicită de **Disclaimer**: Rapoartele Verifact au caracter exclusiv **informativ și educativ**. Niciun raport nu constituie o decizie oficială, expertiză juridică, act jurnalistic definitiv sau afirmație dogmatică.
  * Utilizatorul își asumă întreaga răspundere pentru deciziile luate pe baza raportului.

### B. Risc de Defăimare (Defamation / Calomnie)
* **Risc**: O persoană publică, o companie sau o publicație etichetată drept sursă de "dezinformare" poate da în judecată platforma pentru prejudicii de reputație.
* **Mitigare tehnică & juridică**:
  * **Mecanismul de Dispute (deja existent în cod)**: Schema de bază de date include tabela `disputes`. Orice persoană afectată poate trimite un raport de contestare. În cod, dacă o verificare strânge 3 contestații, intrarea din cache este invalidată automat pentru revizuire.
  * **Procedură Notificare și Acțiune (Notice & Takedown)**: Termenii și Condițiile trebuie să prevadă un mecanism clar prin care persoanele vătămate pot solicita rectificarea sau eliminarea din feed-ul public a unui raport disputat.

### C. Drepturi de Autor și Conținut de la Terți
* **Risc**: Utilizatorii încarcă screenshot-uri din ziare, cărți, postări sau articole protejate de drepturi de autor.
* **Mitigare juridică**:
  * Declararea procesării sub excepția legală a **dreptului la citat, analizei critice și interesului public** (art. 35 din Legea 8/1996 privind dreptul de autor în România / Directiva UE privind Drepturile de Autor în Piața Unică Digitală).
  * Utilizatorul garantează că trimite materiale doar în scop de verificare personală și că nu încalcă drepturile terților.

### D. Vârsta Minimă de Utilizare
* **Risc**: Prelucrarea datelor minorilor fără consimțământul părinților.
* **Mitigare**: Fixarea unei vârste minime de **16 ani** pentru crearea unui cont gratuit (în conformitate cu art. 8 GDPR și legislația română privind consimțământul privind serviciile societății informaționale) și **18 ani** pentru achiziționarea abonamentelor plătite.

---

## Concluzie și Pași Următori

1. **Proprietarul va completa datele specifice** `[DE COMPLETAT]` (entitate, CUI, email legal, instanță).
2. **Se vor publica pe site** documentele `Termeni și Condiții` și `Politică de Confidențialitate`.
3. **Se recomandă adăugarea unui Cookie Consent Banner** în caz de extindere a modulelor de analytics.
4. **Drafturile de mai jos vor fi supuse revizuirii finale de către un avocat autorizat.**
