# Product Requirements Document (PRD)
# Aplicație Web Verifact

**Versiune:** 0.1 — Draft inițial  
**Data:** 2026-07-22  
**Status:** În lucru  
**Licență:** MIT (Open Source)

---

## 1. Viziune & Misiune

### 1.1 Misiunea produsului

> *"Oferim fiecărui cetățean acces instant la adevăr, prin inteligență artificială transparentă și surse verificabile."*

Trăim într-o epocă în care dezinformarea circulă mai rapid decât adevărul. O știre falsă ajunge la milioane de oameni în ore, în timp ce dezminținile apar zile mai târziu, dacă apar. Aplicația noastră rezolvă această problemă oferind verificare instantă, transparentă și accesibilă oricui — gratuit pentru uz personal.

### 1.2 Valorile core ale produsului

| Valoare | Descriere |
|---|---|
| **Transparență** | Algoritmul este open source. Orice persoană poate vedea CUM se face verificarea |
| **Corectitudine** | Nu luăm poziții politice. Verificăm fapte, nu opinii |
| **Accesibilitate** | Gratuit pentru utilizatorul de rând |
| **Responsabilitate** | Fiecare raport include surse verificabile, nu doar concluzii |
| **Confidențialitate** | Screenshot-urile utilizatorilor nu sunt stocate permanent |

### 1.3 Scopul versiunii 1.0 (MVP)

Construim un instrument funcțional care permite oricui să:
1. Uploadeze un screenshot sau să introducă text/URL
2. Primească un raport detaliat de verificare în sub 30 secunde
3. Vadă sursele care au stat la baza verificării
4. Partajeze raportul (dacă alege public)

---

## 2. Piața Țintă

### 2.1 Piața primară: România

**De ce România:**
- Dezinformarea este o problemă acută în spațiul digital românesc
- Lipsa unui instrument nativ, în limba română, de fact-checking automat
- Cultură digitală în creștere — 72% penetrare internet (INS 2024)
- Alegeri frecvente și climat politic polarizat = cerere mare pentru verificare
- Jurnalism independent în creștere (G4Media, PressOne, Recorder, etc.) — potențiali parteneri

**Piața secundară: Europa (UE)**
- Directive EU privind dezinformarea (DSA — Digital Services Act) creează cerere B2B
- Jurnaliști și fact-checkeri în toată Europa caută unelte AI
- Oportunitate de localizare: traducere interfață în 5-10 limbi europene (v2)

### 2.2 Segmente de utilizatori

#### Segmentul A — Cetățeanul curios (80% din utilizatori)
- **Profil:** 25-55 ani, activ pe social media, vede știri dubioase în feed
- **Problema:** Nu știe rapid dacă ce citește este adevărat
- **Soluție:** Upload screenshot → răspuns în 30 secunde
- **Frecvență utilizare:** 1-5 verificări/săptămână
- **Tier:** Free

#### Segmentul B — Jurnalistul/Fact-Checker-ul (10% utilizatori, 40% revenue)
- **Profil:** Jurnalist, blogger, cercetător media
- **Problema:** Verificarea manuală durează ore; are nevoie de surse citate
- **Soluție:** Raport detaliat cu surse citate, exportabil, API access
- **Frecvență utilizare:** 20-50 verificări/zi
- **Tier:** Pro / Business

#### Segmentul C — ONG-ul / Instituția (5% utilizatori, 40% revenue)
- **Profil:** ONG anti-dezinformare, partid politic, instituție publică, universitate
- **Problema:** Monitorizare sistematică dezinformare la scală
- **Soluție:** API, rapoarte bulk, dashboard de monitorizare
- **Frecvență utilizare:** Sute de verificări/zi
- **Tier:** Business / Enterprise

#### Segmentul D — Elevul / Studentul (5%)
- **Profil:** 16-25 ani, face research, verifică surse pentru eseuri
- **Problema:** Nu știe să distingă sursele credibile
- **Soluție:** Instrument educativ cu explicații clare
- **Tier:** Free (potențial discount educațional v2)

