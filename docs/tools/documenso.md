# Documenso — e-signature self-hosted (FAZA 2 — doar research + setup)

> **Status: research + instrucțiuni de setup. Nefolosit acum, nu e în compose.**
> Util pentru contracte SRL/finanțare, nu urgent de rulat.

## Ce face
Documenso este alternativa open-source la DocuSign: încarci un PDF, adaugi câmpuri
de semnătură, trimiți spre semnare, primești documentul semnat + audit trail. Utile
pentru: contracte cu investitori, acorduri de confidențialitate, documente SRL.

## De ce e amânat
E-signature-ul cere un instance stabil (email transactional, storage, semnături
criptografice) și nu e pe calea critică a produsului. Îl standardizezi când începi
runda de finanțare / contractele juridice.

## Setup (când e nevoie)
Documenso oferă un `docker-compose.yml` propriu. Pași:
1. `git clone https://github.com/documenso/documenso`
2. Necesită: **Postgres**, **SMTP** (email transactional — Brevo/Resend, deja ai
   chei), și o **cheie de semnătură** (certificat `.p12` — vezi docs oficiale,
   „Signing Certificate”).
3. Env cheie: `NEXTAUTH_SECRET`, `NEXT_PRIVATE_ENCRYPTION_KEY`,
   `NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH` (certificatul), `SMTP_*`,
   `NEXT_PUBLIC_WEBAPP_URL`.
4. Rulează pe VPS-ul EU (împreună cu Coolify, faza 2), nu local.

## Integrare cu Verifact
Minimă și indirectă: refolosește providerul de email deja configurat
(`src/lib/email/`) pentru notificările de semnare. Nu necesită cod în app.

## Licență & activitate (verificat 2026-08-06)
- **Licență: AGPL-3.0** ✅ (OSI, copyleft) + module enterprise (`/ee`) separate.
- Activitate: ~14.290 ★, foarte activ.
- **Notă pentru finanțare:** semnături pe infra ta (contracte sensibile nu trec
  prin DocuSign/US). Argument bun de sovereignty juridică; folosește core-ul AGPL.
