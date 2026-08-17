# Verifact — Sistem de content organic (TikTok / Reels / feed)

Ghidul de lucru pentru postări faceless de consum rapid. Înlocuiește, ca sursă de adevăr,
documentele mai vechi din acest folder (vezi §8). Design-ul e implementat în cod, nu doar descris.

- **Design de referință** (Claude Design): proiectul „Design format pentru combaterea dezinformării”, fișier `Formate TikTok.dc.html`.
- **Generator**: [`scripts/marketing/generate_slides.mjs`](../../scripts/marketing/generate_slides.mjs)
- **Conținut editabil**: [`scripts/marketing/content/posts.mjs`](../../scripts/marketing/content/posts.mjs)
- **Output**: `public/marketing/verifact/<format>/<id>/slide_N.png` + `caption.txt`

---

## 1. Principiul (de ce arată altfel decât „AI slop”)

Trei reguli țin tot sistemul coerent. Dacă respecți doar astea, arăți ca un brand editorial, nu ca un template:

1. **Culoarea înseamnă un singur lucru — verdictul.** Verde = adevărat, chihlimbar = parțial, ardezie = neclar, roșu = fals. Nimic altceva nu e colorat „ca să fie”. Restul e hârtie (`#fbfbf9`) și cerneală (`#16181c`).
2. **Tipografie editorială.** Fraunces (afirmații/titluri), Hanken Grotesk (verdict/body), JetBrains Mono (scoruri/etichete). Fără emoji în design; emoji doar, cu măsură, în caption.
3. **Un slide = o idee.** Primul slide livrează cârligul în < 1 secundă. Fără paragrafe pe cover.

> Scorul se afișează MEREU ca text mono și trebuie să corespundă verdictului real Verifact:
> `≥85 adevărat · 60–84 parțial · 40–59 neclar · <40 fals`. Nu inventa scoruri.

---

## 2. Cum produci o postare (5 minute)

```bash
node scripts/marketing/generate_slides.mjs
```

1. Deschizi `content/posts.mjs`, copiezi un obiect existent din același `format`.
2. Schimbi textul (afirmație, verdict, scor, surse, caption, sound).
3. Rulezi comanda. Iese folderul postării cu `slide_1..N.png` + `caption.txt`.
4. Încarci în PostClaw: imaginile ca slideshow, `caption.txt` ca descriere + hashtag + sunet.

Fonturile se încarcă din Google Fonts la randare — prima rulare poate cere `npx playwright install chromium`.

---

## 3. Cele 7 formate → pentru ce le folosești

| Format (id în cod) | Pentru | Cârlig tipic | Foto? |
|---|---|---|---|
| **verdictStamp** (`verdictStamp`) | debunk viral, citat verificat, afirmație cu verdict | afirmația mare + verdict roșu | nu |
| **Foto + bandă** (`fotoBanda`) | actualitate cu verdict + sursă | foto full-bleed + titlu de știre | **da** (1 poză orizontală) |
| **Mit vs Adevăr** (`mitAdevar`) | sănătate / lifestyle, binar | split roșu tăiat / verde | nu |
| **Barometrul** (`barometru`) | datele TALE săptămânale (dashboard) | număr mono uriaș | nu |
| **Explainer** (`explainer`) | educativ „3 semne că…” | număr Fraunces uriaș | nu |
| **Analiză foto** (`analizaFoto`) | real vs AI / deepfake | screenshot cu adnotări roșii | **da** (imaginea demontată) |
| **Statistică** (`statistica`) | un stat din research + sursă | un singur număr șoc + sursă | nu |

**Foto — ce și unde:** doar `fotoBanda` (cover, bandă sus ~1180px, poză luminoasă orizontală, liberă de drepturi — Unsplash/Pexels) și `analizaFoto` (în cadrul cu marcaje roșii pui exact screenshot-ul pe care îl demontezi). În rest, zero poze — tipografia e imaginea. Placeholder-ul `[ FOTO: … ]` din câmpul `photo` îl înlocuiești în editor/PostClaw.

---

## 4. Reguli de consum RAPID (TikTok / IG / FB)

Publicul de aici derulează, nu studiază. Fiecare postare trebuie să funcționeze cu sunetul oprit și în 3 secunde.

