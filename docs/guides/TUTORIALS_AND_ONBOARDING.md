# 🎓 Ghiduri Pas cu Pas, Onboarding Utilizatori și Documentație Integrator API — Verifact

> **Aplicație**: Verifact (AI Fact-Checker Web App)  
> **Skill**: `tutorial-engineer`  
> **Audiențe Vizate**:  
> 1. Utilizatori Finali / Cetățeni (Onboarding simplu UI & Ghiduri WhatsApp).  
> 2. Jurnaliști & Profesioniști Media (Verificare avansată & Export PDF).  
> 3. Dezvoltători Web & IT Redacțional (Integrări API REST).  

---

## 1. Ghidul de Onboarding Pas-cu-Pas pentru Utilizatori Noi (UI Walkthrough)

Acest ghid este afișat interactiv la prima accesare a aplicației pe [verifact.ro].

```
  PAȘII DE VERIFICARE VERIFACT
  
  [Pasul 1: Introducere Input] ──► [Pasul 2: OCR & Confirmare] ──► [Pasul 3: Raport final]
  (Screenshot / Text / URL)        (Verificare text extras)        (Scor 0-100% + Surse)
```

### PASUL 1: Alegerea Modului de Input
Utilizatorul are 3 opțiuni la dispoziție pe pagina principală:
- **Opțiunea A — Upload Screenshot (Recomandat pentru rețele sociale)**: Trage sau încarcă o imagine (PNG, JPEG, WEBP până la 10MB) făcută pe WhatsApp, Facebook, TikTok, Instagram sau Twitter.
- **Opțiunea B — Text Direct**: Lipește un citat, titlu de știre sau mesaj suspect (între 10 și 2000 caractere).
- **Opțiunea C — Link URL**: Introdu adresa web directă a unui articol de știri.

### PASUL 2: OCR & Confirmarea Textului Extras
- Dacă ai încărcat o imagine, modulul nostru bazat pe **Google Cloud Vision API** extrage automat textul din imagine în 2-4 secunde.
- **Validare de siguranță**: Textul extras îți este afișat într-o casetă editabilă. Dacă OCR-ul a omis vreun cuvânt sau dorești să ajustezi afirmația, poți edita textul înainte de a apăsa butonul **"Verifică Afirmația"**.

### PASUL 3: Interpretarea Scorului de Veridicitate
Raportul generat în 12.3 secunde este împărțit în 4 elemente vizuale clare:

1. **Badge-ul de Verdict**:
   - 🟢 `85-100% — PROBABIL ADEVĂRAT`: Știrea este confirmată de surse oficiale și presă de încredere.
   - ⚠️ `60-84% — PARȚIAL ADEVĂRAT / CONTEXT LIPSĂ`: Afirmația conține sâmbure de adevăr, dar este distorsionată sau lipsesc detalii cheie.
   - 🟠 `40-59% — NECLAR / INSUFICIENT VERIFICAT`: Sursele sunt contradictorii sau datele publice sunt insuficiente.
   - ❌ `0-39% — PROBABIL FALS`: Afirmația este infirmată de fact-check-uri anterioare sau comunicate oficiale.

2. **Rezumatul Executiv (Gemini AI)**: 2-3 propoziții concise pe limba tuturor, fără jargon tehnic.
3. **Detalierea pe Straturi**: Lista surselor oficiale găsite (cu link-uri directe accesibile).
4. **Acțiuni rapide**: Export PDF (pentru abonații Pro) sau Distribuie Raportul Public.

---

## 2. Ghid Practic pentru Cetățeni: "Cum verifici o știre primită pe WhatsApp în 3 pași"

### Scenariul Frecvent:
Primești un mesaj pe grupul de familie de pe WhatsApp cu o poză alarmistă: *"De mâine se închid toate spitalele din județ pentru reorganizare!"*

