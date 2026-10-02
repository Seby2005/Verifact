# Implementarea extensiei Verifact (Chrome MV3) — detalii complete

> Document scris la cerere, care detaliază pas cu pas tot ce s-a construit pentru
> **Track C (Chrome extension)** din `docs/api/CONTRACT_v1.md`.
> Extensia apelează `POST /api/v1/verify`, este **anonimă implicit**, iar butonul
> **Log in** preia token-ul Supabase de pe site și îl trimite ca `Bearer` (Mode A).
> Până când Track B livrează endpoint-ul real, răspunsurile sunt **mock-uite** conform
> Secțiunii 1 din contract.

---

## 0. Context și reguli respectate

- Surse citite: `docs/api/CONTRACT_v1.md` (contract înghețat v1.0) și
  `src/types/verification.ts` (forma exactă a obiectului `VerificationReport`).
- Din contract (§4, Track boundaries): **Track C deține un folder nou la rădăcină
  `extension/` și ZERO fișiere în `src/`.** S-a respectat — nimic nu a fost atins în `src/`.
- Identificat din `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL = https://iqszqrilxuqhcnwskxnj.supabase.co`
    → ref Supabase = `iqszqrilxuqhcnwskxnj`.
  - `NEXT_PUBLIC_APP_URL = http://localhost:3000` → originea site-ului / bază API.
- Obiectiv: extensia să fie construibilă și testabilă **acum**, în paralel cu Track A/B,
  folosind răspunsuri mock care respectă întocmai forma din contract.

---

## 1. Structura fișierelor create

```
extension/
├── manifest.json        # MV3 manifest (popup, service worker, content script, permisiuni)
├── config.js            # configurare comună (origine, API base, USE_MOCK, ref Supabase)
├── background.js        # service worker (auth Mode A + verify real/mock)
├── mocks.js             # răspunsuri mock exacte după Secțiunea 1
├── content.js           # injectat pe site; sincronizare pasivă a sesiunii Supabase
├── popup.html           # UI popup
├── popup.css            # stiluri popup
├── popup.js             # logică popup (clasic, fără module)
└── icons/
    ├── 16.png           # generate procedural (albastru brand + checkmark)
    ├── 48.png
    └── 128.png
```

Niciun fișier nu a fost creat în `src/`.

---

## 2. `manifest.json` (MV3)

Puncte cheie:
- `"manifest_version": 3`.
- `action.default_popup = "popup.html"` — extensia se deschide ca popup la click pe icon.
- `background.service_worker = "background.js"` cu `"type": "module"` (permite `import`).
- `permissions`: `storage` (token persistat), `scripting` (injectare în tab-ul site-ului
  pentru a citi token-ul), `tabs`, `activeTab`.
- `host_permissions`: `http://localhost:3000/*`, `https://verifact.ro/*`,
  `https://*.verifact.ro/*` — necesare atât pentru `chrome.scripting.executeScript`
  cât și pentru `fetch` cross-origin către endpoint.
- `content_scripts`: se injectează `content.js` pe originile de mai sus la `document_idle`,
  pentru sincronizarea pasivă a login-ului.

---

## 3. `config.js`

Singurul loc unde se schimbă configurarea la deploy:
- `WEBSITE_ORIGIN` — unde se deschide tab-ul de login și de unde se citește sesiunea
  Supabase din `localStorage`.
- `API_BASE` — bază pentru `POST /api/v1/verify`.
- `USE_MOCK: true` — **comutatorul principal**. Când Track B livrează
  `src/app/api/v1/verify/route.ts`, se schimbă în `false` și extensia sună endpoint-ul real.
- `MOCK_LATENCY_MS: 850` — latență simulată pentru mock (experiență realistă).
- `SUPABASE_PROJECT_REF: 'iqszqrilxuqhcnwskxnj'` — cheia `sb-<ref>-auth-token`.
- `AUTH_STORAGE_KEY: 'verifact_auth'` — cheia din `chrome.storage.local`.

---

## 4. `mocks.js` — răspunsuri după Secțiunea 1

Funcția exportată `mockVerify(payload, auth)` returnează `{ status, data }` unde `data`
respectă exact forma din contract:

