import { requireAdmin, AuthorizationError, logAdminAction } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  aggregateDailyOpportunities,
  fetchGoogleNewsForTerm,
  saveOpportunities,
} from '@/lib/opportunities/trends-service';
import type { OpportunityStatus, ContentOpportunity } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin({ allowModerator: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'Eroare de autorizare.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const status: OpportunityStatus =
    statusParam === 'reviewed' || statusParam === 'dismissed' || statusParam === 'used'
      ? statusParam
      : 'new';

  const adminClient = createAdminClient();
  const { data, error } = await (adminClient.from('content_opportunities') as unknown as {
    select: (fields: string) => {
      eq: (field: string, val: string) => {
        order: (field: string, opts: { ascending: boolean }) => {
          order: (field: string, opts: { ascending: boolean; nullsFirst?: boolean }) => Promise<{
            data: ContentOpportunity[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .select('*')
    .eq('status', status)
    .order('fetched_at', { ascending: false })
    .order('trend_rank', { ascending: true, nullsFirst: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ opportunities: data ?? [] });
}

export async function POST(request: Request): Promise<Response> {
  let adminUserId: string;
  try {
    const { user } = await requireAdmin({ allowModerator: true });
    adminUserId = user.id;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'Eroare de autorizare.' }, { status: 403 });
  }

  let customQuery: string | null = null;
  try {
    const body = (await request.json().catch(() => null)) as { query?: string } | null;
    if (body?.query && typeof body.query === 'string' && body.query.trim().length > 0) {
      customQuery = body.query.trim();
    }
  } catch {
    // Body optional
  }

  try {
    const candidates = customQuery
      ? await fetchGoogleNewsForTerm(customQuery, 1, 10)
      : await aggregateDailyOpportunities();

    const result = await saveOpportunities(candidates);

    // The only admin write that used to leave no trace: it also spends paid
    // Google News and AI calls, so the audit trail should say who ran it.
    await logAdminAction({
      adminId: adminUserId,
      actionType: 'opportunity.generate',
      targetTable: 'content_opportunities',
      targetId: 'batch',
      details: { query: customQuery, result },
    });

    const adminClient = createAdminClient();
    const { data: updatedOpportunities, error: fetchError } = await (adminClient.from('content_opportunities') as unknown as {
      select: (fields: string) => {
        eq: (field: string, val: string) => {
          order: (field: string, opts: { ascending: boolean }) => {
            order: (field: string, opts: { ascending: boolean; nullsFirst?: boolean }) => Promise<{
              data: ContentOpportunity[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .select('*')
      .eq('status', 'new')
      .order('fetched_at', { ascending: false })
      .order('trend_rank', { ascending: true, nullsFirst: false });

    if (fetchError) {
      return Response.json({ error: 'Eroare la încărcarea oportunităților.' }, { status: 500 });
    }

    return Response.json({
      success: true,
      result,
      opportunities: updatedOpportunities ?? [],
    });
  } catch {
    return Response.json({ error: 'Eroare la agregarea oportunităților.' }, { status: 500 });
  }
}
