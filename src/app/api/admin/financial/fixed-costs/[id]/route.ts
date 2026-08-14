import { requireAdmin, AuthorizationError, logAdminAction } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FixedCost } from '@/types/database';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<Response> {
  let adminUser;
  try {
    const session = await requireAdmin({ allowModerator: false });
    adminUser = session.user;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'Eroare de autorizare.' }, { status: 403 });
  }

  const { id } = await Promise.resolve(context.params);
  if (!id) {
    return Response.json({ error: 'ID cost fix lipsă.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Format JSON invalid.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Date invalide.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof b.name === 'string') {
    const name = b.name.trim();
    if (name.length < 2) {
      return Response.json({ error: 'Numele trebuie să aibă minim 2 caractere.' }, { status: 400 });
    }
    updatePayload.name = name;
  }

  if (typeof b.category === 'string') {
    updatePayload.category = b.category.trim();
  }

  if (b.monthly_amount !== undefined) {
    const amount = Number(b.monthly_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return Response.json({ error: 'Suma lunară trebuie să fie un număr pozitiv.' }, { status: 400 });
    }
    updatePayload.monthly_amount = amount;
  }

  if (typeof b.currency === 'string') {
    const curr = b.currency.trim().toUpperCase();
    if (!['EUR', 'USD', 'RON'].includes(curr)) {
      return Response.json({ error: 'Moneda trebuie să fie EUR, USD sau RON.' }, { status: 400 });
    }
    updatePayload.currency = curr;
  }

  if (b.note !== undefined) {
    updatePayload.note = typeof b.note === 'string' ? b.note.trim() : null;
  }

  const adminClient = createAdminClient();
  const { data, error } = await (adminClient.from('fixed_costs') as unknown as {
    update: (d: typeof updatePayload) => {
      eq: (field: string, val: string) => {
        select: () => {
          single: () => Promise<{ data: FixedCost | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? 'Eroare la actualizarea costului fix.' }, { status: 500 });
  }

  await logAdminAction({
    adminId: adminUser.id,
    actionType: 'fixed_cost.update',
    targetTable: 'fixed_costs',
    targetId: id,
    details: updatePayload,
  });

  return Response.json({ success: true, fixedCost: data });
}

export async function DELETE(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  let adminUser;
  try {
    const session = await requireAdmin({ allowModerator: false });
    adminUser = session.user;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'Eroare de autorizare.' }, { status: 403 });
  }

  const { id } = await Promise.resolve(context.params);
  if (!id) {
    return Response.json({ error: 'ID cost fix lipsă.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { error } = await (adminClient.from('fixed_costs') as unknown as {
    delete: () => {
      eq: (field: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  })
    .delete()
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId: adminUser.id,
    actionType: 'fixed_cost.delete',
    targetTable: 'fixed_costs',
    targetId: id,
  });

  return Response.json({ success: true });
}
