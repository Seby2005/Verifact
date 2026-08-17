# Plan editorial 7 zile · 17–24 august 2026

Ritm: **2 TikTok-uri + 2 Reels pe zi** (opțional un al 3-lea TikTok din scripturile de reel).
Fiecare zi = **1 fact-check „principal"** (unul din cele 4 template-uri cerute) + **1 „extra/joc"** (alt format).
Reels-urile **refolosesc** conținutul verificat al zilei — zero fact-checking în plus.

Slide-urile randate sunt în subfolderele `d{N}-...`/`slide_*.png`, cu `caption.txt` gata de copiat.

---

## Calendar

| Zi | Fact-check principal (TikTok 1) | Format | Extra / joc (TikTok 2) | Format |
|----|--------------------------------|--------|------------------------|--------|
| **1 · Lu 17** | Hantavirusul e „COVID-26 făcut în laborator" — **FALS** | `verdictStamp` | Dosar: cum recunoști un deepfake cu Musk/crypto | `analizaFoto` 🖼️ |
| **2 · Ma 18** | „Pe vremea lui Ceaușescu se trăia mai bine" — **FALS** | `tacereTipografica` | Autobuzele Bacău „cu ușile pe dos" — mit vs. adevăr | `mitAdevar` 🖼️ |
| **3 · Mi 19** | App-ul UE de verificare a vârstei = „supraveghere" — **FALS** | `terminal` | 5 semne că o poză e făcută cu AI (ghid + joc) | `explainer` |
| **4 · Jo 20** | „România — singura țară comunistă cu raționalizare" — **FALS** | `stampilaArhiva` | $1,1 mld pierduți în 2025 din deepfake-uri | `statistica` |
| **5 · Vi 21** | „Nu e secetă — uite, Oltul are apă" — **FALS** | `verdictStamp` | Poza asta „dovedește" seceta? (context lipsă) | `fotoBanda` 🖼️ |
| **6 · Sâ 22** | „Dunărea e la nivel normal în 2026" — **FALS** | `tacereTipografica` | Grafic: cât ne costă fraudele cu AI (Deloitte) | `graficTrend` |
| **7 · Du 23** | „România va intra în război în septembrie" — **FALS** | `terminal` | Manifest: de ce Verifact (postare de **pin**) | `manifest` |

> Ziua 8 (Lu 24) = tampon: reposti cel mai bun clip al săptămânii + lansezi săptămâna următoare.

🖼️ = conține deja o imagine reală (domeniu public, inclusă în folder).

---

## Reels (2/zi) — maparea

Reel-urile sunt **video scurt (12–20s)** peste slide-urile deja randate: pan/zoom lent (Ken Burns) pe cele 3 imagini + text mare pe ecran + voce sau sunet în trend.

- **Reel A (zilnic):** fact-check-ul principal al zilei ca video (claim → „ghicește" → verdict + sursă).
- **Reel B (zilnic):** extra-ul zilei ca video, SAU unul din cele 3 scripturi dedicate de mai jos (le rotești).

### Script 1 — „Ghici scorul de veridicitate" (~15s)
1. `0–4s` — Text mare: afirmația zilei (ex. „Hantavirusul e COVID-26"). Voce: *„Cât de adevărat e asta, de la 0 la 100?"*
2. `4–8s` — Ecran cu bară 0–100 care pulsează. *„Pune un număr în comentarii… acum."*
3. `8–15s` — Reveal: scorul Verifact + o singură sursă (ex. „9% · EDMO"). *„Verifici orice pe verifact.ro."*

### Script 2 — „Adevărat sau Spin?" (~18s) — funcția-vedetă Verifact
1. `0–5s` — Un titlu **tehnic adevărat, dar înșelător** (ex. o cifră reală scoasă din context). *„Ăsta e adevărat… sau doar sună a adevăr?"*
2. `5–12s` — Separi: ce e real (verde) vs. ce e spin (roșu). *„Postarea nu minte — te lasă să tragi tu concluzia greșită."*
3. `12–18s` — *„Verifact separă faptul de spin. Lipești un screenshot, primești contextul."*

### Script 3 — „3 semne de deepfake în 15 secunde" (~15s)
Quickfire din ghidul zilei 3: mâini/degete → text mototolit → fundal care „curge". Fiecare 4s, tăieturi rapide. Închizi cu: *„La al 4-lea semn te-ai prins? Verifică imaginea pe verifact.ro."*

---

## Ore de postare (public RO)

- **TikTok 1 (fact-check):** ~13:00 (pauza de prânz).
- **TikTok 2 (extra/joc):** ~19:30–21:00 (prime-time seară).
- **Reels:** 12:00 și 20:00. Nu posta cele două reels la mai puțin de ~3h distanță.
- Postarea de **pin** (ziua 7, manifest) — fixeaz-o prima pe profil după ce o publici.

---

## Imagini incluse (toate domeniu public)

Toate cele patru postări cu imagine au deja poza inclusă în folder, liberă de drepturi:

- **Ziua 1** (`analizaFoto`) — portret Musk · U.S. Air Force (domeniu public).
- **Ziua 2** (`mitAdevar`) — autobuz UK (Routemaster, Londra) · Wikimedia (domeniu public), exemplu ilustrativ.
- **Ziua 5** (`fotoBanda`) — albie/lac secat · domeniu public, exemplu (fix genul de imagine decontextualizată despre care e postarea).

Ca să schimbi o imagine: înlocuiește fișierul (`musk.jpg` / `autobuz.jpg` / `seceta.jpg`) din folderul postării și rulează `node scripts/marketing/render_plan.mjs`.

## De rezolvat înainte de post

1. **Link în bio:** pe TikTok/Instagram linkul din caption nu e clicabil → e trimis automat spre „link în bio". Verifică bio = `verifact.ro`.
2. **Ștampila de arhivă (ziua 4):** implementată exact după designul 3b din `Formate TikTok.dc.html` (dosar pe hârtie, ștampilă rotită de verdict). Gata de post.

---

## Surse (toate fact-check-urile, verificabile)

- **Hantavirus:** EDMO, Euronews, France 24, Forbes, KFF — mai 2026 (focar MV Hondius, Argentina→Tenerife).
- **App UE verificare vârstă:** EUvsDisinfo („conspiracy theory not backed by any evidence"), Comisia Europeană, cybernews — apr. 2026.
- **Ceaușescu / raționalizare / Olt-secetă / Dunărea / autobuze Bacău:** Factual.ro (fact-checker terț Meta).
- **„Război în septembrie":** Europa Liberă (retrospectivă fake news), Factual.ro.
- **Deepfake (statistică + grafic):** Surfshark, Deloitte — Center for Financial Services (proiecție $40 mld SUA până în 2027, de la $12,3 mld în 2023).

> Regula de aur păstrată din generator: scorul se potrivește cu verdictul (`≥85 adevărat · 60–84 parțial · 40–59 neclar · <40 fals`) și nicio sursă nu e inventată.
