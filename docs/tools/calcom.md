# Cal.com — scheduling / booking self-hosted

## Ce face
Cal.com este alternativa open-source la Calendly: pagini de booking, disponibilitate,
integrări de calendar. În Verifact îl folosim pentru o pagină simplă de programare
a discuțiilor cu investitori/mentori.

## Cum se pornește
```bash
docker compose up -d calcom
```
- UI: http://localhost:3002 → creează cont admin → setează un event type
  („Discuție investitor — 30 min”) → link-ul public de booking e gata.
- Embed opțional în app (dacă vrei o pagină `/discutii` proprie): folosește
  `<iframe src="http://localhost:3002/<username>/<event>">` sau pachetul
  `@calcom/embed-react`. Dacă embed-uiești, adaugă originea Cal.com în CSP
  `frame-src` din `next.config.mjs` (acum e `frame-src 'none'`).

> ⚠️ Self-hosting-ul Cal.com este notoriu pretențios (multe env vars, migrații,
> uneori build din sursă). Dacă imaginea `calcom/cal.com:latest` nu pornește
> curat, construiește din **github.com/calcom/docker** (repo-ul oficial de
> self-host, cu `.env` complet documentat) și pune imaginea rezultată în
> `docker-compose.yml`. Pentru un MVP rapid, un cont pe cal.com hosted +
> doar embed-ul poate fi suficient până la decizia de VPS.

## Env vars
| Variabilă | Rol |
|---|---|
| `CALCOM_PORT` | portul host (default 3002) |
| `CALCOM_URL` | URL public (`NEXTAUTH_URL` + `NEXT_PUBLIC_WEBAPP_URL`) |
| `CALCOM_NEXTAUTH_SECRET` | secret sesiune (`openssl rand -hex 32`) |
| `CALCOM_ENCRYPTION_KEY` | `CALENDSO_ENCRYPTION_KEY` (`openssl rand -hex 32`) |

Bază de date: `calcom` în Postgres-ul comun.

## Licență & activitate (verificat 2026-08-06)
- **Licență: MIT** la rădăcină (`LICENSE`) ✅. **Atenție:** sub-directoare precum
  `packages/.../ee` (enterprise) și platforma comercială au **licențe proprii,
  mai restrictive** — verifică per-director înainte de redistribuire comercială
  sau de folosirea feature-urilor enterprise. Pentru un booking de bază self-hosted,
  ești pe partea MIT.
- Activitate: ~47.300 ★, foarte activ.
- **Notă pentru finanțare:** booking self-hosted = datele de contact ale
  investitorilor/mentorilor nu trec printr-un SaaS terț. Documentează clar că
  folosești doar funcționalitatea MIT, nu modulele `/ee`.
