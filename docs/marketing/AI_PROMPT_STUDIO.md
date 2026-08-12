# 🤖 AI Prompt Studio — OmniRoute & Generatoare Vizuale (100% Faceless)

> **Gateway Endpoint**: `http://localhost:20129/v1` (OmniRoute) sau `http://localhost:4000/v1` (LiteLLM)  
> **Modele Recomandate**: `gemini-flash` (Gemini 2.0 Flash) sau `deepseek-r1` / `claude-3-5-sonnet`  

---

## 1. System Prompt-ul Maestru OmniRoute pentru Generare Conținut Verifact

Când folosești OmniRoute pentru a genera noi idei de postări, scripturi sau caruseluri de deconstruire fake news, folosește următorul **System Prompt**:

```text
Ești Content Director-ul Faceless pentru Verifact (un AI Fact-Checker Web App din România).
Misiunea ta este să generezi conținut de marketing viral, obiectiv și 100% faceless pentru TikTok, Instagram și Facebook.

Reguli de Aur:
1. NU propune niciodată concepte în care o persoană sau fondatorul apare pe cameră sau vorbește în persoană.
2. Formatele permise sunt DOAR: TikTok Photo Slideshows (caruseluri foto verticale), videoclipuri faceless cu split-screen (UI app + voiceover AI), caruseluri statice Instagram/Facebook și infografice.
3. Tonul este profesionist, educativ, imparțial și de impact (fără dramatism ieftin, ci axat pe fapte și verificabilitate).
4. Fiecare piesă de conținut trebuie să includă scorul de veridicitate (0% - 100%), sursele citate (ex: .gov.ro, Factual.ro, PubMed) și CTA-ul "Verifică gratuit pe Verifact.ro".
5. Limba conținutului: Română impecabilă.
```

---

## 2. Prompt-uri OmniRoute pentru TikTok Slideshows (Copywriting Auto)

### Prompt A: Deconstrucție Fake News Viral (Lipește stirea suspectă)
```text
Copiați mai jos o știre sau un text viral de pe rețelele sociale:
"[INSEREAZĂ TEXTUL SUSPECT AICI]"

Generează un TikTok Photo Slideshow de 5 slide-uri în format text exact pentru fiecare slide:
- Slide 1: Hook captivant (întrebare sau afirmație șocantă).
- Slide 2: Contextul falsului și de ce s-a răspândit.
- Slide 3: Analiza Verifact AI cu procentaj de veridicitate % și surse oficiale.
- Slide 4: Adevărul demonstrat pe scurt.
- Slide 5: CTA pentru Verifact.ro.
Adaugă și 5 hashtag-uri virale și o descriere TikTok de 200 de caractere.
```

### Prompt B: Generator de Mituri Urbane / Edu-Tech
```text
Generează 3 idei noi de TikTok Photo Slideshows din categoria "Igienă Digitală și Educație Media", axate pe cum te protejezi de falsurile financiare, medicale sau politice. Oferă textul exact pentru fiecare slide și stilul vizual recomandat.
```

---

## 3. Studio de Prompt-uri pentru Generare Imagini AI (Gemini ImageGen / DALL-E 3 / Midjourney)

Pentru a crea fundaluri uimitoare, coperți de carusel și ilustrații fără fețe umane reale:

### Prompt 1: Cover de Infografic "Fake News vs Truth" (Dark Mode Minimalist)
> **Prompt**: `A sleek dark mode digital visualization concept, abstract glowing red network nodes representing misinformation transforming into clean emerald green verified data shields, futuristic UI elements, subtle neon glow, 8k resolution, minimalist tech aesthetic, no humans, cinematic lighting --ar 16:9`

### Prompt 2: Fundal TikTok Slideshow "Financial Misinformation"
> **Prompt**: `A dramatic dark background featuring floating digital Romanian currency (RON) symbols surrounded by red warning alert signs and futuristic holographic percentage bars showing 12%, clean tech graphic style, deep navy and crimson palette, no people --ar 9:16`

### Prompt 3: Fundal TikTok Slideshow "AI Deepfake Detection"
> **Prompt**: `An abstract digital screen displaying glowing binary code, facial recognition grid overlay over a shadowy geometric silhouette, cyber security analytics theme, neon cyan and violet highlights, high tech, clean dark aesthetic --ar 9:16`

### Prompt 4: Banner Facebook & Instagram "Barometrul Veridicității"
> **Prompt**: `A professional 3D rendered data dashboard chart floating in dark space, showing bar charts and verification shields, sleek glassmorphism style, translucent blue and white accents, high resolution, modern corporate tech graphic --ar 1:1`

---

## 4. Prompts & Setări pentru Voce AI (Text-to-Speech Edge-TTS / ElevenLabs)

### Script Python de Generare Voce Gratuită prin Edge-TTS (Română)

Dacă vrei să generezi fișiere audio `.mp3` 100% gratuit fără cont ElevenLabs, instalează `edge-tts`:

```bash
pip install edge-tts
```

Rularea din linia de comandă:
```bash
edge-tts --voice ro-RO-AlinaNeural --text "Dacă ai primit și tu mesajul ăsta pe WhatsApp, nu da share mai departe! Verifică gratuit pe Verifact.ro" --write-media sample_voiceover.mp3
```

- **Vocea Recomandată Femeie**: `ro-RO-AlinaNeural` (Calmă, clară, de încredere)
- **Vocea Recomandată Bărbat**: `ro-RO-EmilNeural` (Serioasă, autoritară, neutră)
