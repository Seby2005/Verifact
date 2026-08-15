# 🎭 Ghidul Maestru Faceless & Design System (Gen, știri & Politică la minut) — Verifact

> **Aplicație**: Verifact (AI Fact-Checker Web App)  
> **Principiu de Bază**: **100% Faceless (Zero apariție video sau înregistrare vocală personală)**  
> **Inspirație Editorială**: **Gen, știri** & **Politică la minut**  
> **Design System**: Strict aliniat la tokenii din `src/app/globals.css` și `DESIGN.md`  

---

## 1. De ce Funcționează Formatul Gen, știri & Politică la minut pentru Verifact?

În spațiul digital românesc, formatele create de **Gen, știri** și **Politică la minut** au demonstrat cel mai mare nivel de engagement și retenție pe Instagram și TikTok deoarece:

1. **Claritate Radicală**: Elimină zgomotul de fundal și sintetizează subiecte complexe în câteva slide-uri clare.
2. **Ierarhie Vizuală Puternică**: Oricine scanează doar titlul și cuvintele cheie înțelege subiectul în 3 secunde. Dacă citește detaliile, înțelege nuanțele și dovezile.
3. **Credibilitate & Neutralitate**: Fără fețe de influenceri sau dramatism fals; conținutul este prezentat ca o fișă de lucru obiectivă, bazată pe date.

---

## 2. Anatomia Vizuală a unui Slide Verifact (Stil Politică la minut)

Fiecare slide generat respectă următoarea structură geometrică și tipografică:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ [ CATEGORIE • DOMENIU ]                          [Verifact]            │ ◄── Top Bar (Mono Eyebrow + Logo)
 ├────────────────────────────────────────────────────────────────────────┤
 │                                                                        │
 │ [ 1. CE AFIRMĂ ZVONUL VIRAL ]                                          │ ◄── Section Eyebrow (Red Accent)
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ TITLU MARE BOLD / AFIRMAȚIE CHEIE                                │  │ ◄── Headline (Inter Bold)
 │  └──────────────────────────────────────────────────────────────────┘  │
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ ▌ Evidențiere Accent: „Cuvintele cheie scoase din context”       │  │ ◄── Highlight Box (Red Border)
 │  └──────────────────────────────────────────────────────────────────┘  │
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ 01. Card Numerotat Informație 1                                  │  │
 │  │ 02. Card Numerotat Informație 2                                  │  │ ◄── Structured Content Blocks
 │  │ 03. Card Numerotat Informație 3                                  │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 │                                                                        │
 ├────────────────────────────────────────────────────────────────────────┤
 │ ● ● ○ ○ ○  2/5                                             verifact.ro │ ◄── Bottom Bar (Progress + URL)
 └────────────────────────────────────────────────────────────────────────┘
```

### Specificațiile Exacte ale Elementelor:
1. **Top Header Bar**:
   - *Stânga*: Punct roșu (`#e0563f`) + Categorie (ex: `POLITICĂ & ECONOMIE`, `SĂNĂTATE`, `DEZINFORMARE`) scrisă cu fontul `JetBrains Mono`, majuscule, tracking larg (`0.08em`), culoare `#9a9184`.
   - *Dreapta*: Logo-ul `[Verifact]` cu paranteze drepte roșii (`#d63a2c`) și text alb/crem (`#f3efe8`), setat în fontul clasic `Boska / Georgia Serif`.
2. **Main Headline**:
   - Font `Inter / Hanken Grotesk`, greutate 800 (ExtraBold), dimensiune 48px - 56px, line-height 1.12, culoare alb imaculat (`#ffffff`).
3. **Casetă de Evidențiere (Highlight Box)**:
   - Fundal translucid roșu `rgba(224, 86, 63, 0.12)`, bordură stânga de 4px solidă `#e0563f`, colțuri rotunjite dreapta de 12px.