### Cum folosești Verifact:
1. **Pasul 1**: Faci screenshot pe telefon la poza sau mesajul primit pe WhatsApp.
2. **Pasul 2**: Deschizi browserul pe telefon, intri pe [verifact.ro](https://verifact.ro) și apeși pe zona de Upload Imagine.
3. **Pasul 3**: Apasa "Verifică". În mai puțin de 15 secunde, Verifact îți arată că stirea are scorul `5% PROBABIL FALS` și îți oferă comunicatul oficial al Ministerului Sănătății care dezminte zvonul.

> 💡 **Sfat**: Trimite link-ul raportului Verifact direct pe grupul de WhatsApp pentru a opri dezinformarea în fașă!

---

## 3. Campanie Educativă pe 14 Zile: "Ghidul de Igienă Digitală" (Micro-Tutoriale)

1. **Ziua 1**: Ce este un "Fact-Check" și de ce nu trebuie să crezi doar titlul unui articol.
2. **Ziua 2**: Anatomia unui Screenshot Fals: Cum se modifică ușor textul dintr-un site folosind "Inspect Element".
3. **Ziua 3**: Cum identifici domeniile clonă (ex: `digi24-news.xyz` în loc de `digi24.ro`).
4. **Ziua 4**: Regula celor 3 Surse Independent: Cum verifică jurnaliștii o informație.
5. **Ziua 5**: Ce este un "Out of Context Quote" și cum verifici declarațiile politice pe Verifact.
6. **Ziua 6**: Cum funcționează căutarea inversă de imagini (Reverse Image Search).
7. **Ziua 7**: Dezinformarea pe teme medicale: Cum verifici dacă un supliment are aviz oficial.
8. **Ziua 8**: Cum citești un raport Verifact și ce înseamnă procentul de veridicitate.
9. **Ziua 9**: Ce sunt dezinformările de tip Deepfake Audio și Deepfake Video.
10. **Ziua 10**: Cum îți protejezi părinții și bunicii de fake news-urile virale.
11. **Ziua 11**: Rolul surselor guvernamentale (.gov.ro / .europa.eu) în validarea datelor.
12. **Ziua 12**: Cum să nu devii fără să vrei distribuitor de dezinformare pe TikTok și Instagram.
13. **Ziua 13**: Ce înseamnă algoritm Open-Source și de ce transparența este cheia în fact-checking.
14. **Ziua 14**: Check-list-ul zilnic al cetățeanului informat: 3 pași înainte de a da Share.

---

## 4. Documentație Tehnică de Integrare API pentru Dezvoltători & Redacții (B2B API Guide)

API-ul Verifact Business permite redacțiilor și platformelor de știri să automatizeze verificarea conținutului direct din propriul CMS (WordPress, Drupal, Custom React/Next.js).

### Autentificare
Toate cererile API necesită un token Bearer trimis în header-ul de autorizare:
```http
Authorization: Bearer YOUR_VERIFACT_API_KEY
```

> 📌 **Obținerea Cheii API**: Cheile API pentru planul Business se emit personalizat în urma comunicării pe email cu echipa noastră la `contact@verifact.ro`.

---

### Endpoint 1: Verificare Text sau URL
`POST /api/verification/verify`

#### Request Body (JSON):
```json
{
  "claim": "Guvernul a aprobat o nouă taxă pe tranzacțiile bancare de la 1 septembrie.",
  "language": "ro",
  "maxWaitSeconds": 15
}
```

#### Response Body (JSON):
```json
{
  "id": "verif_8f9a2b1c3d4e",
  "verdict": "PROBABIL_FALS",
  "score": 18,
  "processingTimeMs": 12340,
  "summary": "Afirmația privind o nouă taxă bancară de la 1 septembrie este falsă. Ministerul Finanțelor și BNR au emis comunicate oficiale care infirmă această măsură.",
  "sources": [
    {
      "title": "Comunicat de presă — Clarificări privind regimul fiscal al tranzacțiilor",
      "url": "https://mfinante.gov.ro/comunicate/clarificari-taxe-2026",
      "domain": "mfinante.gov.ro",
      "credibilityScore": 95
    },
    {
      "title": "Factual.ro — Verificare afirmație taxă bancară",
      "url": "https://factual.ro/verificari/taxa-bancara-fals",
      "domain": "factual.ro",
      "credibilityScore": 90
    }
  ],
  "layersEvaluated": {
    "factCheckMatch": true,
    "newsMatch": true,
    "officialSourcesMatch": true
  }
}
```

---

### Exemple de Cod Executabil

#### A. cURL (Terminal / Bash)
```bash
curl -X POST "https://verifact.ro/api/verification/verify" \
  -H "Authorization: Bearer vf_live_987654321qwerty" \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "Textul de verificat extras din articol",
    "language": "ro"
  }'
```

#### B. Node.js / TypeScript (Next.js / Express Integration)
```typescript
import axios from 'axios';

interface VerificationResult {
  verdict: string;
  score: number;
  summary: string;
  sources: Array<{ title: string; url: string; domain: string }>;
}

async function verifyClaimWithVerifact(claimText: string): Promise<VerificationResult> {
  const apiKey = process.env.VERIFACT_API_KEY;

  try {
    const response = await axios.post<VerificationResult>(
      'https://verifact.ro/api/verification/verify',
      {
        claim: claimText,
        language: 'ro',
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 secunde timeout
      }
    );

    return response.data;
  } catch (error) {
    console.error('Eroare la apelul Verifact API:', error);
    throw error;
  }
}
```

#### C. Python (Django / FastAPI / Scripting Redacțional)
```python
import requests
import os

VERIFACT_API_URL = "https://verifact.ro/api/verification/verify"
API_KEY = os.getenv("VERIFACT_API_KEY", "vf_live_your_key_here")

def check_fact(claim_text: str):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "claim": claim_text,
        "language": "ro"
    }
    
    response = requests.post(VERIFACT_API_URL, json=payload, headers=headers, timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Verdict: {data['verdict']} (Scor: {data['score']}%)")
        print(f"Sinteză: {data['summary']}")
        return data
    else:
        print(f"Eroare API Verifact: {response.status_code} - {response.text}")
        return None

# Exemplu apel
if __name__ == "__main__":
    check_fact("A fost aprobată o nouă lege privind asigurările auto obligatorii?")
```
