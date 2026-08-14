import { requireAdmin, AuthorizationError, logAdminAction } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FixedCost } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await requireAdmin({ allowModerator: false });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'Eroare de autorizare.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await (adminClient.from('fixed_costs') as unknown as {
    select: (fields: string) => {
      order: (field: string, opts: { ascending: boolean }) => Promise<{
        data: FixedCost[] | null;
        error: { message: string } | null;
      }>;
    };
  })
    .select('*')
    .order('monthly_amount', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ fixedCosts: data ?? [] });
}

export async function POST(request: Request): Promise<Response> {
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
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const category = typeof b.category === 'string' ? b.category.trim() : 'other';
  const monthlyAmount = Number(b.monthly_amount);
  const currency = typeof b.currency === 'string' ? b.currency.trim().toUpperCase() : 'EUR';
  const note = typeof b.note === 'string' ? b.note.trim() : null;

  if (!name || name.length < 2) {
    return Response.json({ error: 'Numele costului fix este obligatoriu (minim 2 caractere).' }, { status: 400 });
  }

  if (!Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
    return Response.json({ error: 'Suma lunară trebuie să fie un număr pozitiv.' }, { status: 400 });
  }

  const validCurrencies = ['EUR', 'USD', 'RON'];
  if (!validCurrencies.includes(currency)) {
    return Response.json({ error: 'Moneda trebuie să fie EUR, USD sau RON.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const insertPayload = {
    name,
    category,
    monthly_amount: monthlyAmount,
    currency,
    note,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (adminClient.from('fixed_costs') as unknown as {
    insert: (d: typeof insertPayload) => {
      select: () => {
        single: () => Promise<{ data: FixedCost | null; error: { message: string } | null }>;
      };
    };
  })
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? 'Eroare la adăugarea costului fix.' }, { status: 500 });
  }

  await logAdminAction({
    adminId: adminUser.id,
    actionType: 'fixed_cost.create',
    targetTable: 'fixed_costs',
    targetId: data.id,
    details: { name, monthlyAmount, currency, category },
  });

  return Response.json({ success: true, fixedCost: data }, { status: 201 });
}
