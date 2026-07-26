import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { fileDispute } from '@/lib/verification/disputes';

export const dynamic = 'force-dynamic';

interface DisputeRequestBody {
  reason?: string;
  email?: string;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Files a correction request against a report ("Raportează eroare" in
 * ReportView). Anyone who can already view the report (it's public, or
 * they own it — same rule as GET /api/reports/[id]) can dispute it,
 * including anonymous visitors; see src/lib/verification/disputes.ts and
 * the RLS policy in supabase/migrations/005_disputes.sql for the same
 * check enforced again at the database level.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const rateLimitResult = await checkRateLimit(`dispute:${ip}`, 5, 60 * 60 * 1000);
  if (!rateLimitResult.success) {
    return Response.json(
      { success: false, error: 'Prea multe contestații trimise. Te rugăm să încerci din nou mai târziu.' },
      { status: 429 }
    );
  }

  let body: DisputeRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Corp cerere JSON invalid' }, { status: 400 });
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < MIN_REASON_LENGTH || reason.length > MAX_REASON_LENGTH) {
    return Response.json(
      {
        success: false,
        error: `Motivul trebuie să aibă între ${MIN_REASON_LENGTH} și ${MAX_REASON_LENGTH} de caractere.`,
      },
      { status: 400 }
    );
  }

  let email: string | null = null;
  if (typeof body.email === 'string' && body.email.trim()) {
    const trimmedEmail = body.email.trim().slice(0, MAX_EMAIL_LENGTH);
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      return Response.json({ success: false, error: 'Adresa de email nu este validă.' }, { status: 400 });
    }
    email = trimmedEmail;
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await fileDispute(
    { verificationId: params.id, reason, email, userId: user?.id ?? null },
    supabase
  );

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }

  return Response.json({ success: true });
}
