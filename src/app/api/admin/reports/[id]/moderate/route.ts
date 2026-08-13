import { requireAdmin, AuthorizationError } from '@/lib/auth/admin';
import { moderateReport } from '@/lib/verification/public-reports';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let user;
  try {
    const adminSession = await requireAdmin({ allowModerator: true });
    user = adminSession.user;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'Eroare de autorizare.' }, { status: 403 });
  }

  let body: { action?: 'approve' | 'take_down' | 'reject'; note?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Corp JSON invalid.' }, { status: 400 });
  }

  if (!body.action || !['approve', 'take_down', 'reject'].includes(body.action)) {
    return Response.json(
      { error: 'Acțiune invalidă. Opțiuni valide: approve, take_down, reject.' },
      { status: 400 }
    );
  }

  const result = await moderateReport({
    verificationId: id,
    adminUserId: user.id,
    action: body.action,
    note: body.note,
  });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({
    success: true,
    action: body.action,
    message: `Raportul a fost actualizat cu succes (${body.action}).`,
  });
}
