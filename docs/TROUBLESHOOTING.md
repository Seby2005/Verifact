# Troubleshooting

## "Failed to fetch" when creating an account

**Symptom.** The register form (and login) shows a bare `Failed to fetch`
instead of creating the account. Nothing appears in the Next.js server log,
because the request never reaches the Next.js server.

**Why it looks like nothing happened.** Signup does not go through the app's
API. `RegisterForm` calls `supabase.auth.signUp()`, which the browser sends
straight to `https://<project>.supabase.co/auth/v1/signup`. So the server log
stays quiet and only the browser knows the request failed.

**Why the message was useless.** `supabase-js` does not throw on network
failures — it returns an `AuthRetryableFetchError` whose `message` is the raw
browser string `"Failed to fetch"`. The form rendered `error.message`
verbatim, so the browser's generic network error became the user-facing error.

### Root cause

`connect-src` in the Content-Security-Policy (`next.config.mjs`) allowed only
`https://*.supabase.co`. Any other Supabase origin was blocked by the browser
before a packet was sent, and a CSP block surfaces to JavaScript as exactly
`TypeError: Failed to fetch`. Reproduced in the browser console:

```js
await fetch('https://iqszqrilxuqhcnwskxnj.supabase.co/auth/v1/health')  // ok 401
await fetch('http://localhost:54321/auth/v1/health')  // TypeError: Failed to fetch
await fetch('https://db.example.com/auth/v1/health')  // TypeError: Failed to fetch
```

This hits you whenever `NEXT_PUBLIC_SUPABASE_URL` is not a hosted
`*.supabase.co` project — a local stack from `supabase start`
(`http://127.0.0.1:54321`), a custom domain, or a self-hosted instance.

### What was changed

1. `next.config.mjs` now derives `connect-src` from
   `NEXT_PUBLIC_SUPABASE_URL` (plus the `ws(s)://` variant for Realtime),
   keeping the hosted wildcard as well. An invalid URL logs a build-time
   warning instead of silently producing a policy that blocks everything.
2. `src/lib/auth/auth-errors.ts` maps auth errors to actionable text. Network
   failures now say *"Nu am putut contacta serverul de autentificare… verifică
   NEXT_PUBLIC_SUPABASE_URL din .env.local"* and the original error plus the
   configured URL are logged to the console. Register and login share it.

**`next.config.mjs` is read at startup — restart `npm run dev` after changing
`NEXT_PUBLIC_SUPABASE_URL`**, or the CSP will still reflect the old value.

### If it still fails

Work down this list; each step rules out one cause.

1. **Is the URL set and correct?**
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/health"
   ```
   `200` means the project is reachable. A connection error means the URL is
   wrong or the project is unreachable.

2. **Is the project paused?** Free Supabase projects pause after a period of
   inactivity. A paused project fails to connect, which again shows up as
   `Failed to fetch`. Resume it from the dashboard.

3. **Are signups enabled?**
   ```bash
   curl -s -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings"
   ```
   Check `disable_signup` is `false`.

4. **Does the CSP allow your origin?** Look at the response header:
   ```bash
   curl -s -D - -o /dev/null http://localhost:3000/register | grep -i content-security-policy
   ```
   Your Supabase origin must appear in `connect-src`.

5. **Is an extension blocking it?** Ad and tracker blockers sometimes block
   Supabase domains. Retry in a private window with extensions disabled.

6. **Is the disk full?** A full disk makes `next dev` fail to write `.next`,
   which produces unrelated-looking failures across the app. `npm install` can
   also leave a truncated `@next/swc-*` binary behind, and the dev server then
   refuses to start with *"not a valid Win32 application"*. Fix by freeing
   space and reinstalling that package.

---

## Reports return 404 right after a successful verification

**Symptom.** `POST /api/verify` answers `200` with a `reportId`, but
`GET /api/reports/{id}` answers `404 Report not found`, so the progress tracker
polls for 45 seconds and then reports a timeout.

**Cause.** Infinite recursion in the RLS policies (`0009_rls_policies.sql`).
`profiles_select_own` sub-SELECTs `public.profiles` inside its own SELECT
policy, and `verifications_select` sub-SELECTs `profiles` too, so Postgres
aborts with:

```
42P17: infinite recursion detected in policy for relation "profiles"
```

The rows are written correctly — confirmed by reading them with the
service-role key, which bypasses RLS — they simply cannot be read back.

This also silently degrades authenticated features: `AuthContext` falls back to
a synthetic `free` profile, and `checkUsageLimit()` returns `allowed: true` on
error, so **tier limits are not enforced**.

**Fix.** `supabase/migrations/0010_fix_rls_recursion.sql` replaces every
`EXISTS (SELECT … FROM profiles …)` role check with a `SECURITY DEFINER`
function (`public.current_user_role()`), which is not subject to RLS and
therefore cannot recurse.

**This migration has not been applied to the hosted project yet** — there is no
Supabase CLI, Docker or `psql` in this environment and the database password is
not in `.env.local`. Apply it with either:

```bash
npx supabase db push
```

or by pasting the file into the SQL editor in the Supabase dashboard.

Verify afterwards — this should return rows rather than a `42P17` error:

```bash
curl -s -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/verifications?select=id&limit=1"
```
