# GlitchTip — error tracking self-hosted (compatibil Sentry)

## Ce face
GlitchTip captează erori din backend și frontend prin protocolul Sentry. Verifact
folosește deja SDK-ul `@sentry/nextjs`, deci GlitchTip este pur și simplu ținta
DSN — datele nu pleacă la sentry.io, rămân pe infra ta (sovereignty).

Wiring în cod:
- `sentry.server.config.ts`, `sentry.edge.config.ts`, `sentry.client.config.ts`
  — toate **DSN-gated**: fără DSN configurat, SDK-ul e inert (zero impact).
- [`src/instrumentation.ts`](../../src/instrumentation.ts) încarcă config-ul pe runtime-ul potrivit.
- [`src/app/global-error.tsx`](../../src/app/global-error.tsx) raportează erorile de render React.
- [`next.config.mjs`](../../next.config.mjs) adaugă automat originea DSN în CSP
  `connect-src` (altfel browserul ar bloca trimiterea evenimentelor).

## Cum se pornește
```bash
docker compose up -d glitchtip-web glitchtip-worker
```
Ordinea e gestionată: `glitchtip-migrate` rulează migrațiile o dată, apoi pornesc
web + worker.
1. UI: http://localhost:8000 → creează cont (înregistrarea e deschisă în dev).
2. Creează o organizație + un proiect (platform: Next.js) → copiază **DSN-ul**.
3. Pune-l în `.env.local`:
   ```
   NEXT_PUBLIC_SENTRY_DSN=http://<public-key>@localhost:8000/<project-id>
   SENTRY_DSN=http://<public-key>@localhost:8000/<project-id>
   ```
4. Repornește `next dev` și declanșează o eroare de test.

## Env vars
| Variabilă | Rol |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | DSN-ul proiectului GlitchTip (frontend/backend) |
| `SENTRY_TRACES_SAMPLE_RATE` | rata de tracing (default 0.1) |
| `GLITCHTIP_PORT` | portul host (default 8000) |
| `GLITCHTIP_SECRET_KEY` | secret Django (generează cu `openssl rand -hex 32`) |
| `GLITCHTIP_DOMAIN` | URL-ul public al instanței |
| `GLITCHTIP_EMAIL_URL` | config email (`consolemail://` în dev) |

Baza de date: `glitchtip` în Postgres-ul comun; broker: Redis-ul comun.

## Legătura cu ntfy (alerting)
GlitchTip → **Settings → Alerts → Webhook** → pune un URL ntfy
(`http://ntfy/verifact-alerts` din rețeaua compose, sau `http://localhost:8080/...`).
Fără cod — vezi [`ntfy.md`](./ntfy.md).

## Licență & activitate (verificat 2026-08-06)
- **Licență: MIT** ✅ (permisivă, OSI reală). Repo canonic pe **GitLab**
  (`gitlab.com/glitchtip/glitchtip`).
- Activitate: activ (commit-uri recente, ultima activitate azi). Comunitate mai
  mică decât Sentry (~160 ★ pe mirror-ul GitLab) — proiect matur dar de nișă.
- **Notă pentru finanțare:** argument puternic de sovereignty — Sentry și-a
  schimbat licența în FSL (Functional Source License, **non-OSI**), deci
  GlitchTip (MIT) este alternativa self-hosted cu licență cu adevărat deschisă.