---

## 3. Funcționalități — MVP (v1.0)

### 3.1 Modul de Input — Cum primim conținutul de verificat

#### F1 — Upload Screenshot (PRIORITATE MAXIMĂ)
**Descriere:** Utilizatorul poate uploada un screenshot (JPEG, PNG, WEBP) de pe orice rețea socială (Facebook, Twitter/X, TikTok, Instagram, WhatsApp, Telegram) sau din orice sursă.

**Comportament detaliat:**
- Drag & drop sau click to upload
- Preview al imaginii uploadate înainte de procesare
- Extragere automată text din imagine (OCR) folosind Google Cloud Vision API
- Afișarea textului extras pentru confirmare/editare de către utilizator
- Suport pentru screenshot-uri în limba română și engleză
- Limită: maxim 10MB per imagine
- Screenshot-ul nu se stochează după procesare (privacy by design)

**Acceptance Criteria:**
- [x] Extrage text corect din screenshot-uri cu font minim 10px
- [x] Procesează imagine în sub 5 secunde
- [x] Afișează textul extras înainte de a trimite la verificare
- [x] Permite utilizatorului să corecteze textul extras dacă OCR greșește
- [x] Afișează mesaj de eroare clar dacă imaginea nu conține text

#### F2 — Input Text Direct
**Descriere:** Utilizatorul poate lipi text direct (titlu știre, afirmație, citat).

**Comportament detaliat:**
- Textarea cu placeholder: "Lipește textul pe care vrei să îl verifici..."
- Suport minim 50 caractere, maxim 2000 caractere (v1)
- Detectare automată limbă (RO/EN)
- Buton "Verifică" activ doar când textul are minim 10 caractere

#### F3 — Input URL
**Descriere:** Utilizatorul poate introduce URL-ul unui articol.

**Comportament detaliat:**
- Câmp URL cu validare format
- Scraping automat al titlului și conținutului articolului
- Afișarea titlului și sursei extrase pentru confirmare
- Suport pentru cele mai comune site-uri de știri românești și internaționale
- Fallback: dacă site-ul blochează scraping-ul, se verifică doar titlul/meta-descripția

---

### 3.2 Algoritmul de Verificare — Inima produsului

**Principiu:** Verificarea nu se bazează pe o singură sursă. Algoritmul caută în strat după strat, cu transparență completă pentru utilizator.

#### Stratul 1 — Căutare în baze de date de fact-checking existente
**Surse:** Google Fact Check Tools API (bază de date globală), IFCN (International Fact-Checking Network), Snopes, PolitiFact, AFP Fact Check, Factual (RO), StopFals.md  
**Scop:** Verifică dacă afirmația a mai fost verificată anterior de fact-checkeri umani  
**Output:** Lista de fact-check-uri similare cu verdictele lor (Adevărat/Fals/Parțial)

#### Stratul 2 — Căutare în știri convenționale
**Surse:** Google News API, Bing News API, site-uri majore de știri (Digi24, ProTV, G4Media, HotNews, Mediafax — RO; Reuters, BBC, AP — internațional)  
**Scop:** Verifică dacă știrea există în surse jurnalistice legitime și care este framing-ul  
**Output:** Articole similare cu link, titlu, sursă, dată publicare

#### Stratul 3 — Verificare surse guvernamentale și oficiale
**Surse:** Site-uri .gov.ro, .europa.eu, instituții publice relevante, OMS, ONU  
**Scop:** Verifică afirmații despre politici publice, statistici, declarații oficiale  
**Output:** Documente/comunicat-uri oficiale care confirmă sau infirmă afirmația

#### Stratul 4 — Verificare social media (declarații lideri/politicieni/ONG-uri)
**Surse:** Twitter/X API (declarații publice), pagini oficiale Facebook/Instagram verificate, canale YouTube oficiale  
**Scop:** Verifică dacă un lider politic, oficial sau ONG a făcut cu adevărat declarația respectivă  
**Output:** Link-uri la postările originale cu context temporal

