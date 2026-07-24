# AUDIT-DATABASE.md — Verifact Database Schema Audit

**Data auditului:** 2026-07-24
**Auditor:** Agent Database/Backend Engineer
**Stare:** Audit complet + remedieri implementate

---

## 1. Starea inițială a schemei (Pre-Audit)

### 1.1 Tabele existente

La momentul auditului, schema conținea un singur fișier de migrație (`001_initial_schema.sql`) cu **3 tabele**:

| Tabel | Coloane | Observații |
|---|---|---|
| `profiles` | id, username, tier, verifications_count, verifications_reset, created_at | Lipseau: `role`, `preferred_language`, `updated_at`, câmpuri GDPR |
| `verifications` | id, user_id, input_type, input_text, input_url, verdict, score, report_json, is_public, language, processing_time, created_at | Lipseau: `status`, `error_message`, `anonymous_hash`, `processing_time_ms` (era `processing_time` fără unitate) |
| `cached_results` | id, content_hash, result_json, hits, expires_at, created_at | Lipsea: `disputed_count` |

**Tabele complet lipsă** (identificate în docs/ORGANIZARE.md §6, §12):
- `disputes` — fără mecanism de contestare
- `api_call_logs` — fără logging costuri API
- `subscriptions` — fără suport pentru tier upgrade/Stripe
- `admin_actions` — fără audit log pentru moderare

### 1.2 Constrângeri lipsă

| Problemă | Tabel | Detaliu |
|---|---|---|
| `NOT NULL` lipsă | `profiles.tier` | Permitea NULL, nu avea DEFAULT corect forțat |
| `CHECK` insuficiente | `verifications.input_text` | Fără limită de lungime — posibil atac cu text de dimensiuni arbitrare |
| `CHECK` lipsă | `verifications.verdict` | Marcat `NOT NULL` dar verdictul nu poate fi setat la creare (e setat server-side după procesare) |
| `ON DELETE` negândit | `verifications.user_id` | `SET NULL` corect, dar fără documentare a intenției GDPR |

### 1.3 Indexuri existente vs. necesare

| Index existent | Status |
|---|---|
| `idx_verifications_user_id` | ✅ Existent |
| `idx_verifications_public` | ✅ Existent (is_public, created_at DESC) |
| `idx_verifications_verdict` | ✅ Existent |
| `idx_cached_results_hash` | ✅ Existent (redundant — content_hash e UNIQUE, deci auto-indexat) |

| Index necesar dar lipsă | Motiv |
|---|---|
| `idx_verifications_status` | Polling progress tracker |
| `idx_verifications_anonymous_hash` | Limitare verificări anonime |
| `idx_verifications_input_text_fts` (GIN) | Căutare full-text în feed public |
| `idx_disputes_status` | Filtrare admin panel |
| `idx_api_call_logs_provider_created` | Agregări cost pe interval |

---

## 2. Audit RLS — VULNERABILITĂȚI IDENTIFICATE

> [!CAUTION]
> **Vulnerabilitate critică găsită: `cached_results` erau citibile de ORICINE**

### 2.1 Policy-uri existente și probleme

| Tabel | Policy | Problemă identificată |
|---|---|---|
| `profiles` | `Users can view own profile` | ✅ Corect — `USING (auth.uid() = id)` |
| `profiles` | `Users can update own profile` | ⚠️ **VULNERABILITATE**: Fără `WITH CHECK` — userul putea să-și schimbe singur `tier` de la 'free' la 'business' printr-un UPDATE direct |
| `verifications` | `Anyone can view public verifications` | ✅ Corect |
| `verifications` | `Users can view own verifications` | ✅ Corect |
| `verifications` | `Authenticated users can insert verifications` | ✅ Corect |
| `verifications` | `Users can delete own verifications` | ✅ Corect |
| `cached_results` | `Allow public read access to cache` | ❌ **VULNERABILITATE CRITICĂ**: Policy `USING (TRUE)` pentru rolurile `authenticated` și `anon` — oricine cu anon key putea citi TOATĂ cache-ul, inclusiv result_json cu date potențial sensibile |

