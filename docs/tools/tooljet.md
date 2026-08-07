# ToolJet — panou intern de admin (FAZA 2 — schelet + plan)

> **Status: schelet în compose, sub profilul `phase2`. Nu pornește implicit.**

## Ce face
ToolJet construiește rapid interfețe interne (dashboards, tabele, formulare)
peste baze de date/API-uri. Pentru Verifact: un panou de monitorizare a
**costurilor API** și a **pipeline-ului de verificare** (rate de succes per layer,
circuit breaker, volume).

## Cum se pornește (opt-in)
```bash
docker compose --profile phase2 up -d tooljet
```
- UI: http://localhost:8082 → creează cont admin → construiește prima aplicație.

## Schelet de panou propus (mock data e ok la început)
- **Data source 1:** Postgres-ul comun (tabelele de usage/rate-limit existente —
  vezi `supabase/migrations/`), read-only.
- **Data source 2:** REST → `GET /api/health` (status per layer) și un viitor
  `GET /api/admin/costs` (agregat de cost pe provider).
- **Widgets:** tabel „verificări recente”, grafic „cost/zi per provider AI”,
  indicatori „layer success rate”, listă „circuit breakers deschise”.
- Până există endpoint-urile reale, ToolJet poate folosi un data source mock
  (JSON static) ca să validezi layout-ul.

## Env vars
| Variabilă | Rol |
|---|---|
| `TOOLJET_PORT` | portul host (default 8082) |
| `TOOLJET_URL` | URL public |
| `TOOLJET_LOCKBOX_KEY`, `TOOLJET_SECRET_KEY_BASE` | secrete (`openssl rand -hex 32` / `-hex 64`) |

Bază de date: `tooljet` în Postgres-ul comun; cache: Redis-ul comun.

## Licență & activitate (verificat 2026-08-06)
- **Licență: AGPL-3.0** ✅ (OSI, copyleft) + module enterprise separate.
- Activitate: ~38.300 ★, foarte activ.
- **Notă pentru finanțare:** un admin panel intern self-hosted ține datele de
  cost/operare la tine. Folosește doar core-ul AGPL; modulele enterprise au
  termeni comerciali.
