/**
 * Single source of truth for the email-based admin allowlist.
 *
 * Authorization is normally the `role` column on `profiles`. This allowlist is
 * the narrow escape hatch that keeps the project owner in even if that row is
 * wrong, and it exists in exactly one place so the rule cannot drift between
 * the call sites that consult it (usage caps, report deletion).
 *
 * Server-only: `ADMIN_EMAILS` is deliberately not a NEXT_PUBLIC_ variable, so
 * the list never ships to the browser. Client code must gate on `role` instead.
 */

/** Owner account, kept as the fallback so an unset ADMIN_EMAILS cannot lock the project out. */
const OWNER_EMAIL = 'sebi.iancu23@gmail.com';

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === OWNER_EMAIL) return true;

  const configured = process.env.ADMIN_EMAILS;
  if (!configured) return false;

  return configured
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .includes(normalized);
}