4. **Panoul de Verdict Verifact (Slide-ul 3)**:
   - Scor uriaș în cifre mono (ex: `12%`), culoare roșu aprins `#e0563f` (pentru Fals) sau verde `#2f7d5b` (pentru Adevărat), alături de eticheta `PROBABIL FALS` și lista surselor guvernamentale / fact-check verificate.
5. **Carduri Numerotate (Slide-ul 4 - Stil Politică la minut)**:
   - Casete cu fundal dark surface (`#201b16`), bordură fină (`#3c372e`), badge numerotat (`01`, `02`, `03`) în colț, titlu alb bold și text secundar cald (`#cbc2b5`).
6. **Bottom Bar**:
   - Puncte de progres interactive (`● ● ● ○ ○ 3/5`) și adresa web minimalistă `verifact.ro` în font mono roșu.

---

## 3. Stiva de Instrumente 100% Faceless

| Instrument | Rol în Sistem | Cost |
| :--- | :--- | :--- |
| **`generate_social_slides.mjs`** | Randează automat slide-urile în format 1080x1350 (Instagram) și 1080x1920 (TikTok) | **100% Gratuit** (Playwright) |
| **OmniRoute / LiteLLM Gateway** | Generează textul caruselurilor și analizează instant orice fake news nou | **Open-Source / Self-Hosted** |
| **Edge-TTS (`ro-RO-AlinaNeural`)** | Generează fișiere audio `.mp3` cu voce clară și neutră în limba română | **100% Gratuit** (Microsoft Edge TTS) |
| **CapCut Desktop** | Asamblează videoclipurile split-screen (Sus: fake news / Jos: Verifact UI) + subtitrări | **100% Gratuit** |
| **OBS Studio / Phone Recorder** | Înregistrează 15 secunde din ecranul mobil al Verifact.ro | **100% Gratuit** |

---

## 4. Fluxul Operațional de Producție (15 Minute per Postare)

### Pasul 1: Identificarea Zvonului Viral (2 min)
Găsești o postare sau un mesaj alarmist pe WhatsApp, Facebook, TikTok sau presă (ex: taxe noi, leacuri miraculoase, declarații trucate).

### Pasul 2: Scanarea în Verifact & OmniRoute (2 min)
Introduci textul sau imaginea pe `verifact.ro` și obții:
- Scorul procentual (ex: `12%`).
- Sursele primare (ex: `mfinante.gov.ro`, `Factual.ro`).
- Explicația sintetică a falsului.

### Pasul 3: Generarea Automată a Slide-urilor (3 min)
Deschizi terminalul și rulezi scriptul:
```bash
node scripts/marketing/generate_social_slides.mjs
```
Scriptul scoate automat imaginile în folderul `public/marketing/genstiri_format/`:
- `instagram_1080x1350/` (5 slide-uri gata pentru Instagram Carousel).
- `tiktok_1080x1920/` (5 slide-uri gata pentru TikTok Photo Slideshow).

### Pasul 4 (Opțional): Asamblarea Video-ului Split-Screen (5 min)
Dacă vrei și format Video pentru Reels/TikTok:
1. Pui screenshot-ul suspect în jumătatea superioară a ecranului.
2. Pui screen-recording-ul cu Verifact în jumătatea inferioară.
3. Generezi vocea cu comanda Edge-TTS:
   ```bash
   edge-tts --voice ro-RO-AlinaNeural --text "Textul din scriptul video" --write-media voice.mp3
   ```
4. Aplici Auto-Captions în CapCut.

### Pasul 5: Publicare și Distribuție (3 min)
- **Instagram**: Încarci caruselul 4:5 cu descrierea din fișierul de scripturi.
- **TikTok**: Încarci fotografiile ca Photo Slideshow, adaugi un sound în trend și bifezi descrierea.
- **Facebook**: Încarci caruselul pe pagina oficială și distribui în 2-3 grupuri locale relevante.