#### Stratul 5 — Analiză AI (Gemini)
**Scop:** Sintetizează toate informațiile din straturile 1-4 și produce raportul final  
**Input:** Textul de verificat + toate rezultatele din straturile anterioare  
**Output:** Verdict + procentaj + explicație + surse citate

#### Calculul Scorului de Veridicitate
```
Scor Final = media ponderată a:
  - Consistența cu fact-check-uri existente (greutate: 35%)
  - Consistența cu știri convenționale legitime (greutate: 30%)
  - Confirmarea din surse oficiale (greutate: 25%)
  - Analiza contextuală AI (greutate: 10%)

Interpretare scor:
  85-100% → ✅ PROBABIL ADEVĂRAT
  60-84%  → ⚠️ PARȚIAL ADEVĂRAT / CONTEXT LIPSĂ
  40-59%  → 🟠 NECLAR / INSUFICIENT VERIFICAT
  0-39%   → ❌ PROBABIL FALS
```

---

### 3.3 Raportul de Verificare — Output pentru utilizator

#### F4 — Raport Detaliat

**Structura raportului:**

```
┌─────────────────────────────────────────────┐
│  VERDICT: ⚠️ PARȚIAL ADEVĂRAT              │
│  Scor de veridicitate: 67%                  │
│  Procesare: 12.3 secunde                    │
└─────────────────────────────────────────────┘

📝 AFIRMAȚIA VERIFICATĂ
"[textul afirmației]"

🔍 REZUMAT EXECUTIV (2-3 propoziții)
[Ce este adevărat, ce este fals, ce lipsește din context]

📊 DETALII PE STRATURI
├── Fact-check-uri anterioare: [rezultate]
├── Știri convenționale: [rezultate]
├── Surse oficiale: [rezultate]
└── Social media: [rezultate]

📚 SURSE
1. [Titlu] — [Publicație] — [Data] — [Link]
2. [Titlu] — [Publicație] — [Data] — [Link]
...

⚠️ DISCLAIMER
Acest raport este generat de AI și nu reprezintă o decizie
editorială finală. Consultați sursele citate pentru context complet.

🔗 PARTAJARE
[Buton: Copiază link] [Buton: Partajează public] [Buton: Descarcă PDF]
```

---

### 3.4 Sistem de Conturi și Autentificare

#### F5 — Înregistrare / Autentificare

**Metode de autentificare:**
- Email + parolă (standard)
- Google OAuth (recomandat — un click)
- GitHub OAuth (util pentru utilizatori tech)

**Tier-uri:**
| Tier | Preț | Verificări/lună | Features |
|---|---|---|---|
| **Free** | Gratuit | 10 | Raport standard, partajare publică |
| **Pro** | €7.99/lună | 200 | Raport detaliat + export PDF, API key personal |
| **Business** | €49/lună | 2000 | API acces, webhook, dashboard analytics |

#### F6 — Dashboard Utilizator

**Conținut dashboard:**
- Istoricul verificărilor (ultimele 30)
- Număr verificări rămase în luna curentă
- Verificările marcate ca favorite
- Link la documentația API (pentru Pro+)

---

### 3.5 Vizibilitate Rapoarte (Public / Privat)

#### F7 — Control vizibilitate

**Comportament:**
- La fiecare verificare, utilizatorul alege: **Public** sau **Privat**
- Default: **Privat** (pentru protecția datelor)
- Rapoartele publice sunt indexate și accesibile fără cont
- Rapoartele publice contribuie la o bază de date comunitară de fact-check-uri
- Utilizatorii free pot vedea rapoartele publice ale altor utilizatori

**Pagina de rapoarte publice:**
- Feed cu cele mai recente verificări publice
- Filtre: limbă, verdict (Adevărat/Fals/Parțial), dată, categorie
- Căutare în rapoarte existente (evită duplicatele)

---

### 3.6 Open Source & Transparență

