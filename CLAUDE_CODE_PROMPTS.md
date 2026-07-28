# Prompturi pentru Claude Code — Verifact

Am investigat codul (fără să modific nimic) și am identificat cauzele exacte pentru cele 4 probleme. Mai jos sunt prompturi gata de copiat în Claude Code, unul pentru fiecare temă. Fiecare prompt conține fișierele și liniile relevante ca să nu ghicească.

---

## 1. Algoritmul de verificare — surse irelevante + AI ca "organizator" + buton Descarcă raport

```
Am o problemă de relevanță în pipeline-ul de verificare din src/lib/verification/. Investighează și repară, fără să refactorizezi nimic în plus.

CONTEXT — cauza găsită deja prin citirea codului:

1. src/lib/verification/layer2-news.ts, funcția runLayer2 (linia ~305-339): articolele sunt deduplicate și sortate DOAR după credibilityScore (linia 326: `unique.sort((a, b) => (b.credibilityScore ?? 0) - (a.credibilityScore ?? 0))`), fără să filtreze articolele cu sentiment === 'unrelated'. Filtrarea după relevanță există DOAR în calculateLayer2Score (linia 276: `articles.filter(a => a.sentiment !== 'unrelated')`), care influențează scorul, dar NU lista de rezultate afișată userului. Rezultatul: articole complet irelevante (ex. cutremure în Venezuela, studii despre COVID) apar în raport ca "surse" pentru un claim despre altceva, doar pentru că au un scor de credibilitate mare.

2. src/lib/verification/layer3-official.ts, funcția runLayer3 (linia ~197-268): NU există niciun filtru de relevanță aici. Tavily e interogat cu o căutare construită din cuvinte cheie (buildOfficialSearchQuery, linia 154), iar TOATE rezultatele întoarse de Tavily din domeniile oficiale (INCLUDE_DOMAINS, ex. nih.gov, pmc.ncbi.nlm.nih.gov) sunt incluse necondiționat în raport, indiferent cât de puțin au de-a face cu claim-ul. analyzeSupport (linia 119) doar clasifică support/deny/neutral, nu decide dacă sursa e relevantă deloc.

CE TREBUIE FĂCUT:
- În layer2-news.ts: filtrează articolele cu sentiment === 'unrelated' ÎNAINTE de a le include în `results`/`articles` întors din runLayer2 (nu doar din calculul scorului). Verifică dacă pragul de relevanță din detectSentiment (linia 92: `if (relevance < 0.15) return 'unrelated';`) e suficient de strict — cu claim-ul "Donald Trump is dead" au trecut de el rezultate despre Venezuela earthquakes.
- În layer3-official.ts: adaugă un filtru de relevanță similar cu cel din layer2 (compară cuvintele semnificative din claim cu title+content-ul sursei oficiale) și exclude sursele sub prag, înainte de a le pune în `sources`/`results`. Nu inventa un sistem nou — reutilizează logica de relevanță deja scrisă în layer2-news.ts dacă se poate extrage/reutiliza simplu, altfel scrie una echivalentă.
- Verifică și layer1-factcheck.ts și layer4-social.ts (src/lib/verification/) dacă au aceeași lipsă de filtrare — dacă da, aplică aceeași reparație acolo.

REDESIGN cerut de mine pentru rolul AI-ului:
Momentan AI-ul (generateAIAnalysis / generateAIAssessment din src/lib/ai/gemini.ts, apelate din src/lib/verification/orchestrator.ts) intervine DUPĂ ce toate cele 4 layere au rulat, doar ca să scoreze/narreze. Vreau ca AI-ul să funcționeze mai degrabă ca un ORGANIZATOR: după ce layerele au adus rezultatele brute din API-uri, AI-ul (sau un pas explicit înainte de a construi raportul final) să citească fiecare sursă găsită și să elimine/marcheze pe cele care nu au legătură reală cu claim-ul, înainte ca userul să le vadă — în loc să se bazeze doar pe potrivire de cuvinte cheie. Analizează orchestrator.ts (funcția verifyContent) și propune-mi cum ai structura acest pas suplimentar (poate fi un pas de filtrare AI ușor, cu un prompt separat de cel de analiză/scoring, care primește lista de surse candidate și întoarce doar id-urile celor relevante) — implementează-l dacă ești sigur de abordare, altfel prezintă-mi 2 variante înainte să scrii cod.

Separat, adaugă o funcționalitate nouă: un buton "Descarcă raport" în componenta de raport (src/components/verify/ReportView/index.tsx și DisputeButton.tsx din același folder, ca referință de stil). Format simplu — PDF sau măcar un .txt/.md structurat cu claim, verdict, scor, și lista de surse cu linkuri. Nu adăuga dependențe grele dacă poți genera PDF-ul simplu client-side; dacă ai nevoie de o librărie, spune-mi ce alegi și de ce înainte să o instalezi.

Nu modifica stilul existent de cod, nu redenumi variabile fără legătură cu bug-ul, nu "îmbunătăți" alte layere care funcționează corect (layer1 pare să fi întors rezultate corecte pentru testul cu Trump).
```