- **Cârlig pe slide 1, nu introducere.** Afirmația sau numărul, direct. Verdictul apare tot pe slide 1 la `verdictStamp` (tensiune, nu suspans lung).
- **≤ 6–8 cuvinte pe titlul de cover.** Dacă nu încape, e două idei — sparge-le.
- **Contrast, nu explicație.** „Titlul spune X. Legea spune Y.” bate un paragraf.
- **Numărul mare = eroul** la statistică/barometru. Textul explică numărul, nu invers.
- **Sursa vizibilă** pe slide-ul de stat (crește salvările — oamenii salvează ca „dovadă”).
- **CTA de acțiune, nu de vânzare.** „Nu da mai departe până nu verifici” > „abonează-te acum”. Slide-ul final e mereu marca Verifact pe fundal închis.
- **Primul comentariu = sursa completă** (link + citare). Ține slide-ul curat, mută detaliile în comentariu.
- **3–4 cuvinte de caption înainte de „…more”** decid dacă se deschide. Pune cârligul acolo, nu hashtag-urile.

---

## 5. Vocea Verifact (brand-review)

**Personalitate:** un redactor calm care îți arată dovada și te lasă pe tine să tragi concluzia. Nu ridică vocea, nu-ți spune pe cine să votezi, nu se bucură că „ai fost păcălit”.

**4 atribute (we are / we are not):**

| Atribut | Suntem | NU suntem |
|---|---|---|
| **Sobri** | preciși, editoriali, lăsăm faptele să vorbească | senzaționaliști, cu majuscule și „ȘOCANT” |
| **Neutri** | arătăm sursa, nu tabăra | politici, moralizatori, „noi vs ei” |
| **Clari** | pe limba oricui, fără jargon | simpliști sau condescendenți |
| **Onești cu incertitudinea** | „neclar / încă în verificare” când e cazul | falsă certitudine 100% |

**Sună așa:** „Titlul spune «interzice». Legea spune «nu mai vinde noi». Diferența = tot.”
**NU sună așa:** „ATENȚIE! Ți-au ASCUNS adevărul — vezi până nu se șterge!”

**Legal / compliance (verifică mereu, faceless nu te scutește):**
- Sănătate/bani: informează, nu da sfat medical/financiar personalizat. Fără „vindecă”, „profit garantat”.
- Fără superlative nesusținute („cel mai rapid”, „singurul”) fără cifră în spate.
- **Sursă obligatorie** pe orice statistică. Marchează „expunere percepută” vs „verificat” — nu le confunda.
- Nu reproduce integral imaginea unei redacții/persoane; la `analizaFoto` marchezi clar că e materialul analizat.
- Persoane publice: citează documentul/înregistrarea, nu interpretarea ta.

---

## 6. Pipeline de surse de research (de unde tragi constant)

Aici e motorul pentru postările de statistici. Regula: **un număr → un slide → o sursă citată + link în primul comentariu.** Verifică întotdeauna cifra la sursa primară înainte de a o pune pe slide.

**Rapoarte mari (repostezi la lansare + reciclezi tot anul):**
- **Reuters Institute — Digital News Report** (anual, iunie): încredere, îngrijorare „ce e real online”, defalcat pe platforme și țări. *(ex. folosit: 59% îngrijorați; neîncrederea maximă pe TikTok & X.)*
- **Eurobarometru / Comisia Europeană** (Kantar): expunere la dezinformare, alfabetizare media, încredere în media — cu defalcare pe România. *(ex.: RO 55% expunere percepută în 7 zile; 62% cred că recunosc dezinformarea.)*
- **EDMO — European Digital Media Observatory**: brief lunar de dezinformare (teme dominante în UE/RO), agregare de fact-check-uri. Ideal pentru „tema lunii”.
- **Ofcom / Pew Research**: context media literacy (UK/US) — bun pentru framing global.

**Fact-check zilnic/săptămânal (materie primă pentru `verdictStamp` și `analizaFoto`):**
- **Factual.ro, Veridica.ro, Funky Citizens, ActiveWatch** (România).
- **AFP Factuel, Reuters Fact Check, Full Fact, PolitiFact** (internațional).
- **Poynter / IFCN & MediaWise**: rețeaua globală de fact-checking, tendințe.

**Investigații & deepfake/AI:**
- **EU DisinfoLab**, **DFRLab (Atlantic Council)**: campanii de dezinformare documentate.
- **Harvard Misinformation Review (HKS)**: studii academice — un stat academic = autoritate mare.
- **Rapoarte de transparență Meta/Google/TikTok**, **WHO „infodemic”** (sănătate).