### 2.2 Policy-uri complet lipsă

- **profiles**: Nu exista policy pentru admini (nu puteau vedea profilurile altor useri)
- **profiles**: Nu exista `WITH CHECK` pe UPDATE care să prevină escaladarea de privilegii
- **verifications**: Nu existau policy-uri pentru admin/moderator
- **disputes**: Tabelul nu exista
- **api_call_logs**: Tabelul nu exista
- **subscriptions**: Tabelul nu exista
- **admin_actions**: Tabelul nu exista

### 2.3 Rezoluție

Toate policy-urile au fost rescrise complet în `0009_rls_policies.sql`:
- `cached_results`, `api_call_logs`, `admin_actions`: RLS activat, **ZERO policies** = blocare totală pentru anon/authenticated. Doar service_role poate accesa.
- `profiles`: `WITH CHECK` previne modificarea `role` și `tier` de către user
- `verifications`: Fără policy UPDATE pentru authenticated — verdictul se scrie doar server-side
- `disputes`: INSERT deschis (oricine poate contesta), SELECT restricționat la reporter + admin
- `subscriptions`: SELECT doar propriile, admin vede tot, fără INSERT/UPDATE client-side

---

## 3. Audit Migrații

### 3.1 Stare inițială

**Problemă majoră**: Exista un singur fișier `001_initial_schema.sql` care conținea tot (tabele + indexuri + RLS) într-un bloc monolitic. Nu exista `config.toml` Supabase, nu exista `seed.sql`.

**Consecință**: Imposibil de reprodus mediul de dezvoltare de alt developer. Schema probabil aplicată manual prin SQL editor, nu prin `supabase db reset`.

### 3.2 Rezoluție

Schema a fost rescrisă în **9 migrații separate, versionate**:

| Fișier | Conținut |
|---|---|
| `0001_profiles.sql` | Tabel profiles + trigger updated_at + trigger on_auth_user_created |
| `0002_verifications.sql` | Tabel verifications cu status/error_message/anonymous_hash |
| `0003_cached_results.sql` | Tabel cached_results cu disputed_count |
| `0004_disputes.sql` | Tabel disputes + trigger cache invalidation |
| `0005_api_call_logs.sql` | Tabel api_call_logs |
| `0006_subscriptions.sql` | Tabel subscriptions (stub Stripe) |
| `0007_admin_actions.sql` | Tabel admin_actions |
| `0008_indexes.sql` | Toate indexurile de performanță |
| `0009_rls_policies.sql` | Toate policy-urile RLS + funcția GDPR |

---

## 4. Schema finală — Toate tabelele

### 4.1 `profiles`

| Coloană | Tip | Constrângeri | Notă |
|---|---|---|---|
| id | UUID | PK, FK → auth.users ON DELETE CASCADE | |
| username | TEXT | UNIQUE | |
| tier | TEXT | NOT NULL DEFAULT 'free', CHECK IN ('free','pro','business') | |
| role | TEXT | NOT NULL DEFAULT 'user', CHECK IN ('user','admin','moderator') | **NOU** — necesar pentru RLS admin |
| verifications_count | INTEGER | NOT NULL DEFAULT 0, CHECK >= 0 | |
| verifications_reset | DATE | NOT NULL DEFAULT CURRENT_DATE | |
| preferred_language | TEXT | NOT NULL DEFAULT 'ro', CHECK IN ('ro','en') | **NOU** |
| gdpr_data_export_requested_at | TIMESTAMPTZ | nullable | **NOU** — GDPR |
| gdpr_deletion_requested_at | TIMESTAMPTZ | nullable | **NOU** — GDPR |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | **NOU** — auto-trigger |

### 4.2 `verifications`

