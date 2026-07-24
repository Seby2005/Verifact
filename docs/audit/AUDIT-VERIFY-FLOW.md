# Audit al Fluxului de Verificare (Verify Flow Audit)
**Data:** 24 Iulie 2026  
**Proiect:** AI Fact-Checker Web App  
**Autor:** Senior Frontend Engineer (Gemini 3.6 High)

---

## 1. Test Manual Pas cu Pas

| Pas # | Acțiune | Comportament Așteptat (PRD) | Comportament Efectiv (Actual) | Stare |
|---|---|---|---|---|
| 1 | Încărcare Homepage | Layout Above-the-fold, Hero H1 direct, statistici reale/placeholder, formular vizibil fără scroll. | Hero generic, întregul `app/page.tsx` este Client Component (`'use client'`), statistici hardcodate false. | **BROKEN** |
| 2 | Schimbare Taburi (Screenshot / Text / URL) | Schimbare instantanee a tab-ului, starea persistă în URL (`?tab=...`), butonul back din browser funcționează. | Tab-urile se schimbă doar în state local. Nu există niciun query param `?tab=...` în URL. | **BROKEN** |
| 3 | Upload Imagine Validă (JPEG/PNG/WEBP < 10MB) | Preview imagine, buton explicit "Extrage text", apel POST `/api/ocr` la confirmare, afișare text extras în textarea editabil. | Aplicația face automat OCR la selectarea fișierului fără confirmare (fără buton "Extrage text"). | **BROKEN** |
| 4 | Upload Imagine > 10MB | Respingere client-side imediată cu mesaj de eroare specific care indică dimensiunea maximă și dimensiunea fișierului. | Respinge cu mesaj generic, nu afișează dimensiunea exactă a fișierului încărcat. | **BROKEN** |
| 5 | Upload Fișier Non-Imagine (.pdf, .txt, etc.) | Respingere strictă client-side pe baza tipului MIME / extensiei cu lista tipurilor acceptate (JPEG, PNG, WEBP). | Verifică doar `file.type`, fără validare de magic bytes sau fallback robust pe extensie. | **BROKEN** |
| 6 | Text sub 10 caractere | Butonul "Verifică acum" rămâne dezactivat. Counter-ul indică < 10 caractere. | Butonul este dezactivat, dar lipsește mesajul / feedback-ul vizual direct pentru utilizator. | **BROKEN** |
| 7 | Text peste 2000 caractere | Blocare sau trunchiere cu avertisment vizual când se depășește limita de 2000 caractere. | Trunchiază la tastare, dar nu afișează avertisment explicit de depășire când se încearcă paste. | **BROKEN** |
| 8 | Detecție Limbă Live (RO/EN) | Indicator vizual steag (🇷🇴/🇬🇧) lângă butonul de submit, actualizat live cu debounce de 400ms. | Detecția de limbă se face la fiecare keystroke fără debounce și steagul este afișat în header-ul formularului, nu lângă buton. | **BROKEN** |
| 9 | URL Invalid | Input marcat vizual cu roșu, mesaj de feedback clar că formatul URL este incorect (ex: `https://...`). | Afișează feedback text, dar butonul "Extrage articol" apare/dispare brusc fără UX fluent. | **BROKEN** |
| 10 | URL Valid către Site Real | Debounce 600ms -> fetch preview metadata (titlu + sursă) -> afișare card de preview cu avertisment dacă scraping-ul este blocat. | Face simulare locală hardcodată (`setTimeout` cu titlu generic), fără apel API real sau fallback pentru scraping blocat. | **BROKEN** |
| 11 | Submit Formular & Progress Tracker | Progres REAL (SSE streaming la `/api/verify/stream` sau polling la `/api/verify/:id/status`), fără timere false hardcodate. | `ProgressTracker` folosește `autoPlay` cu timere simulate (`setTimeout`) de 2-8s per pas. Nu face apeluri reale de status. | **BROKEN** |
| 12 | Eșec Strat Backend | Dacă un strat eșuează (`unavailable`), se afișează acel pas ca indisponibil, iar procesul continuă cu celelalte straturi. | `ProgressTracker` nu gestionează starea de `unavailable` per pas individual. | **LIPSEȘTE** |
| 13 | Finalizare Verificare | Redirect automat sau buton "Vezi raportul" către `/reports/[id]`. | Randare directă a unui card stub fix pe homepage în loc de redirectare către ruta de raport `/reports/[id]`. | **BROKEN** |
| 14 | Responsive Mobil (Viewport 375px) | Zona de drag & drop se adaptează pentru mobil (drag&drop indisponibil pe touch -> se afișează direct input file nativ). | Zona de drag & drop rămâne mare și vizibilă pe mobil în loc să arate direct butonul nativ de fișier. | **BROKEN** |
| 15 | Navbar Global | Navbar sticky cu shadow la scroll, selector de limbă RO/EN, hamburger menu mobil cu focus trap, stări auth. | Lipsește selectorul de limbă (RO/EN), hamburger-ul pe mobil nu are focus trap. | **BROKEN** |
| 16 | Footer Global | Linkuri către GitHub, Licență MIT, `/terms`, `/privacy`, mențiune open-source & AI disclaimer. | Lipsesc link-urile către `/terms` și `/privacy`, an hardcodat 2025, link GitHub generic. | **BROKEN** |

