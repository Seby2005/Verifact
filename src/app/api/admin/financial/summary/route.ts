import { requireAdmin, AuthorizationError } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateFinancialMetrics } from '@/lib/financial/stats';

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

  try {
    const adminClient = createAdminClient();
    const metrics = await calculateFinancialMetrics(adminClient);
    return Response.json({ success: true, metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Eroare la calculul metricilor financiare.';
    return Response.json({ error: message }, { status: 500 });
  }
}
