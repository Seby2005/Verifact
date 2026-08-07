# AI gateway — OmniRoute (și LiteLLM ca stand-in in-compose)

## Scop (item #6)
Un strat intermediar OpenAI-compatibil între cod și modele (Gemini/DeepSeek/
Mistral/OpenRouter), ca să **schimbi providerul din config, nu din cod**.

Integrarea reală e în cod, agnostică de gateway:
[`src/lib/ai/openrouter.ts`](../../src/lib/ai/openrouter.ts) citește
`AI_GATEWAY_BASE_URL`. Când e setat, toate apelurile AI trec prin gateway;
`OPENROUTER_API_KEY` devine cheia gateway-ului, iar `OPENROUTER_MODEL` un alias
de model din gateway (ex. `gemini-flash`). Restul modulului e neschimbat pentru
că gateway-ul vorbește același protocol.

## De ce LiteLLM e în compose, iar OmniRoute nu
OmniRoute **nu publică imagini pullable** — `docker-compose.yml`-ul lui
construiește local `omniroute:base/web/cli` și pornește o constelație de sidecar-uri
(Redis, Qdrant, Bifrost, CLIProxyAPI; dashboard 20128, API 20129). Inclus inline
ar rupe boot-ul „un singur `docker compose up`”. Așa că rolul de gateway e umplut
în stack de **LiteLLM** (o singură imagine, pornește curat), iar OmniRoute se
rulează din repo-ul propriu, pe același env.

### Varianta A — LiteLLM (recomandat pentru start; deja în stack)
```bash
docker compose up -d litellm
```
- Endpoint: http://localhost:4000/v1 · config: [`docker/litellm/config.yaml`](../../docker/litellm/config.yaml)
- În `.env.local`:
  ```
  AI_GATEWAY_BASE_URL=http://localhost:4000/v1
  OPENROUTER_API_KEY=<LITELLM_MASTER_KEY>
  OPENROUTER_MODEL=gemini-flash
  ```
- Schimbi providerul editând `config.yaml` (alias → provider), nu codul.

### Varianta B — OmniRoute (mai bogat: 231+ provideri, compresie tokens, fallback)
```bash
git clone https://github.com/marcpadz/omniroute services/omniroute-upstream
cd services/omniroute-upstream && docker compose up -d   # construiește imaginile local
```
- API OpenAI-compatibil: http://localhost:20129/v1 · dashboard: http://localhost:20128
- În `.env.local`: `AI_GATEWAY_BASE_URL=http://localhost:20129/v1` (+ cheia OmniRoute).
- `services/omniroute-upstream/` e ignorat de git (vezi `.gitignore`) — e un upstream, nu îl comitem.

## Licență & activitate (verificat 2026-08-06)
- **OmniRoute: MIT** ✅ · ~9.800 ★ · activ (TypeScript, ~4.500 commit-uri, versiuni frecvente). Local proxy, „never phones home”.
- **LiteLLM: MIT** ✅ pentru core (~55.700 ★, foarte activ). ⚠️ Directorul
  `enterprise/` are licență comercială separată — pentru self-host obișnuit
  folosești doar partea MIT. GitHub raportează repo-ul ca „Other” din cauza
  acestui dual-licensing.
- **Notă pentru finanțare:** ambele au core MIT permisiv. OmniRoute întărește
  narativul de sovereignty (gateway local, nu trimite prompturi la un router
  terț). Evită dependența de un gateway hosted US (ex. OpenRouter direct).