---

## 2. Bug-uri Concrete Găsite

### 🔴 Severitate Blocantă (Critical / Blocker)
1. **[VERIFY-01] Progres Simulat cu Timer Fals în loc de Stare Reală**: `ProgressTracker` folosește `autoPlay` cu `setTimeout` hardcodat, ignorând complet backend-ul. Utilizatorul vede un loader fals care nu reflectă execuția reală a verificării.
2. **[VERIFY-02] Randare Stub pe Homepage în loc de Redirect la Raport**: Dupǎ "verificare", `page.tsx` afișează un `Card` stub cu date mock hardcodate direct în homepage, în loc să navigheze la `/reports/[id]`.
3. **[VERIFY-03] Execuție OCR Automată fără Confirmare & Preview**: `ScreenshotUpload` trimite automat imaginea la OCR în momentul selectării, fără a permite utilizatorului să vadă preview-ul și să apese pe butonul explicit "Extrage text".

### 🟠 Severitate Majoră (Major)
4. **[VERIFY-04] Pagina Principală (`app/page.tsx`) este 100% Client Component**: Întreaga pagină folosește `'use client'`, stricând SEO-ul și crescând bundle-ul JS trimis clientului. Trebuie refăcută ca Server Component cu insule interactive ('use client').
5. **[VERIFY-05] Lipsă Persistență Tab în URL**: Comutarea între taburile Screenshot/Text/URL nu actualizează query parameter-ul `?tab=...`, împiedicând share-ul de linkuri directe și funcționarea butonului back din browser.
6. **[VERIFY-06] Re-calculare Detecție Limbă Fără Debounce**: `detectLanguage` rulează la fiecare tastă apăsată (`onChange`), generând recalculări inutile. Trebuie aplicat debounce 400ms și mutarea indicatorului vizual lângă butonul "Verifică acum".
7. **[VERIFY-07] Lipsă Validare MIME Strictă & Feedback Dimensiune**: Validarea imaginii nu indică dimensiunea exactă a fișierului respins și nu verifică extensia/magic bytes pentru imagini modificate.
8. **[VERIFY-08] Previzualizare URL Mock-uită Fără Endpoint Backend / Scraper**: Tab-ul URL folosește `setTimeout` cu text hardcodat pentru preview în loc să apeleze endpoint-ul backend sau să gestioneze fallback-ul de scraping blocat.
9. **[VERIFY-09] Responsive Mobil Deficitar pentru Drag & Drop**: Zona de upload pe mobil încearcă să afișeze drag & drop, deși pe ecrane touch este inoperant.

### 🟡 Severitate Minoră (Minor)
10. **[NAV-01] Navbar - Lipsă Selector de Limbă (RO/EN)**: Navbar nu include selectorul de limbă cerut de specificațiile UI/UX.
11. **[FOOT-01] Footer - Link-uri `/terms` și `/privacy` Lipsă**: Footer-ul nu conține link-urile legale obligatorii.
12. **[STAT-01] Statistici False pe Homepage**: Hero/AnimatedStats afișează numere hardcodate ("1420+ verificări"), contrazicând valorile de brand și transparență din PRD §1.1.

---

## 3. Plan de Remediere

Toate bug-urile identificate vor fi remediate în implementarea curentă conform documentelor de specificații (`PRD.md`, `ARCHITECTURE.md`, `GEMINI.md`).