**Succes (200):**
```jsonc
{ "success": true,
  "report": { /* VerificationReport complet, identic cu cel din site */ },
  "usage": { "tier": "free"|"pro"|"business",
             "remaining": 34,            // null pentru anonim
             "resetsAt": "2026-09-01T00:00:00.000Z" } }
```
- `report` este construit cu `buildReport()` și folosește **aceeași formă**
  `VerificationReport` din `src/types/verification.ts` (câmpuri obligatorii: `id`,
  `inputText`, `inputType`, `verdict`, `score`, `confidenceLevel`, `executiveSummary`,
  `scoreBreakdown`, `sources`, `createdAt`, `isPublic`, `language`; plus `layers`
  `layer1..layer4`, `keyTakeaways`, `aiAnalysis`, `disclaimer`). Exemplul conține
  surse fact-check / news / official / social cu scoring realist.
- `usage.tier` = `free` + `remaining: null` când `auth` lipsește (anonim); când există
  token, `tier` = `pro` (sau `business` dacă userul are `tier:'business'`) și
  `remaining: 34`.

**Erori** — forma `{ "success": false, "error": "<mesaj om>", "code": "<CODE>" }`:
toate codurile din tabel sunt acoperite:
`INPUT_INVALID` (400), `AUTH_INVALID` (401), `FORBIDDEN` (403), `USAGE_LIMIT` (403),
`URL_UNREADABLE` (422), `RATE_LIMIT` (429), `SERVER_ERROR` (500), `ALL_LAYERS_FAILED` (502).

**Gărzi de validare (ca pe server):**
- text < 10 caractere → 400 `INPUT_INVALID`.
- `inputType:"url"` cu URL invalid → 400 `INPUT_INVALID`.

**Sentinele de test** — pentru a exercita fiecare cod fără backend, textul poate conține:
`@err_input_invalid`, `@err_auth`, `@err_forbidden`, `@err_rate_limit`, `@err_server`,
`@err_layers`, `@err_url_unreadable`, `@err_usage_limit`. Sentinela e verificată **înaintea**
validării 400, ca să fie mereu declanșabilă.
- `USAGE_LIMIT` anonim: mesajul numește numărul — *"…all 3 free checks…"*.
- `USAGE_LIMIT` autentificat: mesaj **fără număr** (regula produsului: capul Pro nu se
  afișează), exact cum cere contractul.

---

## 5. `background.js` — service worker (auth + verify)

### 5.1 Stocarea token-ului (Mode A)
- `getAuth()` citește `verifact_auth` din `chrome.storage.local`. Dacă `expiresAt`
  (secunde epoch) a trecut, șterge token-ul și returnează `null` (nu trimite JWT expirat).
- `saveAuth(session)` persistă `{ accessToken, expiresAt, user }` și anunță popurile
  (`notifyAuth`).
- `logout()` șterge token-ul.

### 5.2 Citirea sesiunii Supabase de pe site
Funcția `readSupabaseSession(ref)` rulează **în lumea izolată a paginii** (via
`chrome.scripting.executeScript`). `localStorage` este scoped pe origine, deci cheia
`sb-<ref>-auth-token` a site-ului este citibilă. Parsează `currentSession`/`session` și
extrage `access_token`, `expires_at`, `user { id, email, tier }`. Caută și după patternul
generic `^sb-.*-auth-token$` (rezilient la schimbări de ref).

### 5.3 Fluxul "Log in"
`handleLogin()`:
1. Deschide tab pe `WEBSITE_ORIGIN + '/login'`.
2. Pollează tab-ul la fiecare 1,5 s (max 90 s) cu `executeScript(readSupabaseSession)`.
   Când găsește un `accessToken`, îl salvează și anunță popurile → gata.
3. Dacă expiră cele 90 s, anunță eroare ("Login timed out…").
Astfel: deschizi site-ul, te loghezi acolo, iar token-ul e capturat **automat** de extensie.

### 5.4 `verify(payload)`
- Aduce `auth` curent.
- Dacă `CONFIG.USE_MOCK` → așteaptă latența simulată și returnează `mockVerify(payload, auth)`.
- Altfel (endpoint real): `fetch(API_BASE + '/api/v1/verify', { method:'POST',
  headers:{ 'Content-Type':'application/json', ...(auth?.accessToken && { Authorization:
  'Bearer '+auth.accessToken }) }, body: JSON.stringify(payload) })`. În caz de eroare de
  rețea returnează `NETWORK_ERROR`.

