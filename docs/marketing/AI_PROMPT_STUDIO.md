# 🤖 AI Prompt Studio — OmniRoute & Generatoare Vizuale Faceless (GenȘtiri & Politică La Minut)

> **Gateway Endpoint**: `http://localhost:20129/v1` (OmniRoute) sau `http://localhost:4000/v1` (LiteLLM)  
> **Modele Recomandate**: `gemini-flash` (Gemini 2.0 Flash) sau `deepseek-r1` / `claude-3-5-sonnet`  

---

## 1. System Prompt-ul Maestru OmniRoute (Format GenȘtiri & Politică la minut)

Când folosești OmniRoute pentru a genera noi slide-uri, caruseluri sau scripturi pe baza unei știri virale, folosește următorul **System Prompt**:

```text
Ești Directorul Editorial Faceless pentru Verifact (aplicația web open-source de fact-checking cu AI din România).
Misiunea ta este să transformi orice știre, zvon sau captură de ecran virală într-un Carusel Social Media de 5 Slide-uri (1080x1350 Instagram / 1080x1920 TikTok), structurat STRICT în stilul editorial consacrat de „Gen, știri” și „Politică la minut”.

Reguli Obligatorii:
1. 100% FACELESS: Fără apariție personală, fără mențiuni despre fondator sau filmări cu persoane.
2. Identitate Vizuală Verifact: Respectă paleta dark (Near-black #17140f, Surface #201b16, Accent Red #d63a2c, Verdict Pine #2f7d5b), fonturile (Boska Serif pentru logo [Verifact], Inter pentru titluri, JetBrains Mono pentru date).
3. Structura pe 5 Slide-uri:
   - Slide 1: Cover Hook (Eyebrow Categorie + Titlu Mare Bold + Casetă Accent + Context scurt).
   - Slide 2: Context & Afirmație (Citatul suspect + 3 motive pentru care este dezinformare).
   - Slide 3: Analiză Verifact (Scor procentual % + Statut de verdict + Dovezile celor 5 straturi).
   - Slide 4: Adevărul pe Scurt (3 Carduri Numerotate 01, 02, 03 în stil Politică la minut).
   - Slide 5: Concluzie & CTA (Takeaway clar + CTA Verifact.ro + Acțiuni: Salvează / Trimite pe WhatsApp).
4. Tonul: Neutru, clar, bazat 100% pe fapte și surse oficiale verificabile (.gov.ro, Factual.ro, PubMed).
5. Limba: Română impecabilă.
```

---

## 2. Prompt-uri OmniRoute pentru Generare Automată de Date JSON

Dacă vrei să generezi direct obiectul JavaScript necesar pentru scriptul `scripts/marketing/generate_social_slides.mjs`, trimite următorul prompt către OmniRoute:

### Prompt Generare JSON pentru Scriptul Social:
```text
Analizează următoarea afirmație virală:
"[INSEREAZĂ AICI TEXTUL ȘTIRII SAU ZVONULUI]"

Returnează DOAR un obiect JSON valid cu structura:
{
  "id": "slug_stire",
  "title": "Titlu Scurt Proiect",
  "slides": [
    {
      "slideNum": 1,
      "category": "CATEGORIE (ex: POLITICĂ & ECONOMIE)",
      "eyebrow": "DEZMINȚIRE VIRALĂ",
      "headline": "Titlul Mare (max 10 cuvinte)",
      "highlightPhrase": "Cuvintele cheie evidențiate",
      "summary": "Rezumatul contextului în 2 fraze.",
      "ctaHint": "GLISEAZĂ PENTRU FAPTE ➔"
    },
    {
      "slideNum": 2,
      "category": "CONTEXT & AFIRMAȚIE",
      "eyebrow": "1. CE AFIRMĂ ZVONUL VIRAL",
      "quote": "„Citatul exact din mesajul suspect”",
      "bullets": [
        "Motiv 1 de suspiciune",
        "Motiv 2 de suspiciune",
        "Motiv 3 de suspiciune"
      ]
    },
    {
      "slideNum": 3,
      "category": "ANALIZĂ VERIFACT AI",
      "eyebrow": "2. REZULTAT ALGORITM",
      "verdictScore": "12%",
      "verdictStatus": "PROBABIL FALS",
      "verdictColor": "#e0563f",
      "verdictDesc": "Explicație scurtă a verdictului.",
      "evidencePoints": [
        "Stratul 1: Sursă fact-check potrivită",
        "Stratul 3: Sursă oficială .gov.ro",
        "Stratul 4: Sinteză Gemini AI"
      ]
    },
    {
      "slideNum": 4,
      "category": "DECONSTRUCȚIE PE SCURT",
      "eyebrow": "3. ADEVĂRUL PE SCURT",
      "cards": [
        { "num": "01", "title": "Punctul 1", "desc": "Descriere scurtă" },
        { "num": "02", "title": "Punctul 2", "desc": "Descriere scurtă" },
        { "num": "03", "title": "Punctul 3", "desc": "Descriere scurtă" }
      ]
    },
    {
      "slideNum": 5,
      "category": "IGIENĂ DIGITALĂ",
      "eyebrow": "CE TREBUIE SĂ REȚII",
      "keyTakeaway": "Concluzia principală a verificării.",
      "ctaTitle": "Ai primit o știre sau o poză dubioasă pe WhatsApp?",
      "ctaBody": "Trage orice screenshot sau text direct în Verifact.ro și primești raportul complet în 12.3 secunde.",
      "actions": ["📌 SALVEAZĂ POSTAREA", "📲 TRIMITE ÎN GRUPUL DE FAMILIE"]
    }
  ]
}
```

---

## 3. Biblioteca de Prompt-uri pentru Imagini AI (Midjourney / DALL-E / Gemini ImageGen)

Pentru crearea de ilustrații tematice, fundaluri de impact și vizualizări abstracte pentru dezinformare:

### Prompt 1: Concept Vizual "Dezinformare Financiară" (Dark Aesthetic)
> **Prompt**: `A dramatic dark mode digital illustration representing financial disinformation in Romania, glowing red holographic percentage numbers and alert icons floating above stylized banknotes, subtle cyber security grid lines, minimalist premium tech aesthetic, navy and deep crimson palette, no human faces, cinematic lighting --ar 4:5`

### Prompt 2: Concept Vizual "Deepfake & AI Manipulation"
> **Prompt**: `A sleek conceptual visualization of deepfake detection technology, an abstract geometric digital wireframe glowing in red shifting to a solid emerald green shield, biometric code streams, dark slate background with subtle noise texture, futuristic clean UI, high resolution --ar 4:5`

### Prompt 3: Concept Vizual "Educație Media & Igienă Digitală"
> **Prompt**: `A minimalist dark isometric illustration of a smartphone displaying a glowing verified checkmark shield against floating chaotic paper news clippings, warm dark charcoal and signal red accents, clean editorial style, vector-like crispness, 8k --ar 4:5`

---

## 4. Ghidul de Comenzi Audio Edge-TTS (Voce AI Gratuită)

Generarea rapidă a fișierelor audio pentru videoclipurile split-screen:

```bash
# Instalare modul (o singură dată)
pip install edge-tts

# Vocea Feminină Oficială (Calmă, neutră, credibilă)
edge-tts --voice ro-RO-AlinaNeural --text "Textul din scriptul video" --write-media audio_alina.mp3

# Vocea Masculină Oficială (Autoritară, serioasă)
edge-tts --voice ro-RO-EmilNeural --text "Textul din scriptul video" --write-media audio_emil.mp3
```
