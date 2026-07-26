# Brief pentru agent Claude Code — Redesign complet cu pluginul `impeccable`

> Acesta este un prompt de handoff către o sesiune NOUĂ de Claude Code (alt agent,
> alt calculator/sesiune unde `/plugin` funcționează — pluginul nu poate fi
> instalat peste Remote Control). Copiază tot conținutul de mai jos ca prompt
> inițial pentru acel agent.

---

## Rolul tău în această sesiune

Ești un agent Claude Code care preia proiectul **Verifact** de la o sesiune
anterioară. Sarcina ta: un **redesign vizual complet**, folosind în mod
obligatoriu pluginul **`impeccable`** (marketplace: `pbakaus/impeccable`) ca
instrument de audit anti-"AI slop" pe parcursul întregului proces, nu doar la
final.

**Nu ești primul agent pe acest proiect.** S-a mai lucrat substanțial la design
și la algoritmul de verificare. Citește secțiunea "Ce există deja" înainte să
schimbi orice — riscul real este să reinventezi prost ceva deja construit bine,
sau să strici o soluție la o problemă pe care nici nu știi că a existat.

---

## Ce este Verifact — contextul produsului

Aplicație web open-source de verificare a informației (fact-checking),
construită pentru piața din România, cu extindere ulterioară în UE. Utilizatorul
trimite o afirmație (text, screenshot, sau URL către un articol), iar aplicația
o verifică folosind AI + surse publice reale, și întoarce un raport cu verdict,
scor de certitudine și sursele exacte folosite.

**Miza produsului, de ce contează designul enorm de mult:**
Acesta e un produs care cere oamenilor să aibă încredere în ce le spune despre
ce e adevărat și ce nu. Dacă interfața arată ca un "AI startup" generic sau —
și mai rău — dacă transmite chiar și aparența unei preferințe politice sau
ideologice, întregul produs își pierde credibilitatea, indiferent cât de bun e
algoritmul dedesubt. Designul NU e cosmetică aici — e parte din promisiunea de
încredere a produsului.

### Valori pe care designul trebuie să le transmită vizual (obligatoriu, nenegociabil)

1. **Siguranță și seriozitate** — tonul unei redacții serioase (NYT, Reuters,
   Bloomberg), nu al unui startup AI cu gradient mov.
2. **Integritate și transparență** — sursele sunt mereu vizibile, verdictul nu
   e ascuns în spatele unui badge strident; totul poate fi verificat de
   utilizator.
3. **Neutralitate politică absolută** — zero indicii vizuale sau de conținut
   care ar putea fi citite ca aliniere politică/ideologică. Asta include:
   culori care nu evocă un partid sau altul, exemple de afirmații verificate
   care NU sunt teme politice fierbinți/partizane (preferă exemple
   științifice, istorice, de sănătate publică bine stabilite — nu alegeri,
   nu politicieni în funcție, nu subiecte de campanie), și un ton complet
   descriptiv/probabilistic, niciodată polemic.
4. **Încredere prin restrângere** — puțină culoare, folosită cu sens (nu
   decorativ), tipografie cu autoritate, spațiu alb intențional. "Disciplină
   vizuală", nu "expresivitate".

---

## Ce există deja — NU reinventa de la zero

### 1. Design system-ul (deja construit, documentat în `DESIGN.md`)

Un sistem editorial complet a fost implementat într-o sesiune anterioară, ca
răspuns direct la exact acest tip de cerință (siguranță/integritate/neutralitate).
Pe scurt:

- **Paletă**: aproape exclusiv negru pe alb (`--color-ink #0a0a0a` /
  `--color-paper #ffffff`), cu **roșu** (`#dc2626`) ca UNIC accent, folosit
  STRICT punctual — eyebrow labels, underline pe tab-ul activ, bara verticală
  a unui callout/citat, verdictul "fals". Zero gradient, zero albastru/mov
  generic de AI startup.
- **Tipografie**: titluri în **Newsreader** (serif, editorial), body/nav/labels
  în **IBM Plex Sans**. Contrast real de ierarhie, nu doar mărimi diferite ale
  aceluiași font.
