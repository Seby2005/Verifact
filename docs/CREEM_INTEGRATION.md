# Creem Payment Integration — Session Summary (8 August 2026)

> Acest document rezumă tot ce s-a implementat și configurat pentru integrarea
> procesatorului de plăți **Creem** în proiectul **Verifact** (Next.js 16 + Supabase).
> Oferă-l lui Claude Code ca context pentru a fi la curent cu starea actuală.

---

## 1. Ce s-a făcut

### Cont Creem configurat
- Verificarea identității (KYC) a fost finalizată cu buletinul românesc.
- S-a creat un **produs Pro** în dashboard-ul Creem.
- S-au generat **cheia API**, **Product ID** și **Webhook Signing Secret**.
- S-a configurat **webhook-ul** în Creem Dashboard cu URL-ul de producție.

### Variabile de mediu adăugate

Atât în `.env.local` cât și pe **Vercel** (producție):

```env
CREEM_API_KEY=creem_xfeKGkpwSCIdI6HP157r4
CREEM_WEBHOOK_SECRET=whsec_2HN9ofktZ2LiPVqmocsjmO
NEXT_PUBLIC_CREEM_PRO_PRODUCT_ID=prod_dQMs5ZfLQFgVoKERSEGnQ
```

Variabilele au fost adăugate și în `.env.example` cu valori placeholder.

---

## 2. Fișiere create / modificate

### `src/app/api/checkout/creem/route.ts` — [NOU]

Ruta API care generează o sesiune de checkout Creem:

- Verifică autentificarea utilizatorului via Supabase (`getAuthenticatedUser()`).
- Face `POST https://api.creem.io/v1/checkouts` cu header `x-api-key`.
- Câmpuri din body (conform API-ului Creem): `product_id`, `requestId`, `success_url`, `metadata`.
- **Creem NU acceptă**: `customer_email`, `cancel_url`, `Authorization: Bearer`.
- Returnează `{ checkoutUrl }` pe care frontend-ul face `window.location.href`.

### `src/app/api/webhooks/creem/route.ts` — [NOU]

Webhook-ul care primește notificări de la Creem la finalizarea plăților:

- **Verificare semnătură HMAC-SHA256**: citește raw body, compară cu header-ul `creem-signature` folosind `crypto.timingSafeEqual` (timing-safe).
- **Structura payload-ului Creem**: câmpul de tip eveniment este `eventType` (NU `event`), datele sunt în `object` (NU `data`).
- Evenimente care activează Pro (`profiles.tier = 'pro'`):
  - `checkout.completed`
  - `subscription.active`
  - `subscription.paid`
- Evenimente care dezactivează Pro (`profiles.tier = 'free'`):
  - `subscription.canceled`
  - `subscription.expired`
  - `subscription.unpaid`
  - `subscription.past_due`
- Extrage `user_id` din `body.object.metadata.user_id`.
- Folosește `createAdminClient()` (service role) pentru update-ul în Supabase.

### `src/app/preturi/page.tsx` — [MODIFICAT]

Pagina de prețuri actualizată cu checkout live:

- Butonul **"Alege Pro" / "Choose Pro"** apelează `POST /api/checkout/creem` și redirecționează la checkout-ul Creem.
- **Loading state**: butonul se dezactivează și textul devine "Se conectează la Creem..." în timpul request-ului.
- **Error state**: afișează un banner `<Callout>` cu mesajul de eroare returnat de API.
- **Success state**: detectează `?checkout=success` din URL și afișează banner de confirmare.
- Utilizatorii neautentificați sunt redirecționați la `/cont`.
- Textul callout-ului actualizat — eliminat menționarea "activare manuală", înlocuit cu "procesate prin Creem cu activare instantanee".

### `.env.local` — [MODIFICAT]

Adăugate cele 3 variabile Creem (vezi secțiunea 1).

### `.env.example` — [MODIFICAT]

Adăugată secțiunea Creem Payment Processor cu valori placeholder.

---

## 3. Configurare Creem Dashboard

### Produs
- **Nume**: Pro
- **Product ID**: `prod_dQMs5ZfLQFgVoKERSEGnQ`

### Webhook
- **URL**: `https://www.verifact.ro/api/webhooks/creem`
- **Signing Secret**: `whsec_2HN9ofktZ2LiPVqmocsjmO`
- **Evenimente selectate** (7 din 13):
  - `checkout.completed`
  - `subscription.active`
  - `subscription.paid`
  - `subscription.canceled`
  - `subscription.expired`
  - `subscription.unpaid`
  - `subscription.past_due`
