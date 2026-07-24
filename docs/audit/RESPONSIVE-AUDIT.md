# Audit de Responsivitate / Responsive Design Audit

**Data:** 24 Iulie 2026  
**Lățimi testate:** 375px (Mobil), 768px (Tabletă), 1280px (Desktop)  
**Rute auditate:** `/`, `/pricing`, `/transparency`, `/reports`, `/login`, `/register`

---

## Tablou General Audit per Rută × Lățime

| Rută | 375px (Mobil) | 768px (Tabletă) | 1280px (Desktop) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`/` (Acasă)** | Butoane sub 44px; wrap neuniform la CTA | Suprapunere număr pas "01" peste titlu card | OK | ⚠️ Neconformități găsite |
| **`/pricing`** | Tabel cu celule înghesuite; toggle sub 44px | 3 carduri stivuite vertical gigant; th sticky sub Navbar | OK | ⚠️ Neconformități găsite |
| **`/transparency`** | Spațiere verticală excesivă sageti; overflow cod | Stivuire inutilă 1 col la statistici la 768px | OK | ⚠️ Neconformități găsite |
| **`/reports`** | Sticky filter bar blochează ecranul; paginare pe 3 rânduri | Sticky top (80px) se suprapune cu Navbar (64px) | OK | ⚠️ Neconformități găsite |
| **`/login`** | Inputs sub 44px touch target; checkbox arie mică | OK | OK | ⚠️ Neconformități găsite |
| **`/register`** | Grid criterii parolă (2 col) înghesuit pe 375px | OK | OK | ⚠️ Neconformități găsite |

---

## Detalii Probleme Concrete Identificate

### 1. Rută: `/` (Pagina Principală / Home)
- **375px (Mobil):**
  - **Dimensiune țintă atingere (Touch Target):** Butoanele `.primaryBtn` și `.secondaryBtn` din secțiunea de transparență și CTA au o înălțime de ~40px (sub recomandarea WCAG / Apple/Google de minim 44px).
  - **Wrap Butoane CTA:** În secțiunea hero și transparență, pe 375px butoanele se lățesc neuniform sau au margini inegale.
- **768px (Tabletă):**
  - **Suprapunere text/grafică:** În secțiunea `HowItWorks`, elementul `.stepNumber` (numerele gigant "01", "02", "03" cu `font-size: 5rem`) se suprapune vizual peste titlul cardului (`.cardTitle`) la o lățime de 768px când cardul are doar ~220px latime.

### 2. Rută: `/pricing` (Planuri & Preturi)
- **375px (Mobil):**
  - **Tabel de comparație:** Celulele tabelului (`.table th`, `.table td`) au `padding: 16px` fără o lățime minimă fixată pe coloane, ceea ce determină ruperea titlurilor coloanelor ("Caracteristică", "Gratuit", "Pro / Jurnalist") în cuvinte de 2-3 litere.
  - **Comutator lunar/anual:** Butoanele `.toggleBtn` au înălțimea de 36px (< 44px touch target).
- **768px (Tabletă):**
  - **Layout Carduri:** Grila `.cardsGrid` folosește 1 singură coloană până la 992px. Pe tabletă (768px), cardurile sunt stivuite vertical pe 736px lățime fiecare, ocupând excesiv de mult spațiu vertical. A fost recomandat un grid de 2 coloane sau ajustare responsive la 768px.
  - **Pozitionare Sticky Header Tabel:** În tabelul de comparație, `th { position: sticky; top: 0; }` se fixează la `top: 0`, intra sub Navbar-ul sticky (`height: 64px`, `z-index: 100`).

### 3. Rută: `/transparency` (Transparență Algoritm)
- **375px (Mobil):**
  - **Scroll Excesiv & Spațiere:** Săgețile de conectare `.arrowDown` dintre pașii algoritmului ocupă 24px + 20px padding fiecare, generând spații goale verticale mari pe mobil.
  - **Bloc Cod:** În secțiunea open-source, comanda `git clone https://github.com/Seby2005/fact-checker-ai.git` provoacă scroll orizontal intern în caseta de cod fără rupere de rând (wrap).
- **768px (Tabletă):**
  - **Statistici stivuite 1 col:** Grila `.statsGrid` trece la 1 coloană pe `@media (max-width: 1023px)`, ceea ce face ca pe o tabletă de 768px cele 3 carduri de statistici să fie stivuite vertical în loc să fie pe 3 coloane egale.

### 4. Rută: `/reports` (Rapoarte Publice)
- **375px (Mobil):**
  - **Bara de Filtrare Sticky:** În mobil, `.filterContainer` cu `position: sticky` și `top: 80px` ocupă aproape jumătate din ecran când toate input-urile se stivuiesc pe rânduri separate.
  - **Paginare:** Butoanele de paginare (`.pageButton`) se extind pe 3-4 rânduri pe mobil 375px când sunt 7+ pagini.
  - **Touch Targets:** Select-urile și butoanele de paginare au înălțime de 40px (< 44px).
- **768px (Tabletă):**
  - **Suprapunere Sticky Filter Bar:** `.filterContainer` are `top: 80px;`, dar Navbar-ul are `height: 64px`, creând o distanță ciudată sau suprapunere pe unele rezoluții de tabletă.

### 5. Rută: `/login` (Autentificare)
- **375px (Mobil):**
  - **Câmpuri Input & Touch Target:** Câmpurile `.input` au înălțime de 40px (necesită 44px).
  - **Arie de atingere Checkbox:** Opțiunea "Ține-mă minte" are un checkbox cu spațiu mic de atingere pe ecran mobil.

### 6. Rută: `/register` (Înregistrare)
- **375px (Mobil):**
  - **Grid Criterii Parolă:** `.criteriaList` are `grid-template-columns: 1fr 1fr`. Pe 375px mobil, textul "Un caracter special" se rupe pe 3 rânduri și se înghesuie violent cu coloana alăturată. Pe mobil < 480px trebuie trecut la 1 singură coloană.
  - **Touch Targets:** Câmpurile input au 40px înălțime (< 44px).

---

## Plan de Remediere Pas cu Pas (Commit-uri Separated per Rută)

1. **Pasul 1: Reparare Rută `/` (Home)** — Ajustare touch targets >= 44px, îmbunătățire responsive `HowItWorks` pas number position la 768px.
2. **Pasul 2: Reparare Rută `/pricing`** — Z-index & top offset sticky pentru tabel, min-width coloane tabel, 2 coloane pe tabletă (768px), touch target toggle 44px.
3. **Pasul 3: Reparare Rută `/transparency`** — Wrap cod, reducere gap săgeți pe mobil, 3 coloane statistici pe 768px.
4. **Pasul 4: Reparare Rută `/reports`** — Pozitionare sticky bar filtre top: 64px, paginare responsive compactă pe mobil, touch targets 44px.
5. **Pasul 5: Reparare Rută `/login`** — Touch targets câmpuri 44px, arie largă checkbox.
6. **Pasul 6: Reparare Rută `/register`** — Criterii parolă 1 coloană pe 375px, touch targets 44px.
