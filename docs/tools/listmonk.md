# Listmonk — newsletter / waitlist self-hosted

## Ce face
Listmonk gestionează liste de abonați, campanii și formulare de înscriere. În
Verifact îl folosim pentru **lista de waitlist**: vizitatorii se înscriu, iar tu
deții datele (fără Mailchimp/US SaaS).

Integrare în cod:
- API server-side: [`src/app/api/waitlist/route.ts`](../../src/app/api/waitlist/route.ts)
  (credențialele Listmonk nu ajung în browser).
- Formular: [`src/components/waitlist/WaitlistForm.tsx`](../../src/components/waitlist/WaitlistForm.tsx)
  — componentă self-contained, **nemontată implicit**; pune-o unde vrei CTA-ul
  (ex. hero-ul din `src/app/page.tsx` sau `/preturi`).

## Cum se pornește
```bash
docker compose up -d listmonk
```
Serviciul rulează `--idempotent-install` automat la prima pornire (creează schema
în baza `listmonk` din Postgres-ul comun).
1. UI admin: http://localhost:9000 → login cu `LISTMONK_ADMIN_USER` /
   `LISTMONK_ADMIN_PASSWORD`.
2. **Lists → New** → creează lista „Waitlist” (notează `id`-ul, de regulă `1`).
3. **Settings → API users** → creează un user API → copiază **user + token**.
4. Completează în `.env.local`:
   ```
   LISTMONK_URL=http://localhost:9000
   LISTMONK_API_USER=<user>
   LISTMONK_API_TOKEN=<token>
   LISTMONK_WAITLIST_LIST_ID=1
   ```
5. Test: `curl -X POST http://localhost:3000/api/waitlist -H "Content-Type: application/json" -d '{"email":"test@exemplu.ro"}'`

## Env vars
| Variabilă | Rol |
|---|---|
| `LISTMONK_URL` | baza instanței Listmonk |
| `LISTMONK_API_USER` / `LISTMONK_API_TOKEN` | credențiale API (auth `token user:token`) |
| `LISTMONK_WAITLIST_LIST_ID` | id-ul listei de waitlist |
| `LISTMONK_ADMIN_USER` / `LISTMONK_ADMIN_PASSWORD` | contul admin (prima pornire) |
| `LISTMONK_PORT` | portul host (default 9000) |

## Licență & activitate (verificat 2026-08-06)
- **Licență: AGPL-3.0** ✅ (OSI reală, dar **copyleft**). Self-hosting-ul e
  perfect ok. AGPL contează dacă ai modifica Listmonk și l-ai oferi ca serviciu
  în rețea — atunci trebuie să publici sursa modificată. Folosit ca produs
  neschimbat, nu te obligă la nimic.
- Activitate: ~22.650 ★, foarte activ.
- **Notă pentru finanțare:** un stack care se sprijină pe AGPL/self-host este un
  argument bun de „data sovereignty” (datele abonaților rămân la tine, nu la un
  procesator terț) — util pentru GDPR și pentru narativul de suveranitate.
