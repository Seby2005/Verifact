# Contribuie la Verifact

Mulțumim pentru interesul de a contribui la Verifact! Acest ghid te va ajuta să începi.

## Cod de Conduită

Acest proiect urmează un standard de conduită bazat pe respect și profesionalism. Ne așteptăm ca toți contribuitorii să:

- Folosească un limbaj incluziv și respectuos
- Accepte criticile constructive cu deschidere
- Se concentreze pe ce este mai bine pentru comunitate
- Arate empatie față de ceilalți membri ai comunității

## Cum să contribui

### Raportează un bug

1. Verifică dacă bug-ul nu a fost deja raportat în [Issues](https://github.com/Seby2005/Verifact/issues)
2. Dacă nu, creează un issue nou cu:
   - Titlu descriptiv
   - Pași pentru reproducere
   - Comportamentul așteptat vs. cel real
   - Screenshot-uri (dacă e relevant)
   - Mediul (browser, OS, versiune Node.js)

### Propune o funcționalitate

1. Deschide un issue cu tag-ul `feature-request`
2. Descrie funcționalitatea, motivația și beneficiul pentru utilizatori
3. Așteaptă feedback de la maintaineri înainte de implementare

### Trimite un Pull Request

#### Setup local

```bash
# 1. Fork repository-ul pe GitHub

# 2. Clonează fork-ul tău
git clone https://github.com/<username>/Verifact.git
cd Verifact

# 3. Adaugă upstream remote
git remote add upstream https://github.com/Seby2005/Verifact.git

# 4. Instalează dependențele
npm install

# 5. Configurează variabilele de mediu
cp .env.example .env.local
# Editează .env.local cu valorile tale

# 6. Pornește serverul de dezvoltare
npm run dev
```

#### Workflow de dezvoltare

1. **Creează un branch din `dev`:**
   ```bash
   git checkout dev
   git pull upstream dev
   git checkout -b feature/<descriere-scurta>
   ```

2. **Implementează modificările** respectând regulile de cod:
   - TypeScript strict — fără `any`
   - CSS Modules — fără Tailwind sau alte librării de styling
   - Fiecare componentă React în propriul folder: `ComponentName/index.tsx` + `ComponentName.module.css`
   - Exporturi named, nu default (excepție: `page.tsx` și `layout.tsx`)

3. **Scrie teste** pentru funcționalitatea nouă:
   ```bash
   npm test
   ```

4. **Verifică că totul funcționează:**
   ```bash
   npm run type-check    # Verifică tipuri TypeScript
   npm run lint          # Verifică ESLint
   npm test              # Rulează testele
   npm run build         # Verifică build-ul
   ```

5. **Commit cu Conventional Commits:**
   ```bash
   git commit -m "feat: adaugă funcționalitate nouă"
   git commit -m "fix: corectează bug în componenta X"
   git commit -m "docs: actualizează documentația"
   git commit -m "test: adaugă teste pentru funcția Y"
   ```

6. **Push și deschide Pull Request:**
   ```bash
   git push origin feature/<descriere-scurta>
   ```
   Apoi deschide un PR pe GitHub către branch-ul `dev`.

#### Convenții de nume branch-uri

```
feature/<task-id>-<descriere>   # feature/s1-2-screenshot-upload
fix/<descriere>                  # fix/ocr-timeout-error
docs/<descriere>                 # docs/update-contributing
test/<descriere>                 # test/scoring-unit-tests
refactor/<descriere>             # refactor/extract-scoring-logic
```

## Structura Proiectului

```
src/
├── app/            # Next.js App Router (pagini și API routes)
├── components/     # Componente React reutilizabile
│   ├── ui/         # Componente primitive (Button, Input, Card)
│   ├── verify/     # Componente specifice verificării
│   ├── report/     # Componente pentru rapoarte
│   ├── layout/     # Layout-uri (Navbar, Footer)
│   └── dashboard/  # Componente dashboard
├── lib/            # Logică de business și utilități
│   ├── verification/  # Algoritmul de verificare
│   ├── ai/            # Client Gemini API
│   ├── ocr/           # Client Google Cloud Vision
│   ├── supabase/      # Clienți Supabase
│   └── utils/         # Utilități generale
├── hooks/          # React custom hooks
└── types/          # TypeScript type definitions
```

## Reguli de Cod

### TypeScript
- `strict: true` — obligatoriu
- Toate funcțiile publice au tipuri explicite pe parametri și return value
- Folosește `interface` pentru obiecte, `type` pentru unions/primitives

### CSS
- CSS Modules exclusiv (fișier `.module.css` lângă componentă)
- Variabile CSS definite în `globals.css`
- Mobile-first: stiluri mobile prima dată, apoi `@media (min-width: ...)`

### Teste
- Teste unitare în `tests/unit/`
- Teste E2E în `tests/e2e/`
- Descrie comportamentul, nu implementarea

## Întrebări?

Deschide un [issue](https://github.com/Seby2005/Verifact/issues) sau contactează-ne prin GitHub Discussions.

Mulțumim! 🙏
