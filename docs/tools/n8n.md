# n8n — orchestrare de workflow

## Ce face
n8n execută pipeline-uri vizuale (noduri conectate) fără cod custom. Pentru
Verifact, îl folosim ca strat de orchestrare peste cele 4 surse de date: poți
adăuga/scoate o sursă din workflow, fără să modifici codul aplicației.

Workflow-ul schelet livrat: [`workflows/n8n/verifact-4-sources.json`](../../workflows/n8n/verifact-4-sources.json)
- `Webhook - Verify` primește `{ text, language }` pe `POST /webhook/verifact-verify`
- 4 noduri HTTP rulează **în paralel** (Fact Check API, News API, Custom Search, Tavily)
- `Merge sources` (4 intrări) → `Aggregate` (Code) combină rezultatele
- `Callback to Verifact` face `POST` la `src/app/api/webhooks/n8n/route.ts`

Este oglinda declarativă a [`orchestrator.ts`](../../src/lib/verification/orchestrator.ts):
același „fan-out la surse → sinteză”, dar editabil din UI.

## Cum se pornește
```bash
docker compose up -d n8n
```
- UI: http://localhost:5678 (prima rulare cere crearea unui cont owner local)
- Import: **Workflows → Import from File** → `workflows/n8n/verifact-4-sources.json`
- Cheile surselor sunt injectate ca env în container (din `.env`); workflow-ul
  le citește prin `{{ $env.GOOGLE_FACT_CHECK_API_KEY }}` etc. — nicio cheie nu
  stă în JSON.
- Test: `curl -X POST http://localhost:5678/webhook/verifact-verify -H "Content-Type: application/json" -d '{"text":"test","language":"ro"}'`
  (activează workflow-ul întâi; până atunci folosește URL-ul `/webhook-test/...`).

## Env vars
| Variabilă | Rol |
|---|---|
| `N8N_PORT` | portul host (default 5678) |
| `VERIFACT_CALLBACK_URL` | unde POST-ează workflow-ul agregatul (host.docker.internal:3000) |
| `N8N_WEBHOOK_SECRET` | (opțional) secret partajat, trimis ca `x-verifact-secret` |
| `GOOGLE_FACT_CHECK_API_KEY`, `NEWS_API_KEY`, `GOOGLE_CUSTOM_SEARCH_API_KEY`, `GOOGLE_OFFICIAL_SEARCH_ENGINE_ID`, `TAVILY_API_KEY` | cheile surselor, reutilizate din config-ul app |

## Licență & activitate (verificat 2026-08-06)
- **Licență: „Sustainable Use License” (fair-code) + n8n Enterprise.** GitHub o
  raportează ca `NOASSERTION` / „Other”. ⚠️ **Nu este o licență OSI permisivă
  reală — este source-available.** Poți self-hosta și folosi intern gratuit,
  dar există restricții (nu poți oferi n8n ca serviciu concurent, revânzare etc.).
- Activitate: ~199.600 ★, commit-uri zilnice, proiect foarte activ.
- **Notă pentru finanțare (PoCIDIF/EIC):** dacă poziționarea „100% open-source
  real” e importantă în dosar, tratează n8n ca **dependență source-available**,
  nu ca open-source OSI. Alternative cu licență OSI reală, dacă vrei să eviți
  ambiguitatea: **Node-RED** (Apache-2.0), **Windmill** (AGPL-3.0/permisiv),
  **Kestra** (Apache-2.0). Integrarea Verifact (webhook + callback) e agnostică
  și se poate muta pe oricare dintre ele.
