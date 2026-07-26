# Analiză Economică Extinsă, Costuri Operaționale și Ghid de Optimizare — Verifact

> **Versiune:** 1.0  
> **Data:** 26 Iulie 2026  
> **Aplicație:** Verifact (AI Fact-Checker Web App)  
> **Autor:** Antigravity AI  

---

## 📑 Cuprins

1. [Rezumat Executiv](#1-rezumat-executiv)
2. [Structura Costurilor Fixe și Recurente](#2-structura-costurilor-fixe-și-recurente)
3. [Analiza Detaliată a Costurilor Variabile (Unit Economics per Verificare)](#3-analiza-detaliată-a-costurilor-variabile-unit-economics-per-verificare)
4. [Tranziția de la Gemini API la DeepSeek (V3 vs R1)](#4-tranzitia-de-la-gemini-api-la-deepseek-v3-vs-r1)
5. [Profitabilitate și Marje pe Tier-uri de Abonament](#5-profitabilitate-și-marje-pe-tier-uri-de-abonament)
6. [Ghid de Optimizare Folosind Resursele din Free-For.Dev](#6-ghid-de-optimizare-folosind-resursele-din-free-fordev)
7. [Concluzii și Plan de Acțiune](#7-concluzii-și-plan-de-acțiune)

---

## 1. Rezumat Executiv

Aplicația **Verifact** este concepută cu o arhitectură serverless extrem de eficientă din punct de vedere al costurilor (*cost-effective*). Datorită utilizării intensive a nivelurilor gratuite (*Free Tiers*) ale furnizorilor de infrastructură modernă (Vercel, Supabase, Google AI Studio, Tavily, Resend), aplicația poate funcționa cu **costuri operaționale aproape ZERO** în faza inițială (până la ~1,000 verificări/lună).

La scală comercială, costul variabil mediu al unei verificări complete este de aproximativ **$0.011 - $0.017 (~0.05 - 0.08 RON)**. Marja brută a abonamentelor plătite (Pro la €7.99/lună și Business la €49/lună) este de peste **60% - 75%**, ceea ce oferă o profitabilitate excelentă chiar și la un număr redus de utilizatori plătitori (5 abonați Pro acoperă integral toate costurile de dezvoltare și infrastructură).

---

## 2. Structura Costurilor Fixe și Recurente

Costurile fixe reprezintă cheltuielile lunare sau anuale care apar independent de volumul de traficul sau numărul de verificări efectuate pe platformă.

### A. Unelete de Dezvoltare & Abonamente AI
| Serviciu / Unealtă | Utilitate în proiect | Cost estimat | Monedă |
|---|---|---|---|
| **Claude Pro / Anthropic** | Asistență la dezvoltare, scriere cod, debugging | $20.00 / lună + TVA (~$23.80) | ~$24 / lună (~110 RON) |
| **Domeniu Web (`.ro` / `.com`)** | Identitate web (ex. `verifact.ro` sau `verifact.app`) | €10.00 - €12.00 / an | ~$1.10 / lună (~5 RON) |
| **Total Cost Fix de Dezvoltare & Regie**: | | | **~$25.10 / lună (~115 RON)** |

### B. Infrastructură Web și Baze de Date (La Lansare)
* **Vercel (Hosting Next.js)**: **$0.00 / lună** (Tier-ul Hobby include 100 GB latime de bandă, SSL automat, 100.000 cereri Serverless/lună). Planul Pro ($20/lună) este necesar doar dacă se depășește limita sau dacă se lucrează în echipă.
* **Supabase (PostgreSQL + Auth + Storage)**: **$0.00 / lună** (Tier-ul Free include 500 MB bază de date, 50.000 utilizatori activi lunar - MAU, 1 GB stocare fișiere și 500.000 invocări Edge Functions). Planul Pro ($25/lună) devine util la >500 MB date stocate.

---

## 3. Analiza Detaliată a Costurilor Variabile (Unit Economics per Verificare)

O verificare de conținut în Verifact execută parțial sau total următoarele etape:
1. **OCR (pentru screenshot-uri)**: Google Cloud Vision API.
2. **Layer 1**: Google Fact Check Tools API.
3. **Layer 2 & 4**: Tavily Search API (știri și rețele sociale).
4. **Layer 3**: Google Custom Search API (domenii oficiale `.gov.ro`, `.europa.eu`).
5. **Analiză LLM**: 2 apeluri de modele generative (Evaluare JSON + Sinteză text).

### A. Defalcarea Costurilor pe API-uri Indivduale

| Componentă API | Furnizor | Gratuite per lună | Cost peste limita gratuită | Cost / Verificare |
|---|---|---|---|---|
| **OCR Imagine** | Google Cloud Vision API | 1,000 imagini / lună | $1.50 / 1,000 cereri | **$0.0015** (doar la imagini) |
| **Layer 1 (Fact Check)** | Google Fact Check API | Nelimitat / Gratuit | $0.00 | **$0.0000** |
| **Layer 3 (Căutare Oficială)** | Google Custom Search | 100 interogări / zi (~3,000/lună) | $5.00 / 1,000 interogări | **$0.0050** |
| **Layer 2 & 4 (Web/Social)** | Tavily Search API (2 apeluri) | 1,000 credite / lună | $20.00 / 4,000 credite ($0.005/credit) | **$0.0100** |
| **Analiză LLM (2 apeluri)** | Gemini 2.0 Flash / DeepSeek | Gemini: 1,500 cereri/zi gratuit | DeepSeek V3: $0.14/1M input, $0.28/1M output | **$0.0008** |

### B. Scenarii de Cost Variabil per Verificare

```
1. SCENARIU TEXT/URL (În limitele gratuității):
   Cost: $0.00 OCR + $0.00 Search + $0.00 LLM = 0.0000 USD / verificare

2. SCENARIU TEXT/URL (Peste limitele gratuității, cu DeepSeek-V3 / Gemini plătit):
   - Search Tavily (2 interogări): $0.0100
   - Google Search Official:       $0.0050
   - DeepSeek-V3 (4k in / 1k out): $0.0008
   TOTAL = $0.0158 per verificare (~0.07 RON)

3. SCENARIU SCREENSHOT COMPLETE (Peste limitele gratuității):
   - Google Vision OCR:            $0.0015
   - Search Tavily (2 interogări): $0.0100
   - Google Search Official:       $0.0050
   - DeepSeek-V3:                  $0.0008
   TOTAL = $0.0173 per verificare (~0.08 RON)
```

> 💡 **Efectul Caching-ului (SHA-256 Content Hash)**:
> Tabela `cached_results` salvează verificările comune timp de 7 zile. La o rată estimată de **30% interogări repetate** (știri virale), costul variabil mediu scade de la **$0.0173** la **~$0.0121 / verificare**.

---

## 4. Tranziția de la Gemini API la DeepSeek (V3 vs R1)

Trecerea de pe API-ul Google Gemini pe DeepSeek este fezabilă din punct de vedere tehnic și aduce avantaje majore de calitate pe limba română și de stabilitate a instrucțiunilor din prompt-uri.

### A. Comparativ Tehnic și Financiar LLM

| Criteriu | Google Gemini 2.0 Flash | DeepSeek-V3 (`deepseek-chat`) | DeepSeek-R1 (`deepseek-reasoner`) |
|---|---|---|---|
| **Preț Input / 1M tokeni** | $0.10 | $0.14 (Cache hit: $0.014) | $0.55 |
| **Preț Output / 1M tokeni** | $0.40 | $0.28 | $2.19 |
| **Cost mediu / Verificare** | **~$0.0008** | **~$0.0008** | **~$0.0087** (de 10x mai scump) |
| **Tier Gratuit** | 1,500 cereri/zi (750 verif/zi) | Fără free tier (Pay-as-you-go) | Fără free tier (Pay-as-you-go) |
| **Calitate Limba Română** | Foarte Bună | **Excelentă (Superioară)** | Foarte Bună (Excesiv de lungă) |
| **Formatare JSON Strictă** | Nativă | **Nativă și foarte robustă** | Rich text + reasoning chain |
| **Latență medie** | ~1 - 2 secunde | ~1.5 - 2.5 secunde | ~6 - 15 secunde (Reasoning) |

👉 **Recomandare Fermă**:
1. Folosiți **DeepSeek-V3** (`deepseek-chat`) ca motor principal LLM. Are un cost aproape identic cu Gemini 2.0 Flash (~$0.0008 per verificare), dar o înțelegere mai nuanțată a limbii române și a falsurilor mediatice.
2. Evitați folosirea DeepSeek-R1 pentru fiecare verificare de rutină, deoarece costul crește de 10 ori (din cauza tokenilor de raționament generați) și aduce o latență de 10-15 secunde.
3. Păstrați Gemini 2.0 Flash ca **fallback secundar gratuit** în caz de indisponibilitate DeepSeek.

### B. Ghid de Implementare Tehnică DeepSeek
API-ul DeepSeek este 100% compatibil cu standardul OpenAI API (`https://api.deepseek.com/v1`).

Se creează un modul nou `src/lib/ai/deepseek.ts`:
```typescript
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function generateDeepSeekCompletion(prompt: string, isJson = false) {
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat', // DeepSeek-V3
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: isJson ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## 5. Profitabilitate și Marje pe Tier-uri de Abonament

Pe baza modelului de prețuri stabilit în PRD (€7.99/lună Pro, €49/lună Business), calculăm marjele de profit brut per utilizator plătitor:

### Tabla Marjelor Financiare per Tier

| Tier Abonament | Preț Abonament / lună | Verificări Incluse | Cost Variabil Maxim (fără cache) | Cost Variabil Mediu (cu 30% cache) | Marjă Brută Lunar ($) | Marjă Brută (%) |
|---|---|---|---|---|---|---|
| **Free** | €0.00 ($0.00) | 10 verificări | $0.17 | $0.12 | **-$0.12** | Subvenționat |
| **Pro** | **€7.99 (~$8.70)** | 200 verificări | $3.40 | $2.42 | **+$6.28 / user** | **72.2%** |
| **Business** | **€49.00 (~$53.50)** | 2,000 verificări | $34.00 | $24.20 | **+$29.30 / user** | **54.8%** |

### Punctul de Echilibru (Break-Even Point)
Pentru a acoperi costurile fixe lunare de dezvoltare (Claude Pro $24 + Domeniu $1.10 = **~$25.10 / lună**):
* Sunt necesari doar **4 utilizatori Pro** ($6.28 marjă x 4 = $25.12)
* SAU **1 singur utilizator Business** ($29.30 marjă > $25.10)

---

## 6. Ghid de Optimizare Folosind Resursele din Free-For.Dev

Pagina [free-for.dev](https://free-for.dev/#/) oferă o listă completă de servicii cu nivel gratuit permanent. Iată selecția celor mai bune unelte pe care le putem integra în **Verifact** pentru a reduce costurile la **ZERO**:

### A. Modele AI & LLM Alternativ Gratuit (AI Services)
* **Groq Cloud (groq.com)**:
  * **Gratuit**: Oferă 14.400 cereri/zi pe modelele **Llama 3.3 70B** și **Llama 3.1 8B** la viteze uluitoare (~300 tokens/secundă).
  * *Aplicație*: Poate fi folosit ca nivel gratuit pentru utilizatorii Tier Free, fără a consuma credits pe DeepSeek!
* **OpenRouter.ai**:
  * Acces la variante gratuite ale diferitelor modele (inclusiv `deepseek/deepseek-r1:free` și `google/gemini-2.0-flash-lite:free`).
* **Google AI Studio (Gemini 2.0 Flash)**:
  * 1.500 cereri/zi gratuite. Păstrat ca fallback în arhitectură.

### B. Servicii OCR Alternativ (Gratuit)
* **OCR.space API**:
  * **Gratuit**: **25.000 de cereri OCR/lună** (față de doar 1.000 la Google Vision).
  * *Economie*: Înlocuirea Google Vision cu OCR.space reduce costul OCR de la $1.50/1k imagini la **0 USD**!
* **Tesseract.js (OCR Client-Side)**:
  * Rularea extragerii de text direct în browser-ul utilizatorului înainte de upload. Cost server: **0 USD**.

### C. Email Tranzacțional (Autentificare, Resetare Parolă, Dispute)
* **Resend (resend.com)**:
  * **Gratuit**: 3.000 e-mailuri / lună (100 e-mailuri / zi).
  * *Aplicație*: Trimiterea e-mailurilor de confirmare cont Supabase și a notificărilor pentru contestații/dispute.
* **Brevo (Sendinblue)**: 300 e-mailuri / zi gratuit.

### D. Monitoring, Logging & Error Tracking
* **Sentry.io**:
  * **Gratuit**: 5.000 erori / lună + 10.000 tranzacții de performanță.
  * *Aplicație*: Monitorizarea erorilor din API Routes și frontend în timp real.
* **UptimeRobot**:
  * **Gratuit**: 50 de monitoare de ping verificate la fiecare 5 minute.
  * *Aplicație*: Notificare instantanee pe telefon/email dacă site-ul sau API-ul Next.js pică.
* **Better Stack (Logtail)**: 1 GB de loguri per lună gratuit.

### E. Analiză Trafic (Analytics) Fără Banners de Cookie-uri
* **Cloudflare Web Analytics**:
  * **100% GRATUIT**, fără cookie-uri, respectă 100% GDPR. Nu necesită Cookie Consent Banner!
* **Umami Cloud**: 10.000 evenimente / lună gratuit.
* **PostHog**: 1.000.000 de evenimente / lună gratuit.

---

## 7. Concluzii și Plan de Acțiune

### Recomandări Finale:
1. **Adoptă DeepSeek-V3 (`deepseek-chat`)** ca furnizor principal LLM pentru verificări. Costul este infim (~$0.0008 per verificare), iar calitatea pe limba română este superioară.
2. **Integrează OCR.space sau Tesseract.js** în locul Google Cloud Vision pentru a obține 25.000 de procesări de imagini gratuite lunar.
3. **Folosește Resend & Sentry (Free Tiers)** pentru e-mailuri tranzacționale și monitorizarea erorilor fără niciun cost suplimentar.
4. **Activează Cloudflare Web Analytics** pentru analiză de trafic gratuită și conformă GDPR.

Cu această configurare optimizată, costurile fixe ale proiectului rămân fixe la **~$25/lună** (acoperite din primii 4 utilizatori Pro), iar costul variabil scade la sub **0.05 RON per verificare**!