| Coloană | Tip | Constrângeri | Notă |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → profiles ON DELETE SET NULL | NULL = anonim |
| anonymous_hash | TEXT | nullable | **NOU** — SHA256(IP+UA) |
| input_type | TEXT | NOT NULL, CHECK IN ('text','screenshot','url') | |
| input_text | TEXT | NOT NULL, CHECK length 1-5000 | **Adăugat CHECK lungime** |
| input_url | TEXT | nullable | |
| verdict | TEXT | nullable, CHECK IN ('true','partial','unclear','false') | **Schimbat**: nullable (setat server-side) |
| score | INTEGER | nullable, CHECK 0-100 | |
| report_json | JSONB | nullable | **Schimbat**: nullable (setat server-side) |
| is_public | BOOLEAN | NOT NULL DEFAULT FALSE | |
| language | TEXT | NOT NULL DEFAULT 'ro', CHECK IN ('ro','en') | |
| processing_time_ms | INTEGER | nullable | **Redenumit** din processing_time |
| status | TEXT | NOT NULL DEFAULT 'pending', CHECK IN ('pending','processing','completed','failed') | **NOU** — progress tracker |
| error_message | TEXT | nullable | **NOU** — error handling |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 4.3 `cached_results`

| Coloană | Tip | Constrângeri | Notă |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| content_hash | TEXT | UNIQUE NOT NULL | |
| result_json | JSONB | NOT NULL | |
| hits | INTEGER | NOT NULL DEFAULT 0, CHECK >= 0 | |
| disputed_count | INTEGER | NOT NULL DEFAULT 0, CHECK >= 0 | **NOU** |
| expires_at | TIMESTAMPTZ | NOT NULL | **Schimbat**: NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 4.4 `disputes` (NOU)

| Coloană | Tip | Constrângeri |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| verification_id | UUID | NOT NULL, FK → verifications ON DELETE CASCADE |
| reporter_email | TEXT | nullable |
| reporter_user_id | UUID | FK → profiles ON DELETE SET NULL |
| reason | TEXT | NOT NULL, CHECK length 10-2000 |
| status | TEXT | NOT NULL DEFAULT 'open', CHECK IN (6 valori) |
| resolved_by | UUID | FK → profiles |
| resolution_note | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| resolved_at | TIMESTAMPTZ | nullable |

**Trigger**: `trg_dispute_cache_invalidation` — incrementează `disputed_count` pe cache entry și expiră cache dacă count >= 3.

### 4.5 `api_call_logs` (NOU)

| Coloană | Tip | Constrângeri |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| verification_id | UUID | FK → verifications ON DELETE SET NULL |
| provider | TEXT | NOT NULL |
| endpoint | TEXT | nullable |
| latency_ms | INTEGER | nullable |
| status_code | INTEGER | nullable |
| success | BOOLEAN | NOT NULL |
| estimated_cost_usd | NUMERIC(10,6) | nullable |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### 4.6 `subscriptions` (NOU)

| Coloană | Tip | Constrângeri |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, FK → profiles ON DELETE CASCADE |
| tier | TEXT | NOT NULL, CHECK IN ('pro','business') |
| status | TEXT | NOT NULL DEFAULT 'pending_manual', CHECK IN (4 valori) |
| stripe_customer_id | TEXT | nullable |
| stripe_subscription_id | TEXT | nullable |
| current_period_end | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### 4.7 `admin_actions` (NOU)

| Coloană | Tip | Constrângeri |
|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() |
| admin_id | UUID | NOT NULL, FK → profiles |
| action_type | TEXT | NOT NULL |
| target_table | TEXT | NOT NULL |
| target_id | UUID | NOT NULL |
| details | JSONB | nullable |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

## 5. GDPR — Fluxuri implementate

### 5.1 Ștergere cont (Dreptul la ștergere — Art. 17 GDPR)

**Funcția SQL**: `request_account_deletion(target_user_id UUID)`

