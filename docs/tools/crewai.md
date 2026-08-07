# crewAI — prototip multi-agent (comparație cu orchestrarea custom)

## Ce face
crewAI descrie un pipeline ca **agenți** cu roluri, unelte și task-uri, în loc de
o funcție imperativă. Prototipul din [`services/crew/`](../../services/crew)
mapează pipeline-ul Verifact „4 surse în paralel → sinteză AI” pe agenți, ca
alternativă/comparație la [`orchestrator.ts`](../../src/lib/verification/orchestrator.ts).

| orchestrator.ts | crewAI (services/crew) |
|---|---|
| `Promise.allSettled(runLayer1..4)` | 4 agenți researcher, task-uri `async_execution=True` (fan-out) |
| `applyAISourceFilter` + `calculateScore` + `generateAIAnalysis` | agent „synthesizer”, task cu `context=[cele 4 task-uri]` → verdict JSON |

Fișiere: `tools.py` (o unealtă per layer, degradează la mock fără chei),
`crew.py` (agenții + task-urile), `app.py` (FastAPI: `POST /verify`).

## Cum se pornește
```bash
docker compose up -d crew
```
- API: http://localhost:8100
- `curl -X POST http://localhost:8100/verify -H "Content-Type: application/json" -d '{"text":"Afirmația de verificat"}'`
- LLM-ul e luat prin gateway-ul self-hosted (LiteLLM/OmniRoute), nu direct de la
  provider — deci prototipul schimbă providerul din config, exact ca app-ul.
- Fără chei de surse configurate, uneltele întorc mock-uri, dar **crew-ul rulează
  end-to-end** (scopul e topologia agenților, nu datele live).

## Env vars
| Variabilă | Rol |
|---|---|
| `AI_GATEWAY_BASE_URL` | endpoint OpenAI-compatibil (default `http://litellm:4000/v1`) |
| `LITELLM_MASTER_KEY` | cheia gateway-ului (trimisă ca `OPENAI_API_KEY`) |
| `CREW_MODEL` | alias de model din gateway (ex. `gemini-flash`) |
| `CREW_PORT` | portul host (default 8100) |
| chei surse (`GOOGLE_FACT_CHECK_API_KEY` etc.) | opționale; fără ele → mock |

## Verdict comparativ (pentru decizia de arhitectură)
- **crewAI**: excelent pentru raționament agentic, delegare, unelte — dar adaugă
  un runtime Python, latență de „gândire” a agenților și non-determinism.
- **orchestrator.ts actual**: determinist, rapid, ușor de testat, în același
  limbaj cu restul app-ului. Pentru „4 surse fixe → 1 sinteză”, orchestrarea
  custom rămâne mai simplă și mai ieftină. crewAI devine interesant dacă apar
  pași dinamici (agentul decide *ce* sursă să interogheze în funcție de afirmație).

## Licență & activitate (verificat 2026-08-06)
- **Licență: MIT** ✅ (permisivă, OSI reală).
- Activitate: ~56.700 ★, foarte activ (commit-uri zilnice).
- **Notă pentru finanțare:** MIT curat, comunitate mare — sigur de inclus în
  stack. Prototipul e izolat (`services/crew/`), nu contaminează app-ul TS.