---

## 2. Autentificare Google / Facebook / GitHub

```
Verifică integrarea OAuth din Verifact — cred că userul trebuie doar să configureze provider-ii, dar vreau să te asiguri de partea de cod întâi.

CONTEXT — ce am găsit deja citind codul:
- src/components/auth/AuthPanel/index.tsx (linia ~71-86): funcția handleOAuthSignIn apelează deja supabase.auth.signInWithOAuth cu provider 'google' | 'facebook' | 'github' și redirectTo `${window.location.origin}/api/auth/callback`. Butoanele UI pentru toți cei 3 provideri există deja (linia ~249-300).
- src/app/api/auth/callback/route.ts: face deja exchangeCodeForSession(code) și redirectează la /cont, cu fallback la /cont?error=oauth_failed.

Deci codul pare complet — problema e probabil că provider-ii Google/Facebook/GitHub nu sunt activați/configurați în Supabase Dashboard (Authentication > Providers), sau lipsesc Client ID/Secret, sau redirect URI-urile înregistrate la Google/Facebook/GitHub nu se potrivesc cu URL-ul de callback Supabase.

CE VREAU DE LA TINE:
1. Confirmă (citind codul, nu presupunând) că fluxul client → Supabase → /api/auth/callback → /cont e corect end-to-end și că nu lipsește nimic din partea de aplicație (ex. gestionarea corectă a query param-ului ?error=oauth_failed în pagina /cont — verifică src/app/cont/page.tsx dacă afișează vreun mesaj de eroare userului în acest caz, sau dacă trebuie adăugat).
2. Scrie-mi (ca text, nu cod) checklist-ul EXACT de pași pe care trebuie să-i fac eu în Supabase Dashboard + în Google Cloud Console / Facebook Developers / GitHub Developer Settings ca autentificarea să funcționeze — inclusiv ce redirect URL trebuie înregistrat la fiecare provider (format: https://<supabase-project-ref>.supabase.co/auth/v1/callback).
3. Dacă lipsește o pagină dedicată de login/signup (am văzut doar AuthPanel, care pare inline pe pagina de cont) și crezi că ar trebui o rută /login separată pentru UX, spune-mi înainte să o creezi — nu presupune că vreau asta.

Nu configura tu provideri externi (nu poți, e treaba mea din dashboard-uri), doar codul și checklist-ul.
```

---

## 3. Verificare din Screenshot nu funcționează

```
Verificarea prin screenshot dă mereu "Nu am detectat text în imagine" chiar și pe screenshot-uri foarte clare (am testat cu un screenshot de WhatsApp cu text alb pe fundal închis, perfect lizibil). Investighează, nu presupune care e cauza fără să citești codul întâi — dar iată ce am găsit deja:

1. src/app/api/ocr/route.ts, linia 3: importă `processImageOCR` direct din `@/lib/ocr/vision` — adică Google Cloud Vision direct. NU folosește dispatcher-ul unificat din src/lib/ocr/index.ts (funcția processOCR), care are logica de fallback OCR.space → Vision. Verifică dacă asta e intenționat sau o greșeală — dacă vrem fallback real, route.ts ar trebui să apeleze processOCR din './index', nu processImageOCR din './vision' direct.

2. Mismatch de nume de câmp: componenta client src/components/verify/VerifyTool/index.tsx (linia ~139) trimite body-ul ca `{ imageBase64: base64, mimeType: image.type }`, dar src/app/api/ocr/route.ts (linia ~34-35) citește `const { image, mimeType } = body;` — adică așteaptă câmpul `image`, nu `imageBase64`. Verifică dacă asta explică direct eroarea (imaginea ajunge undefined la server) și repară inconsistența dintre client și server — alege un singur nume de câmp și aplică-l peste tot (payload trimis + destructurare pe server + orice alt loc care mai trimite către /api/ocr).

3. reader.readAsDataURL(image) (VerifyTool/index.tsx linia ~133) produce un string cu prefix `data:image/...;base64,`. Verifică dacă acest prefix ajunge nemodificat până la Google Vision API (src/lib/ocr/vision.ts, linia 43: `image: { content: base64Image }`) — Vision API cere base64 PUR, fără prefixul data URI. Compară cu src/lib/ocr/ocr-space.ts (linia 43-45) care ADAUGĂ prefixul dacă lipsește, semn că restul codului tratează inconsecvent prezența/absența prefixului. Dacă prefixul ajunge la Vision fără să fie eliminat, asta ar explica de ce API-ul nu găsește text (decodare eșuată silențios → 0 annotations → NO_TEXT_FOUND), exact eroarea pe care o văd eu.

CE VREAU DE LA TINE:
- Confirmă cauza reală (poate fi una, mai multe, sau toate cele 3 de mai sus) urmărind exact ce se trimite request-by-request de la buton până la Vision/OCR.space.
- Repară punctul de rupere: numele câmpului payload, folosirea dispatcher-ului corect (processOCR vs processImageOCR), și normalizarea base64 (elimină prefixul data URI înainte de a trimite content către Vision, la fel cum ocr-space.ts normalizează în sens invers).
- Nu schimba providerul OCR implicit sau logica de fallback dacă nu e nevoie — doar repară bug-ul de conectare dintre client/server/provider.
- La final, spune-mi dacă GOOGLE_CLOUD_API_KEY și OCR_SPACE_API_KEY sunt configurate corect ca variabile de mediu (fără să-mi ceri sau afișezi valorile, doar confirmă că sunt citite din process.env unde trebuie).
```

