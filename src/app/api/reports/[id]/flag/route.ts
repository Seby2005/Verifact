import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { flagReport } from '@/lib/verification/public-reports';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { error: 'Autentificarea este necesară pentru a raporta un conținut.' },
      { status: 401 }
    );
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }

  const result = await flagReport({
    verificationId: id,
    reporterUserId: user.id,
    reason: body.reason,
  });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({
    success: true,
    message: 'Raportul a fost semnalat pentru moderare.',
  });
}
