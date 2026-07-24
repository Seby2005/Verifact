# Changelog — Fact-Checker AI

Toate modificările majore ale proiectului sunt documentate în acest fișier.

---

## [1.0.0] — 2026-07-23

### Adăugat (Added)
- **Homepage & Interfață Input**: Formular de verificare cu suport multi-tab pentru introducere Text, încărcare Screenshot (cu OCR) și URL articole.
- **Algoritm de Verificare în 4 Straturi**: Integrat Fact Check APIs (Google Fact Check Tools), Știri (Digi24, ProTV, Reuters, BBC), Surse Oficiale (.gov.ro, .europa.eu) și Social Media.
- **Sinteză IA (Gemini 2.0 Flash)**: Rapoarte detaliate generate automat cu scor de veridicitate ponderat (0-100%), rezumat executiv, analiză pe straturi și surse citabile.
- **Autentificare & Utilizatori**: Sistem complet de auth via Supabase (Email+Parolă, Google OAuth, GitHub OAuth), protecție rute middleware și management profiluri.
- **Dashboard Freemium**: Vizualizare istoric verificări, toggle public/privat, ștergere rapoarte și monitorizare limite lunare per tier (Free: 10, Pro: 200, Business: 2000).
- **Pagină Prețuri (/pricing)**: Carduri de abonamente, toggle lunar/anual, tabel comparativ și secțiune FAQ.
- **Feed Publice (/reports)**: Feed cu căutare debounced (300ms), filtrare după limbă, verdict și perioadă, paginare responsive și sync în URL.
- **Pagină Transparență (/transparency)**: Diagramă interactivă a algoritmului, explicații tehnice pe straturi, date statistice agregate din DB (`/api/stats`) și ghid open source.
- **SEO Complet**: Generare dinamică sitemap.xml, robots.txt, metadata Next.js, `ClaimReview` JSON-LD schema markup și imagini OpenGraph dinamice (`next/og`).
- **Teste & CI/CD**: Teste unitare Jest, teste End-to-End Playwright pe desktop și mobil, workflow GitHub Actions CI.
