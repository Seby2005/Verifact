# Formbricks — survey / feedback self-hosted

## Ce face
Formbricks rulează micro-survey-uri in-app (feedback, NPS, onboarding) pe
segmente de utilizatori. În Verifact îl folosim pentru un formular scurt de
feedback pentru early users.

Integrare în cod: [`src/components/feedback/FeedbackWidget.tsx`](../../src/components/feedback/FeedbackWidget.tsx)
— încarcă SDK-ul UMD self-hosted prin `next/script`, **doar dacă** e configurat
(`NEXT_PUBLIC_FORMBRICKS_APP_URL` + `_ENVIRONMENT_ID`). Fără ele, nu randează
nimic. Montat în [`layout.tsx`](../../src/app/layout.tsx) ca no-op inofensiv.
`next.config.mjs` adaugă automat originea Formbricks în CSP (`script-src` +
`connect-src`), altfel browserul ar bloca scriptul.

## Cum se pornește
```bash
docker compose up -d formbricks
```
1. UI: http://localhost:3001 → creează cont + o organizație.
2. **Surveys → New** → creează un survey scurt de tip „App survey”.
3. Din **Project settings** copiază `environmentId` și URL-ul instanței.
4. În `.env.local`:
   ```
   NEXT_PUBLIC_FORMBRICKS_APP_URL=http://localhost:3001
   NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID=<environment-id>
   ```
5. Repornește `next dev`; widgetul se inițializează pe toate paginile.

> Notă versiune: apelul de init a variat între versiuni (`setup` pe 2.x, `init`
> pe versiuni vechi). Widgetul folosește `setup`; dacă instanța ta e mai veche,
> schimbă apelul în `FeedbackWidget.tsx`.

## Env vars
| Variabilă | Rol |
|---|---|
| `NEXT_PUBLIC_FORMBRICKS_APP_URL` | URL public al instanței (folosit și de widget, și de CSP) |
| `NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID` | environment-ul survey-urilor |
| `FORMBRICKS_PORT` | portul host (default 3001) |
| `FORMBRICKS_NEXTAUTH_SECRET`, `FORMBRICKS_ENCRYPTION_KEY`, `FORMBRICKS_CRON_SECRET` | secrete server (`openssl rand -hex 32`) |

Bază de date: `formbricks` în Postgres-ul comun.

## Licență & activitate (verificat 2026-08-06)
- **Licență: AGPL-3.0** (core) + director `/ee` sub licență comercială separată.
  GitHub raportează „Other” din cauza dual-licensing. ✅ Core-ul e OSI (AGPL,
  copyleft) — self-hosting-ul feature-urilor din core e liber.
- Activitate: ~12.730 ★, foarte activ.
- **Notă pentru finanțare:** feedback-ul utilizatorilor rămâne pe infra ta (nu la
  Typeform/Hotjar) — argument de privacy/GDPR. Atenție să folosești doar
  feature-urile din core AGPL, nu cele din `/ee`, dacă vrei să eviți termeni
  comerciali.