#### F8 — Pagina de Transparență

**Conținut:**
- Explicație pas-cu-pas a algoritmului (în română și engleză)
- Link la GitHub repository (cod sursă complet)
- Lista API-urilor utilizate și rolul fiecăreia
- Statistici agregate (câte verificări au fost făcute, distribuția verdictelor)
- Cum să contribui (CONTRIBUTING.md)
- Raport de acuratețe (benchmark trimestrial)

---

## 4. Funcționalități — Out of Scope (v1, planificate v2)

- ❌ Extensie browser (v2)
- ❌ Aplicație mobilă nativă (v2)
- ❌ Monitoring automat (urmărire cuvinte cheie 24/7) (v2)
- ❌ Localizare alte limbi (v2)
- ❌ API public gratuit (v2 — în v1 API doar pentru Pro+)
- ❌ Integrare WhatsApp/Telegram bot (v2)
- ❌ Rapoarte bulk (v2)

---

## 5. Cerințe Non-Funcționale

### 5.1 Performanță
- Timp de răspuns mediu: **sub 20 secunde** per verificare
- Timp de răspuns maxim: **sub 45 secunde** (cu toate straturile)
- Disponibilitate: **99.5% uptime** (acceptabil pentru v1)
- Suport concurență: minim 50 utilizatori simultan (v1)

### 5.2 Securitate
- HTTPS obligatoriu (SSL certificate)
- Screenshot-urile nu se stochează după procesare (șterse după max 1 oră)
- Parolele hash-uite cu bcrypt (minimum rounds: 12)
- Rate limiting: max 10 requests/minut per IP (protecție against abuz)
- GDPR compliant: utilizatorii pot șterge contul și toate datele asociate

### 5.3 Accesibilitate
- Interfață responsive (mobile, tablet, desktop)
- Suport screen reader (ARIA labels)
- Contrast minim WCAG AA

### 5.4 SEO
- Server-side rendering (Next.js) pentru rapoartele publice
- Metadate Open Graph pentru sharing pe social media
- Schema markup pentru fact-check-uri (Google recunoaște și afișează în SERP)
- Sitemap automat pentru rapoartele publice

---

## 6. Metrici de Succes (KPIs)

### La 3 luni de la lansare
- 500 utilizatori înregistrați
- 2,000 verificări procesate
- 10 rapoarte publice cu minim 100 vizualizări fiecare

### La 6 luni
- 2,000 utilizatori înregistrați
- 50 utilizatori Pro (revenue: ~€400/lună)
- Acuratețe algoritm: minim 80% (benchmark față de Snopes/PolitiFact)

### La 12 luni
- 10,000 utilizatori înregistrați
- 200 Pro + 5 Business (revenue: ~€1,850/lună)
- Parteneriat cu cel puțin 1 publicație media românească
- Feature în cel puțin 1 articol de presă major

---

## 7. Riscuri și Mitigări

| Risc | Probabilitate | Impact | Mitigare |
|---|---|---|---|
| AI produce raport incorect (fals negativ/pozitiv) | Ridicat | Ridicat | Disclaimer clar + surse afișate + raportare erori |
| Costuri API Google/Gemini cresc | Mediu | Mediu | Caching agresiv, tier free limitat |
| Conținut defăimător raportat ca adevărat | Scăzut | Ridicat | Legal disclaimer + mecanism de contestare |
| Concurență (Snopes, AFP intră pe RO) | Scăzut | Mediu | Diferențiator: screenshot + română nativă + open source |
| Abuz (spam verificări false) | Mediu | Scăzut | Rate limiting + captcha + tier system |

---

## 8. Întrebări Deschise (de rezolvat înainte de implementare)

- [ ] Numele final al aplicației
- [ ] Cine face moderarea rapoartelor publice contestate? (mecanism uman sau pur AI)
- [ ] Politica pentru conținut politic sensibil (campanii electorale)
- [ ] Parteneriate media pentru credibilitate la lansare
