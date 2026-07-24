> **Draft generat cu asistență AI — necesită revizuire de către un avocat înainte de publicare.**

# Politică de Confidențialitate — Verifact

**Ultima actualizare:** [DE COMPLETAT — ex. 25 iulie 2026]

Această Politică de Confidențialitate descrie modul în care **[DE COMPLETAT — Denumire Entitate / Nume Proprietar, ex. Sebi Iancu / Verifact SRL / Asociația Verifact]**, cu sediul în [DE COMPLETAT — Adresă], CUI/CIF [DE COMPLETAT] („Noi”, „Operatorul” sau „Verifact”), colectează, utilizează, stochează și protejează datele cu caracter personal ale utilizatorilor („Dumneavoastră”) prin intermediul aplicației noastre web și al serviciilor conexe.

Respectăm confidențialitatea datelor dumneavoastră și ne angajăm să le prelucrăm în conformitate cu Regulamentul (UE) 2016/679 (Regulamentul General privind Protecția Datelor — **GDPR**) și legislația națională aplicabilă în România.

---

## 1. Operatorul de Date cu Caracter Personal

Operatorul datelor dumneavoastră cu caracter personal este:
* **Denumire entitate**: [DE COMPLETAT — ex. Sebi Iancu / Verifact SRL]
* **Adresă poștală**: [DE COMPLETAT — Adresă sediu]
* **CUI/CIF**: [DE COMPLETAT]
* **Email de contact pentru Protecția Datelor / DPO**: **[DE COMPLETAT — ex. privacy@verifact.ro / dpo@verifact.ro]**

---

## 2. Ce Date Colectăm și Cum le Obținem

Colectăm date cu caracter personal direct de la dumneavoastră atunci când creați un cont, utilizați serviciile noastre de verificare sau comunicați cu noi.

### A. Date de identificare și cont (furnizate direct)
* **Adresă de e-mail**: Necesară pentru autentificare, creare cont și comunicări administrative;
* **Nume de utilizator (`username`)**: Pentru identificarea profilului dumneavoastră în platformă;
* **Parolă**: Stocată exclusiv în formă criptată (hash-uită securizat) prin intermediul Supabase Auth;
* **Preferințe de limbă**: (`ro` sau `en`);
* **Autentificare socială (OAuth)**: Dacă alegeți să vă autentificați prin Google sau GitHub, primim de la acești furnizori ID-ul dumneavoastră unic și adresa de email.

### B. Date de conținut trimise spre verificare
* **Text introduse direct**: Pasaje de text, afirmații sau titluri trimise pentru verificare;
* **URL-uri**: Link-uri către articole de presă sau postări din rețelele sociale;
* **Screenshot-uri / Imagini încărcate**:
  * Imaginile sunt trimise în memorie către Google Cloud Vision API pentru detectarea și extragerea textului (OCR).
  * **Imaginea brută încărcată NU este salvată pe disk sau în bazele noastre de date.** Se stochează doar textul extras rezultant.

### C. Date tehnice și de utilizare (colectate automat)
* **Istoricul verificărilor**: Scorurile, verdictele, rapoartele generate și timpii de procesare;
* **Date tehnice de acces**: Adresa IP, tipul de browser (User-Agent), sistemul de operare și logurile de acces server (procesate de furnizorul de hosting Vercel și de baza de date Supabase în scop strict de securitate și prevenire a atacurilor).

---

## 3. Scopurile și Temeiurile Juridice ale Prelucrării

Conform art. 6 din GDPR, prelucrăm datele dumneavoastră pe baza următoarelor temeiuri juridice:

| Scopul prelucrării | Date utilizate | Temei juridic (GDPR) |
|---|---|---|
| Crearea și gestionarea contului de utilizator | Email, username, parolă hash-uită | **Executarea contractului** (Art. 6(1)(b)) |
| Generarea rapoartelor de verificare și rularea algoritmilor AI | Text extras, URL, interogări de căutare | **Executarea contractului** (Art. 6(1)(b)) |
| Gestionarea abonamentelor plătite (Pro / Business) | Date cont, istoricul tranzacțiilor | **Executarea contractului** (Art. 6(1)(b)) |
| Publicarea rapoartelor în feed-ul comunității | Rapoartele marcate explicit ca `is_public = true` | **Consimțământul utilizatorului** (Art. 6(1)(a)) |
| Caching-ul verificărilor și optimizarea performanței (evitarea apelurilor API redundante) | Hash-ul SHA-256 al conținutului anonimizat | **Interesul legitim** al Operatorului (Art. 6(1)(f)) |
| Securitatea platformei, prevenirea abuzurilor și rate-limiting | Loguri server, adresă IP | **Interesul legitim** / **Obligație legală** (Art. 6(1)(f)/(c)) |

---

## 4. Destinatari și Subprocesatori Terți

Pentru furnizarea serviciului, transmitem anumite date către furnizori terți de încredere (subprocesatori). Fiecare furnizor a fost selectat pentru a asigura măsuri adecvate de securitate a datelor:

| Subprocesator | Serviciu prestat | Date transmise | Locație prelucrare |
|---|---|---|---|
| **Supabase Inc.** | Bază de date PostgreSQL, Autentificare | Date cont, profil, istoricul verificărilor | UE / SUA (SCCs / DPF) |
| **Google Ireland Ltd / Google LLC** | Google Cloud Vision API (OCR) | Imaginea base64 încărcată pentru extragerea textului | UE / SUA (SCCs / DPF) |
| **Google Ireland Ltd / Google LLC** | Gemini 2.0 Flash API (AI) | Textul extras și contextul pentru sinteza raportului | UE / SUA (SCCs / DPF) |
| **Google Ireland Ltd / Google LLC** | Fact Check & Custom Search APIs | Cuvinte cheie din afirmație pentru verificare | UE / SUA (SCCs / DPF) |
| **Tavily Inc.** | Tavily Search API | Cuvinte cheie din afirmație pentru căutare web/presă | SUA (SCCs) |
| **Vercel Inc.** | Găzduire infrastructură și API Routes | Adresă IP, User-Agent, loguri de sistem | UE / SUA (SCCs / DPF) |