- **Spacing**: scală pe bază de 4px.
- **Geometrie**: colțuri aproape drepte (radius maxim 2px — NU pill/rotund).
  Separatoare = linii de 1px, NU shadow-uri sau carduri rotunjite cu umbră.
- **Componente**: `Button` (negru, uppercase, letter-spacing, unghiuri drepte),
  `Tabs` (text simplu + underline roșu pe activ), `Callout` (bară verticală
  roșie, stil citat editorial), `VerdictLabel` (verdict + scor ca TEXT
  structurat, NU badge/pill colorat), `Card`, `Input`/`Textarea`, `Modal`.
- **Iconografie**: NU emoji nicăieri. Nav-ul e text simplu, fără iconițe.

**Citește `DESIGN.md` din rădăcina proiectului înainte de orice — documentează
exact tokenii, componentele și motivația fiecărei decizii.** Dacă propui o
direcție nouă radical diferită, trebuie să fie o îmbunătățire conștientă față
de asta, nu o pierdere accidentală a deciziilor deja luate.

### 2. Rutele existente

`/` (homepage cu unealta reală de verificare), `/cont` (login/signup),
`/preturi` (pricing: Free / Pro €7,99/lună / Business €49/lună),
`/misiune` (despre/misiune), `/open-source` (open source + confidențialitate,
combinate deliberat pe aceeași pagină), `/rapoarte` (istoric/rapoarte
publice), `/transparenta` (metodologie de verificare — separată deliberat de
`/open-source`: una explică METODA, cealaltă explică GUVERNANȚA ȘI DATELE).

### 3. Stack tehnic

Next.js 14 (App Router) + TypeScript strict + CSS Modules (nu Tailwind).
Supabase (Postgres + Auth). Fonturi via `next/font/google`. Branding: numele
de produs confirmat cu proprietarul este **Verifact** (era `AI Fact-Checker`
anterior — schimbat peste tot: wordmark, `<title>`, meta tags, footer,
README, PRD).

### 4. Algoritmul de verificare (backend) — status, ca să știi ce NU trebuie atins

**Nu atinge logica de business/algoritmul de verificare. Doar UI/UX, conținut
de pagină, structură de rute — la fel ca sesiunile anterioare.**

Context util (nu acțiune cerută ție): pipeline-ul are 4 straturi de căutare
(Google Fact Check Tools, NewsAPI+Tavily, surse oficiale via Tavily, social/X)
plus un strat de evaluare AI (Gemini 2.0 Flash), combinate într-un scor
ponderat. **Momentan cheia Gemini are creditele de billing epuizate** (orice
model întoarce 429 "prepayment credits are depleted") — asta blochează
componenta AI a scorului și analiza narativă; proprietarul trebuie să
reactiveze billing-ul în Google AI Studio. Există și un bug de RLS
(recursion infinită pe policy-ul tabelei `profiles` în Supabase) care rupe
citirile pentru utilizatori logați — e o problemă de backend/DB, nu de UI.
Nu e treaba ta să repari niciuna dintre acestea, dar să nu presupui că
funcționalitatea de verificare e complet stabilă atunci când testezi vizual
fluxul — poate întoarce erori sau rapoarte parțiale, iar UI-ul trebuie să le
afișeze decent (există deja stări de "analiză parțială"/eroare în
`ReportView`/`VerifyTool` — verifică-le, nu le rescrie fără motiv).

---

## Constrângeri de mediu — citește înainte să rulezi comenzi

Mașina pe care rulează proiectul are frecvent **RAM și spațiu pe disc foarte
limitate** (uneori sub 0.5 GB liber pe disc, sub 2-3 GB RAM liberă). Asta a
cauzat anterior: crash-uri OOM ale serverului de dev, cache-uri `.next`
corupte, eșecul instalării de browsere Playwright (ENOSPC). Recomandări:

- Verifică spațiul liber (`Get-PSDrive C`) și RAM liberă
  (`Get-CimInstance Win32_OperatingSystem`) înainte de instalări mari.
- Preferă `npx impeccable` (rulare ad-hoc, nu adaugă dependențe permanente)
  în locul instalării de pachete grele dacă nu e nevoie.
