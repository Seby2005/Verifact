# Ghid pentru Contribuitori — Fact-Checker AI

Îți mulțumim pentru interesul acordat dezvoltării proiectului **Fact-Checker AI**! Aplicația este open source și încurajează contribuțiile din partea comunității.

---

## 1. Reguli de Cod (Code Conventions)

1. **TypeScript strict**: Proiectul folosește `strict: true` în `tsconfig.json`. NICIUN tip `any` nu este permis.
2. **CSS Modules**: Stilurile componente de UI se scriu exclusiv folosind CSS Modules (`.module.css`). Nu folosiți Tailwind CSS sau Styled Components.
3. **Limba română**: Toate textele din interfața utilizatorului sunt scrise în română.
4. **Fără `console.log`**: Folosiți `console.error` doar pentru tratarea erorilor reale de producție.

---

## 2. Workflow Git & Branch Naming

Creați un branch separat pentru fiecare task:

```bash
feature/<nume-scurt-feature>   # ex: feature/add-custom-export-pdf
fix/<nume-scurt-fix>           # ex: fix/ocr-timeout-handling
docs/<nume-scurt-docs>         # ex: docs/update-readme-instructions
```

---

## 3. Formatul Commit-urilor (Conventional Commits)

Toate commit-urile trebuie să respecte convenția:

```
feat: adaugă export PDF pentru rapoarte
fix: corectează afișarea scorului pe mobil
docs: actualizează instructiunile de instalare
test: adaugă teste unitare pentru scoring
refactor: extrage logica de filtrare în utilitar separat
```

---

## 4. Rularea Verificărilor Înainte de PR

Înainte de deschiderea unui Pull Request, asigurați-vă că toate testele și verificările trec:

```bash
npm run type-check   # Verificare compilare TypeScript
npm run lint         # Verificare sintaxă ESLint
npm run test         # Teste unitare Jest
npm run build        # Build Next.js
```

---

## 5. Deschidere Pull Request (PR)

- Oferiți o descriere clară a modificărilor efectuate în PR.
- Asigurați-vă că build-ul automat GitHub Actions este verde (passing).