---

## 5. Durata de Păstrare a Datelor (Data Retention)

* **Datele de cont**: Păstrate pe întreaga durată de existență a contului dumneavoastră.
* **Verificările private (`is_public = false`)**: Păstrate în contul dumneavoastră până la ștergerea contului sau la solicitarea de ștergere individuală.
* **Verificările publice (`is_public = true`)**: Dacă alegeți să publicați un raport în feed-ul comunitar, la ștergerea contului dumneavoastră raportul va fi **anonimizat definitiv** (legătura cu ID-ul de utilizator `user_id` este eliminată și setată pe `NULL`), raportul rămânând în baza deschisă de fact-checking ca date anonime de interes public.
* **Logurile tehnice de securitate**: Păstrate pentru o perioadă de maxim 30-90 de zile, după care sunt rotite/șterse automat.

---

## 6. Drepturile Dumneavoastră conform GDPR

În calitate de persoană vizată, beneficiați de următoarele drepturi legale:

1. **Dreptul de Acces**: Aveți dreptul de a obține o confirmare dacă prelucrăm datele dumneavoastră și de a primi o copie a acestora.
2. **Dreptul la Portabilitate (Implementat Tehnic)**: Puteți descărca în orice moment un export JSON complet al profilului și al istoricului dumneavoastră direct din aplicație (format `verifact-gdpr-export-v1` furnizat prin ruta API `/api/user/export`).
3. **Dreptul la Ștergere („Dreptul de a fi Uitat”) (Implementat Tehnic)**: Puteți solicita ștergerea definitivă a contului direct din setările aplicației (ruta API `/api/user/delete`). Procesul execută o procedură automată în baza de date care anonimizează rapoartele publice și șterge definitiv verificările private, profilul și datele de autentificare.
4. **Dreptul la Rectificare**: Dreptul de a solicita corectarea datelor inexacte.
5. **Dreptul la Restricționarea Prelucrării și Opoziție**: Dreptul de a vă opune prelucrărilor bazate pe interes legitim.
6. **Dreptul de a Depune o Plângere**: Dreptul de a depune o plângere la autoritatea națională de supraveghere:
   * **Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)**
   * B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, cod poștal 010336, București, România
   * Website: [www.dataprotection.ro](https://www.dataprotection.ro) | Email: anspdcp@dataprotection.ro

---

## 7. Exercitarea Drepturilor

Pentru a vă exercita oricare dintre drepturile menționate mai sus (în afara opțiunilor automate din aplicație), ne puteți trimite o solicitare scrisă la adresa de e-mail: **[DE COMPLETAT — ex. privacy@verifact.ro]**. Vom răspunde solicitării dumneavoastră în termen de cel mult o lună de la primire, conform GDPR.

---

## 8. Politica de Cookie-uri și Tehnologii Similare

### A. Cookie-urile utilizate în prezent
Aplicația Verifact utilizează **exclusiv cookie-uri de sesiune strict necesare** gestionate prin pachetul `@supabase/ssr`:
* **Scop**: Păstrarea sesiunii de autentificare a utilizatorului conectat și securizarea cererilor API.
* **Consimțământ**: Conform Directivei ePrivacy, aceste cookie-uri nu necesită consimțământul prealabil al utilizatorului, fiind indispensabile pentru funcționarea serviciului solicitat direct de dumneavoastră.

### B. Absența cookie-urilor de profilare și marketing
Platforma **nu utilizează** cookie-uri de analiză a traficului (Google Analytics, Plausible etc.), cookie-uri publicitare sau tehnologii terțe de urmărire comportamentală.

În cazul în care pe viitor se vor introduce instrumente de analiză a traficului sau alte servicii non-esențiale, vom implementa un **Cookie Consent Banner** dedicat pentru a vă permite exprimarea sau retragerea consimțământului în mod liber.

---

## 9. Transferuri Internaționale de Date

Unele dintre serviciile terțe partenere (Google, Supabase, Tavily, Vercel) au sediul sau utilizează infrastructură în Statele Unite ale Americii. Transferurile de date către aceste entități se realizează pe baza:
* Deciziei privind adecvarea nivelului de protecție UE-SUA (**EU-US Data Privacy Framework**);
* Clauzelor Contractuale Standard (**SCCs**) aprobate de Comisia Europeană.

---

## 10. Securitatea Datelor

Aplicăm măsuri tehnice și organizatorice adecvate pentru protejarea datelor:
* Criptarea tuturor comunicațiilor prin protocoale HTTPS / TLS;
* Hash-uirea parolelor folosind algoritmi criptografici puternici furnizați de Supabase Auth;
* Izolarea accesului la date în baza de date prin politici stricte de securitate la nivel de rând (Row Level Security — **RLS**);
* Procesarea în memorie a imaginilor OCR fără stocare pe disk.

---

## 11. Modificări ale Politicii de Confidențialitate

Această Politică poate fi actualizată periodic. Versiunea revizuită va fi publicată pe site cu menționarea datei ultimei actualizări. În cazul unor modificări substanțiale, vă vom notifica prin e-mail sau printr-un aviz vizibil în aplicație.