- Dacă serverul de dev crapă sau rutele întorc erori ciudate de tip
  "module not found", suspectează întâi cache `.next` corupt sau spațiu
  epuizat, nu presupune direct un bug de cod — șterge `.next` și repornește
  curat înainte de a diagnostica mai departe.
- Dacă un test are nevoie de browser real, verifică întâi dacă Playwright
  poate folosi Edge/Chrome deja instalat pe mașină
  (`chromium.launch({ channel: 'msedge' })`) înainte să încerci să descarci
  un binar nou de Chromium — descărcarea a eșuat anterior din lipsă de spațiu.

---

## Ce trebuie să faci obligatoriu

1. **Instalează și rulează `impeccable`** (marketplace `pbakaus/impeccable`,
   sau `npx impeccable detect`) la începutul sesiunii și după fiecare
   schimbare majoră de pagină/componentă — nu doar la final. Raportează
   explicit output-ul lui în fiecare etapă, inclusiv dacă respingi un
   finding (spune de ce).
2. **Citește `DESIGN.md` și componentele din `src/components/ui`,
   `src/components/layout`, `src/components/verify` înainte să propui
   orice.** Nu re-stiliza ad-hoc pagină cu pagină.
3. **Propune 2-3 direcții concrete înainte să implementezi peste tot.**
   Nu te limita la impresia ta — arată-mi exemple (poate fi: capturi de
   ecran/mockup-uri ale unor variante de hero, sau o pagină de referință
   restilizată complet ca demo, sau o comparație explicită "așa arată acum
   vs. așa aș propune") și lasă-mă să aleg direcția înainte de a aplica
   peste toate paginile. Asta a fost exact procesul care a funcționat bine
   în sesiunile anterioare — cere aprobare la deciziile mari de brand/direcție,
   nu doar la implementare tehnică.
4. Verifică la fiecare pagină: responsive (375/768/1024/1440px), contrast
   WCAG AA (minim 4.5:1 text normal, 3:1 text mare), zero emoji, zero
   badge/pill colorat rotunjit, font serif pe titluri vizibil diferit de
   restul textului, zero conținut placeholder/lorem ipsum.
5. Commit-uri mici, incrementale, per componentă/pagină — nu un commit uriaș
   la final.
6. **Verifică din nou, explicit, cele patru valori de brand** (siguranță,
   integritate, neutralitate politică, încredere) la fiecare pagină nouă sau
   restilizată — inclusiv orice exemplu/conținut ilustrativ pe care îl scrii
   tu (ex. afirmații demo pentru unealta de verificare) trebuie să respecte
   neutralitatea politică.

## Ce NU trebuie să faci

- Nu atinge algoritmul de verificare, scoring-ul, integrările AI/API din
  `src/lib/verification`, `src/lib/ai` — doar UI/UX.
- Nu introduce gradient-uri, culori albastru/mov generice de AI startup,
  emoji ca iconografie, badge-uri/pill-uri colorate rotunjite pentru
  verdict/scor, animații "bouncy".
- Nu inventa nume de brand nou sau conținut de business (prețuri, misiune)
  fără să verifici mai întâi ce există deja în `docs/PRD.md` și paginile
  curente.
- Nu declara "gata" pe baza impresiei tale — rulează `impeccable`, verifică
  checklist-ul de mai sus explicit, pagină cu pagină.

---

## Cum să începi

1. Rulează `npx impeccable detect src` (sau echivalentul din plugin) ca
   prim audit și raportează output-ul.
2. Citește `DESIGN.md`, `docs/PRD.md`, și fă un tur rapid al rutelor
   existente (pornește `npm run dev`, verifică fiecare pagină).
3. Vino cu 2-3 propuneri concrete de direcție/rafinament (nu de la zero —
   pornind din ce există) și cere-mi să aleg una înainte să implementezi
   peste tot.
4. După aprobare, aplică incremental, cu verificare `impeccable` +
   checklist la fiecare pagină, commit-uri mici.
5. La final, raport clar: ce ai schimbat, output `impeccable` înainte/după,
   ce rămâne netestat sau necesită decizie de la mine.
