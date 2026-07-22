# AI Fact-Checker

[![CI](https://github.com/Seby2005/fact-checker-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Seby2005/fact-checker-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Aplicație web open source de verificare a știrilor și conținutului de pe rețelele sociale, folosind inteligență artificială.

## Funcționalități

- **Upload screenshot** — extragere automată a textului din imagini (OCR)
- **Input text / URL** — verificare directă a afirmațiilor sau articolelor
- **Raport detaliat** — scor de veridicitate, surse verificabile, context și explicații
- **Transparență completă** — algoritm open source, fiecare pas al verificării este documentat

## Stack Tehnologic

- **Frontend:** Next.js 14 (App Router) + TypeScript strict + CSS Modules
- **Backend:** Next.js API Routes (serverless)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Gemini 2.0 Flash API
- **OCR:** Google Cloud Vision API
- **Search:** Google Fact Check Tools API + Custom Search API + NewsAPI

## Instalare Locală

### Prerequisite

- Node.js 20+
- npm 10+
- Cont Supabase (gratuit)
- Chei API Google Cloud (Vision, Fact Check Tools, Custom Search, Gemini)

### Pași

```bash
# 1. Clonează repository-ul
git clone https://github.com/Seby2005/fact-checker-ai.git
cd fact-checker-ai

# 2. Instalează dependențele
npm install

# 3. Configurează variabilele de mediu
cp .env.example .env.local
# Editează .env.local cu valorile tale

# 4. Pornește serverul de dezvoltare
npm run dev
```

Aplicația va fi disponibilă la [http://localhost:3000](http://localhost:3000).

## Scripturi Disponibile

| Comandă | Descriere |
|---|---|
| `npm run dev` | Pornește serverul de dezvoltare |
| `npm run build` | Construiește aplicația pentru producție |
| `npm run start` | Pornește serverul de producție |
| `npm run lint` | Rulează ESLint |
| `npm test` | Rulează testele unitare |
| `npm run type-check` | Verifică tipurile TypeScript |

## Contribuie

Consultă [CONTRIBUTING.md](CONTRIBUTING.md) pentru detalii despre cum poți contribui la proiect.

## Licență

Acest proiect este licențiat sub [MIT License](LICENSE).