**Cadență de mining:** 30 min/săptămână — deschizi EDMO (brief lună) + un fact-check RO recent + un stat dintr-un raport mare. Din astea trei ies 3 postări (statistica + verdictStamp + explainer).

---

## 7. Cadență săptămânală (campaign-plan)

**Obiectiv (SMART):** awareness → salvări & follows. KPI primar: **rata de salvare** (proxy pentru „content de reținut”). Secundare: watch-time slide 1→2 (retenția cârligului), share-uri, follows/1k views, click-uri bio.

**Ritm sustenabil (4–5 postări/săpt., faceless, 100% din generator):**

| Zi | Format | Sursă |
|---|---|---|
| Luni | `verdictStamp` | fact-check RO recent (Factual/Veridica) |
| Marți | `statistica` | un raport mare (Reuters Institute / Eurobarometru / EDMO) |
| Miercuri | `explainer` | evergreen educativ (semne, tehnici de manipulare) |
| Joi | `analizaFoto` **sau** `mitAdevar` | imagine AI virală / mit de sănătate |
| Vineri | `barometru` | datele tale reale din dashboard |
| — | 20% liber | reactiv la ce devine viral în săptămâna aia |

**Regulă de aur pentru scală:** 1 subiect verificat → 3 formate. Un debunk devine `verdictStamp` (TikTok/Reels 9:16), aceleași fapte devin `mitAdevar` (feed) și un `statistica` dacă are un număr. Nu porni de la zero de fiecare dată.

**Riscuri & mitigare:**
- *Cifre greșite* → verifici la sursa primară + „percepută vs verificat”; sursa pe slide.
- *Percepție de părtinire* → format identic pentru toate taberele; arăți documentul, nu opinia.
- *Oboseală de format* → 7 sisteme rotite; cârlig nou de fiecare dată, chiar dacă șablonul se repetă.

---

## 8. Automatizare — UN slideshow / rulare (`make_tiktok.mjs`)

Algoritmul principal: face **un singur slideshow TikTok** dintr-un fact-check popular, cu verdict — și alege singur template-ul.

```bash
node --env-file=.env.local scripts/marketing/make_tiktok.mjs                       # random
node --env-file=.env.local scripts/marketing/make_tiktok.mjs "zidul chinezesc"     # temă anume
node --env-file=.env.local scripts/marketing/make_tiktok.mjs --template terminal    # forțează template
```

- **Bazin:** fact-check-uri **RO recente** (Google Fact Check API) + **evergreen** (mituri clasice curate în script, cu surse reale). RO prioritar; internaționalul evergreen e tradus deja în RO.
- **Template rotit** dintre 4: `verdictStamp` · `tacereTipografica` · `terminal` · `mitAdevar` (ultimul doar la verdict „fals”). Ordinea nu contează — se alege aleator.
- **Adevărul:** verdict + scor din sursă (evergreen fix; recent din rating). OpenRouter (`DEFAULT_AI_PROVIDER`) doar formulează textul RO.
- **Poartă de aprobare:** iese în `public/marketing/_drafts/<id>/` cu marcaj `⚠ DRAFT` + sursă în caption. Verifici 30 sec → muți în `tiktok/` → postezi. Deduplicare: `.drafted_tiktok.json`.
- Variantă lot (mai multe deodată, tot din API): `draft_from_factcheck.mjs` (secundar).

**Limită onestă:** dacă rating-ul unui fact-check recent nu e recunoscut, verdictul cade pe **„Neclar 50%”** (sigur — nu declară „fals” din greșeală). De-aia aprobarea umană rămâne obligatorie.

---

## 9. Ce fac cu documentele vechi

`CONTENT_STRATEGY.md`, `TIKTOK_SLIDESHOWS_COLLECTION.md`, `FACELESS_VIDEO_SCRIPTS.md`,
`DATA_STORYTELLING_AND_METRICS.md`, `AI_PROMPT_STUDIO.md`, `FACELESS_MARKETING_PLAYBOOK.md`
sunt din iterația veche (design „GenȘtiri”, emoji-heavy, scoruri inventate). **Ideile de subiecte** de acolo rămân utile ca listă de teme; **execuția vizuală și scorurile** sunt depășite de acest playbook + generator. Recomandare: le muți într-un subfolder `docs/marketing/_arhiva/` sau le ștergi. Spune-mi și le arhivez eu.