---

## 4. Verificare din URL nu funcționează (claim = tot UI-ul site-ului, surse random, eroare pe știre reală)

```
Verificarea prin URL extrage tot conținutul paginii (meniuri, footer, etc.) în loc de textul articolului, iar apoi caută surse pentru acest "claim" garbage, ceea ce duce la rezultate complet irelevante și scoruri greșite (43% pe o știre reală despre incendii în Spania/Franța). Investighează, fără să presupui, dar iată ce am găsit deja:

CONTEXT — src/lib/verification/url-extract.ts, funcția extractArticleText (linia 39-114):
- Încearcă întâi să extragă paragrafe din tag-uri <p> (linia 92-98, regex paragraphRe), păstrând doar cele cu peste 60 caractere.
- DACĂ nu găsește niciun <p> valid (linia 100: `paragraphs.length` e 0), face fallback la STRIPAREA TUTUROR tagurilor din tot body-ul HTML (linia 102: `decodeEntities(body.replace(/<[^>]+>/g, ' '))...`), fără nicio distincție între navigare/meniu/footer și conținutul articolului propriu-zis.
- Pentru pagini renderizate client-side (React/Next, cum e cnn.com) sau cu conținut încărcat dinamic, HTML-ul brut primit de fetch() poate să nu conțină <p>-uri cu text real (sunt populate de JS după load), deci codul cade mereu pe fallback-ul "strip all tags", care produce exact ce am văzut eu: tot meniul CNN (Politics, Business, Sports, etc.) transformat în text și trimis ca "claim".
- Nu există nicio verificare de calitate/densitate a textului extras înainte de a-l accepta — doar un prag minim de 40 caractere (linia 106), care e mult prea permisiv pentru text de navigare (care e de obicei foarte lung).

CE VREAU DE LA TINE:
1. Repară extracția: prioritizează tag-uri semantice de conținut (<article>, <main>, elemente cu og:description / meta description, sau JSON-LD de tip Article/NewsArticle dacă există în <script type="application/ld+json">) înainte de a recurge la <p> generic sau la strip-all-tags.
2. Adaugă o verificare de plauzibilitate înainte de a accepta textul extras ca "claim" — de exemplu, dacă textul conține un număr mare de cuvinte tipice de navigare (Sign in, Subscribe, Newsletters, Politics, Sports, etc. repetate) sau nu are propoziții coerente, tratează-l ca eșec de extracție (aruncă UrlExtractionError cu codul NO_CONTENT) în loc să continui cu garbage — mai bine o eroare clară userului ("nu am putut extrage articolul, încearcă să lipești textul manual") decât un rezultat garantat greșit.
3. Dacă fallback-ul "strip all tags" rămâne ca ultimă soluție, cel puțin limitează-l la un container plauzibil de conținut (ex. caută <body> minus <header>/<nav>/<footer>/<aside>, nu tot documentul).
4. Pentru cazul cu eroarea 43% pe o știre reală (Franța/Spania incendii): verifică dacă odată reparată extracția, layer2/layer3 mai întorc rezultate random — dacă da, e legat de problema de relevanță din promptul #1 de mai sus (nu o rezolva aici din nou, doar semnalează-mi dacă vezi aceeași cauză).

Nu schimba complet strategia de fetch (redirect/timeout/User-Agent din linia 46-54) dacă nu e nevoie — problema e în partea de parsare a HTML-ului, nu în fetch în sine.
```

---

**Recomandare de ordine**: aș începe cu #3 (screenshot) — pare cel mai izolat și rapid de confirmat/reparat (mismatch de nume de câmp e o linie) — apoi #4 (URL), apoi #1 (algoritm, cel mai mare efort), apoi #2 (checklist de configurare, nu cod).