**Flux**:
1. Frontend: Utilizatorul apasă "Șterge cont" în Dashboard > Settings
2. API Route (`DELETE /api/user/delete`): Verifică autentificarea
3. Server-side: Apelează `requestAccountDeletion(userId)` din `src/lib/user/gdpr.ts`
4. RPC: Anonimizează verificările publice (user_id = NULL, păstrează conținut)
5. RPC: Șterge verificările private complet
6. RPC: Șterge subscriptions, anonimizează disputes
7. RPC: Șterge rândul din profiles
8. Server-side: Șterge userul din `auth.users` via admin API

**Decizie de design**: Anonimizare (nu ștergere completă) pentru verificările publice, pentru a păstra integritatea bazei de date comunitare. Conținutul public rămâne accesibil dar fără legătură cu identitatea utilizatorului.

### 5.2 Export date (Dreptul la portabilitate — Art. 20 GDPR)

**Endpoint**: `GET /api/user/export` (de implementat de Agent-Backend-API)
**Helper**: `exportUserData(userId)` din `src/lib/user/gdpr.ts`
**Format**: JSON (`verifact-gdpr-export-v1`)
**Conținut**: Profil complet + istoric verificări complet

---

## 6. Supabase Clients — Arhitectura

| Client | Fișier | Utilizare | RLS |
|---|---|---|---|
| Browser | `src/lib/supabase/client.ts` | Client Components | ✅ Da — anon key |
| Server | `src/lib/supabase/server.ts` | Server Components, Route Handlers | ✅ Da — sesiune user |
| Admin | `src/lib/supabase/admin.ts` | API Routes privilegiate | ❌ Bypass — service_role |

> [!WARNING]
> `admin.ts` nu trebuie NICIODATĂ importat din Client Components. Service_role key are acces total nerestricționat.

---

## 7. Handoff — Ce trebuie să știe ceilalți agenți

### Pentru Agent-Auth:
- Tabelul `profiles` are acum câmpul `role` ('user', 'admin', 'moderator')
- Trigger-ul `on_auth_user_created` auto-creează profil cu role='user'
- `WITH CHECK` pe profiles UPDATE previne escaladarea de privilegii client-side

### Pentru Agent-Backend-API:
- Verificările se creează cu `status = 'pending'`, se actualizează la 'processing' → 'completed'/'failed' server-side via admin client
- `verdict`, `score`, `report_json` sunt nullable și se setează DOAR server-side
- Anonymous hash se calculează cu `computeAnonymousHash(ip, userAgent)` din `src/lib/usage/anonymous-limit.ts`
- Limitarea anonimă se verifică cu `checkAnonymousLimit(ip, userAgent)`
- Logarea API calls se face prin INSERT în `api_call_logs` via admin client
- GDPR deletion se apelează prin `requestAccountDeletion(userId)` din `src/lib/user/gdpr.ts`
- GDPR export se apelează prin `exportUserData(userId)` din `src/lib/user/gdpr.ts`

### Pentru Agent-Dashboard:
- Butoanele GDPR (export + ștergere) trebuie adăugate în Settings page
- Feed-ul public poate folosi FTS index: `.textSearch('input_text', query)`
- Progress tracker poate face polling pe `status` din `verifications`
- Admin panel: filtrare dispute-uri pe `status`, vizualizare subscriptions, api_call_logs

### Tipuri TypeScript generate:
- Import din `@/types/database` — conține `Database`, `Profile`, `Verification`, `Dispute`, etc.
- Toate clienții Supabase sunt tipați cu `Database` generic

---

## 8. Reset lunar verificări

**Implementare**: Supabase Edge Function `reset-monthly-verifications`

**Deploy**:
```bash
supabase functions deploy reset-monthly-verifications
```

**Programare** (via pg_cron în Supabase Dashboard):
```sql
SELECT cron.schedule(
  'reset-monthly-verifications',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/reset-monthly-verifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## 9. Comenzi setup local

```bash
# 1. Instalare Supabase CLI
npm install -g supabase

# 2. Pornire instanță locală
supabase start

# 3. Aplicare migrații și seed data
supabase db reset

# 4. Generare tipuri TypeScript din schema reală
npx supabase gen types typescript --local > src/types/database.ts

# 5. Oprire instanță locală
supabase stop
```
