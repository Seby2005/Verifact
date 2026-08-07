# Surse suplimentare de verificare — API-uri publice gratuite

Selecție din [public-apis](https://github.com/public-apis/public-apis) (repo,
nu tool — nimic de instalat), curată pentru relevanță în fact-checking și
**fără duplicate** cu ce ai deja: Google Fact Check API (layer1), NewsAPI
(layer2), Google Custom Search (layer3), Tavily (layer2/4), Twitter (layer4).

Prioritate pe surse **fără cheie**, **structurate/oficiale** și **EU/RO** (aliniat
cu poziționarea de sovereignty). „Auth” = ce ai nevoie ca să apelezi.

| # | API | Ce aduce pentru verificare | Auth | Licență / ToS |
|---|-----|----------------------------|------|---------------|
| 1 | **GDELT 2.0 DOC API** (gdeltproject.org) | Monitorizează știri globale în ~65 limbi; cross-check al acoperirii unei afirmații în timp și geografie. Complement puternic peste NewsAPI. | fără cheie | date deschise, uz gratuit |
| 2 | **Wikimedia / Wikipedia REST API** | Context enciclopedic + referințe (note de subsol) pentru entități și evenimente. | fără cheie (User-Agent cerut) | CC BY-SA / GFDL |
| 3 | **Wikidata SPARQL** (query.wikidata.org) | Fapte structurate: date de naștere/deces, funcții deținute, apartenențe — verifică afirmații de tip „X este/era Y”. | fără cheie | CC0 (domeniu public) |
| 4 | **Internet Archive — Wayback Machine API** | Ce spunea o pagină și **când**; detectează afirmații editate/șterse, citează sursa arhivată. | fără cheie | uz gratuit (ToS IA) |
| 5 | **CrossRef REST API** | Metadate pentru literatură științifică (DOI, autori, jurnal) — verifică „un studiu a arătat că…”. | fără cheie (email „polite pool”) | date deschise |
| 6 | **WHO Global Health Observatory (OData)** | Statistici oficiale de sănătate — utile contra dezinformării medicale. | fără cheie | date deschise WHO |
| 7 | **data.europa.eu (EU Open Data Portal)** | Seturi de date oficiale UE (economie, mediu, migrație) pentru afirmații despre politici europene. | fără cheie | preponderent open (CC BY 4.0) |
| 8 | **data.gov.ro (portal CKAN)** | Date oficiale românești — cel mai relevant pentru fact-checking local (buget, sănătate, administrație). | fără cheie | licențe deschise (variază per set) |
| 9 | **OpenSanctions API** | Verifică persoane/organizații numite într-o afirmație vs. liste de sancțiuni/PEP. | cheie gratuită (self-host posibil) | date CC BY-NC / cod MIT |
| 10 | **Google Knowledge Graph Search API** | „Grounding” de entități (dezambiguizare persoane/locuri) înainte de scoring. Refolosește cheia Google existentă. | cheie Google (deja ai) | ToS Google, tier gratuit |

## Recomandare de integrare (ordine de valoare)
1. **GDELT** + **Wayback** — cel mai mare câștig imediat: acoperire globală și
   verificare temporală/arhivistică, ambele fără cheie.
2. **Wikidata** + **CrossRef** — pentru afirmații factuale structurate și
   științifice (unde presa generală nu ajută).
3. **data.gov.ro** + **data.europa.eu** — diferențiatorul de sovereignty și de
   relevanță locală pentru un produs RO/EU.

Fiecare se poate adăuga ca un nou „layer” în [`orchestrator.ts`](../../src/lib/verification/orchestrator.ts)
sau ca un nod HTTP în workflow-ul n8n — fără să atingi restul pipeline-ului.

*(Licențele/ToS pot varia în timp — reconfirmă înainte de a te baza pe una într-un
dosar de finanțare.)*
