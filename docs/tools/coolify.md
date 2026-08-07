# Coolify — PaaS self-hosted (FAZA 2 — necesită VPS, doar plan)

> **Status: schelet + plan. Fără deploy pe producție fără confirmarea ta explicită.**

## Ce face
Coolify înlocuiește Vercel/Heroku: deploy de aplicații + baze de date pe VPS-ul
tău, cu Git push-to-deploy, SSL automat, backups. Rulează Verifact (Next.js) și
întreg stack-ul self-hosted pe infra pe care o deții (sovereignty end-to-end).

## De ce nu e în `docker-compose.yml`
Coolify este **platforma gazdă**, nu un serviciu al aplicației — se instalează pe
VPS și el orchestrează containerele. Nu are ce căuta în compose-ul app-ului.

## Plan de deploy (când decizi VPS-ul)
1. **VPS EU** (aliniat sovereignty): Hetzner (DE/FI), Scaleway (FR) sau OVH (FR).
   Minim ~4 vCPU / 8 GB pentru stack-ul complet; 2 vCPU / 4 GB dacă rulezi doar
   app + Postgres + gateway.
2. Instalează Coolify: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
   (rulează pe VPS, **nu** local; necesită confirmarea ta).
3. Conectează repo-ul Git → tip aplicație **Next.js** (build `npm run build`,
   start `npm run start`, port 3000).
4. Adaugă env vars din `.env.example` în UI-ul Coolify (secretele stau în Coolify,
   nu în repo).
5. Adaugă serviciile din `docker-compose.yml` ca „resources” Coolify (Postgres,
   Redis, n8n, GlitchTip, gateway) sau importă direct compose-ul.
6. Domeniu + SSL (Let's Encrypt automat).

## Config de referință (Next.js)
- Build: `npm ci && npm run build`
- Start: `npm run start` · Port: `3000`
- Health check: `GET /api/health`
- Persistență: volum pentru Postgres; backups Coolify programate.

## Licență & activitate (verificat 2026-08-06)
- **Licență: Apache-2.0** ✅ (permisivă, OSI reală).
- Activitate: ~60.180 ★, foarte activ.
- **Notă pentru finanțare:** self-hosting pe VPS EU + Coolify (Apache-2.0) =
  argument direct de „infra în UE, fără lock-in de furnizor US” (vs. Vercel).