### 5.5 Router de mesaje
- `VERIFY` → apelează `verify`, răspunde async (`return true`).
- `LOGIN` → pornește `handleLogin`.
- `LOGOUT` → șterge auth.
- `GET_AUTH` → întoarce auth curent (pentru inițializarea popup-ului).
- `SESSION_UPDATED` (de la `content.js`) → salvează token-ul **doar dacă e prezent**
  (nu șterge auth-ul existent la un payload null — userul poate fi pe alt tab).

---

## 6. `content.js` — sincronizare pasivă

Injectat pe originile site-ului. La încărcare și la orice eveniment `storage` pe cheia
`sb-*-auth-token`, citește sesiunea și o trimite la background via
`{ type:'SESSION_UPDATED', session }`. Efect: dacă ești deja logat pe site când deschizi
extensia, token-ul e preluat fără să mai dai click pe Log in. Nu șterge niciodată auth-ul
la un rezultat null.

---

## 7. `popup.*` — UI

### `popup.html`
Header cu icon + titlu + badge (`Anonymous` / `Signed in`); bară de auth cu
`Log in` / `Log out`; textarea pentru conținut; selectoare `inputType` (text/url/screenshot)
și `language` (auto/ro/en/fr); checkbox `isPublic`; buton `Verify`; zonă de status și de
rezultat; footer cu `usage`.

### `popup.css`
Stil minimal, temă deschisă, culori pentru verdict (verde=adevărat, roșu=fals,
portocaliu=parțial, gri=necunoscut).

### `popup.js` (clasic, fără module — CSP-friendly)
- La deschidere: `GET_AUTH` → `renderAuth`.
- Ascultă `AUTH_STATE_CHANGED` → re-render auth.
- `Log in` → `LOGIN`; `Log out` → `LOGOUT`.
- `Verify`: validează (≥10 caractere, sau URL valid pentru `inputType:url`), construiește
  payload-ul `{ text, inputType, language, isPublic }`, trimite `VERIFY`, afișează
  verdict/score/summary/takeaways/surse (cu linkuri) și `usage`. Escapează HTML-ul ca să
  nu existe XSS din conținutul raportului.

**Notă deliberate:** `inputType:"screenshot"` e selectabil, dar corpul request-ului din
contract (§1) **nu definește un câmp pentru bytes-ul imaginii** — deci screenshot-ul nu e
încă cablat în request. Rămâne de extins când contractul clarifică transportul imaginii.

---

## 8. Icons

`16/48/128.png` generate procedural cu un script Python (encoder PNG minimal, fără
dependențe): fundal albastru brand (`#2563eb`) + checkmark alb. Evită avertismentele
Chrome despre lipsa icon-ului.

---

## 9. Validări efectuate

- `manifest.json` — JSON validat (`JSON.parse`).
- Toate fișierele JS — `node --check` (modulele ca `.mjs` temporare).
- **Smoke test funcțional al mock-urilor** (12 cazuri, toate PASS):
  - succes anonim (200, `tier:'free'`, `remaining:null`);
  - succes autentificat (`tier:'pro'`, `remaining:34`);
  - 400 text scurt / 400 URL invalid;
  - 401 / 403 FORBIDDEN / 429 / 500 / 502 / 422 (via sentinele);
  - 403 `USAGE_LIMIT` anonim numește "3 free checks", autentificat e fără număr.

---

## 10. Cum se încarcă și se testează

1. `chrome://extensions` → dezvoltator activat → "Load unpacked" → selectează folderul
   `extension/`.
2. Deschide site-ul (`http://localhost:3000`), loghează-te.
3. Click pe icon → **Log in** (token-ul e capturat automat; badge devine "Signed in").
4. Introdu text (≥10 caractere) și dă **Verify** → vezi raportul mock (anonim sau, dacă ești
   logat, cu `usage` de Pro).
5. Pentru a testa erorile, introdu în text una din sentinelele `@err_*`.
6. Când Track B livrează endpoint-ul real: setează `USE_MOCK: false` în `config.js`.

## 11. Limitări / următoarele pași
- Screenshot: corpus request-ului din contract nu definește câmpul imagine — de cablat când
  se clarifică.
- CORS pentru endpoint-ul real (§3) e responsabilitatea Track B (allowlist de origini
  `chrome-extension://<id>`), nu a extensiei.
- `WEBSITE_ORIGIN` / `API_BASE` trebuie actualizate pentru mediul de producție (`verifact.ro`).
