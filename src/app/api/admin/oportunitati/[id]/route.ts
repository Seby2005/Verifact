import { requireAdmin, AuthorizationError, logAdminAction } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OpportunityStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: OpportunityStatus[] = ['new', 'reviewed', 'dismissed', 'used'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
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

  let body: { status?: OpportunityStatus };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Corp JSON invalid.' }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return Response.json(
      { error: `Status invalid. Opțiuni valide: ${VALID_STATUSES.join(', ')}.` },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data, error } = await (adminClient.from('content_opportunities') as unknown as {
    update: (fields: { status: OpportunityStatus }) => {
      eq: (field: string, val: string) => {
        select: () => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  })
    .update({ status: body.status })
    .eq('id', id)
    .select();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId: user.id,
    actionType: 'opportunity.update_status',
    targetTable: 'content_opportunities',
    targetId: id,
    details: { status: body.status },
  });

  return Response.json({
    success: true,
    status: body.status,
    opportunity: data && data.length > 0 ? data[0] : null,
  });
}
