import { requireAdmin, AuthorizationError, logAdminAction } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiPricing } from '@/types/database';

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
  const { data, error } = await (adminClient.from('api_pricing') as unknown as {
    select: (fields: string) => {
      order: (field: string, opts: { ascending: boolean }) => Promise<{
        data: ApiPricing[] | null;
        error: { message: string } | null;
      }>;
    };
  })
    .select('*')
    .order('provider', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ pricing: data ?? [] });
}

export async function PUT(request: Request): Promise<Response> {
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
  const model = typeof b.model === 'string' ? b.model.trim() : '';
  const provider = typeof b.provider === 'string' ? b.provider.trim() : 'gemini';
  const priceInput = Number(b.price_per_million_input_tokens);
  const priceOutput = Number(b.price_per_million_output_tokens);
  const currency = typeof b.currency === 'string' ? b.currency.trim().toUpperCase() : 'USD';

  if (!model) {
    return Response.json({ error: 'Identificatorul modelului este obligatoriu.' }, { status: 400 });
  }

  if (!Number.isFinite(priceInput) || priceInput < 0 || !Number.isFinite(priceOutput) || priceOutput < 0) {
    return Response.json({ error: 'Prețurile per milion de tokeni trebuie să fie numere pozitive.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const upsertData = {
    provider,
    model,
    price_per_million_input_tokens: priceInput,
    price_per_million_output_tokens: priceOutput,
    currency,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (adminClient.from('api_pricing') as unknown as {
    upsert: (d: typeof upsertData, opts: { onConflict: string }) => {
      select: () => {
        single: () => Promise<{ data: ApiPricing | null; error: { message: string } | null }>;
      };
    };
  })
    .upsert(upsertData, { onConflict: 'model' })
    .select()
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? 'Eroare la actualizarea tarifului API.' }, { status: 500 });
  }

  await logAdminAction({
    adminId: adminUser.id,
    actionType: 'api_pricing.update',
    targetTable: 'api_pricing',
    targetId: data.id,
    details: { model, provider, priceInput, priceOutput, currency },
  });

  return Response.json({ success: true, pricing: data });
}