- **Evenimente NU selectate** (nu le folosim):
  - `subscription.trialing` (nu avem trial)
  - `subscription.scheduled_cancel` (doar planificat, nu acționăm)
  - `subscription.update` (un singur plan)
  - `subscription.paused` (nu avem funcționalitate de pause)
  - `refund.created` (informativ)
  - `dispute.created` (informativ)

---

## 4. Fluxul complet

```
Utilizator apasă "Alege Pro" pe /preturi
       ↓
POST /api/checkout/creem
  → verifică autentificarea Supabase
  → creează sesiune checkout la Creem API
  → returnează checkout_url
       ↓
Frontend face window.location.href = checkout_url
  → utilizatorul plătește pe checkout.creem.io
       ↓
Creem POST → /api/webhooks/creem
  → verifică semnătura HMAC-SHA256
  → extrage user_id din metadata
  → updatează profiles.tier = 'pro' în Supabase
       ↓
Creem redirecționează utilizatorul pe /preturi?checkout=success
  → banner de confirmare "Abonament Activat!"
       ↓
checkUsageLimit() citește tier='pro' → 30 verificări/lună
```

---

## 5. API Creem — Referință rapidă

### Autentificare
- Header: `x-api-key: <API_KEY>` (NU `Authorization: Bearer`)
- Producție: `https://api.creem.io/v1`
- Test: `https://test-api.creem.io/v1`

### POST /v1/checkouts — câmpuri acceptate
| Câmp | Tip | Obligatoriu | Descriere |
|------|-----|-------------|-----------|
| `product_id` | string | DA | ID-ul produsului din dashboard |
| `success_url` | string | Nu | URL redirect după plată reușită |
| `metadata` | object | Nu | Key-value pairs custom |
| `units` | number | Nu | Cantitate |
| `discountCode` | string | Nu | Cod promoțional |

**NU sunt acceptate** (Creem returnează eroare de validare): `customer_email`, `cancel_url`, `customer`, `price_id`, `requestId`.

### Răspuns: `{ id, checkout_url }`

### Webhook payload
```json
{
  "eventType": "checkout.completed",
  "object": {
    "id": "ch_xxx",
    "status": "completed",
    "product_id": "prod_xxx",
    "metadata": {
      "user_id": "supabase-uuid",
      "email": "user@example.com"
    }
  }
}
```

### Verificare semnătură webhook
- Header: `creem-signature` (sau `x-creem-signature`)
- Algoritm: HMAC-SHA256 din raw body + webhook secret
- Comparare: `crypto.timingSafeEqual()`

---

## 6. Vercel Deploy

- **Team**: `combating-misinformation`
- **Proiect**: `verifact`
- **URL producție**: `https://www.verifact.ro`
- **Variabilele de mediu Creem** au fost adăugate pe Vercel cu `vercel env add` pentru environment-ul `production`.
- Proiectul a fost legat cu `vercel link --yes --project verifact`.

---

## 7. Sistemul de tier-uri existent (context)

Profilurile utilizatorilor sunt în tabela Supabase `profiles` cu coloana `tier` (`'free' | 'pro' | 'business'`).

Limitele sunt definite în `src/types/user.ts`:
```typescript
export const TIER_CONFIG = {
  free: { monthlyLimit: 3 },
  pro: { monthlyLimit: 30 },
  business: { monthlyLimit: 1000 },
} as const;
```

`checkUsageLimit()` din `src/lib/usage/limits.ts` citește automat `tier` din profil și aplică limita corespunzătoare. Webhook-ul actualizează `tier` → sistemul de limite funcționează automat.

---

## 8. Ce NU s-a făcut încă

- [ ] Pagina `/cont` nu gestionează un parametru `?redirect=` — după login, utilizatorul nu este redirecționat automat înapoi pe `/preturi`.
- [ ] Nu există o pagină de management abonament (anulare, schimbare plan) — utilizatorii trebuie să anuleze prin Creem sau prin email.
- [ ] Nu s-a implementat `subscription_id` pe profil — webhook-ul salvează doar tier-ul, nu și ID-ul abonamentului.
- [ ] Nu există încă un plan yearly vs monthly diferențiat în Creem (un singur produs creat).
- [ ] Webhook-ul nu loghează evenimentele într-un tabel de audit (doar console.error la erori).
