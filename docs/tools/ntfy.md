# ntfy — alerting simplu prin HTTP

## Ce face
ntfy trimite notificări push (telefon, desktop, web) printr-un simplu `POST` la un
topic. În Verifact e canalul de alerte pentru: pipeline de verificare picat,
health-check degradat, cost API depășit, erori din GlitchTip.

Integrare în cod: [`src/lib/alerts/ntfy.ts`](../../src/lib/alerts/ntfy.ts) —
helper fire-and-forget, **no-op** dacă `NTFY_URL`/`NTFY_TOPIC` lipsesc, nu aruncă
niciodată (alertarea nu are voie să rupă codul care alertează). Folosit de
[`/api/health`](../../src/app/api/health/route.ts) (`?notify=1`).

## Cum se pornește
```bash
docker compose up -d ntfy
```
- Server: http://localhost:8080
- Abonare la topic: deschide http://localhost:8080/verifact-alerts în browser, sau
  în app-ul mobil ntfy (self-hosted server URL → `http://<ip>:8080`).
- Test:
  ```bash
  curl -d "Pipeline picat" -H "Title: Verifact" -H "Priority: 4" http://localhost:8080/verifact-alerts
  ```

## Cum se conectează la health-checks și GlitchTip
- **Health-check → ntfy:** un uptime monitor (sau un cron) lovește
  `GET /api/health?notify=1`; când config-ul unei surse lipsește, ruta trimite
  o alertă ntfy.
- **GlitchTip → ntfy:** configurează un webhook în GlitchTip care POST-ează la
  `http://ntfy/<topic>` (fără cod). Vezi [`glitchtip.md`](./glitchtip.md).

## Env vars
| Variabilă | Rol |
|---|---|
| `NTFY_URL` | baza serverului ntfy (ex. http://localhost:8080) |
| `NTFY_TOPIC` | topicul de alerte (ex. verifact-alerts) |
| `NTFY_TOKEN` | (opțional) bearer token dacă instanța e cu auth |
| `NTFY_PORT` | portul host (default 8080) |
| `NTFY_AUTH_DEFAULT_ACCESS` | `read-write` (demo) sau `deny-all` (producție + token) |

## Licență & activitate (verificat 2026-08-06)
- **Licență: Apache-2.0** ✅ (permisivă, OSI reală). (Binarul server e
  Apache-2.0; unele componente client sunt GPL — irelevant pentru self-host.)
- Activitate: ~33.160 ★, foarte activ (commit-uri recente).
- **Notă pentru finanțare:** licență permisivă curată, dependențe minime, ideal
  pentru un stack open-source „defensibil”.
