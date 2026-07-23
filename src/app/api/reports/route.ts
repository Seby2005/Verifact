import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

interface ProfileRecord {
  tier?: string | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get('limit') || '30', 10);
  const offsetParam = parseInt(url.searchParams.get('offset') || '0', 10);
  const limit = Math.min(100, Math.max(1, limitParam));
  const offset = Math.max(0, offsetParam);

  const user = await getAuthenticatedUser();
  const supabase = createServerClient();

  let query = supabase
    .from('verifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.eq('is_public', true);
  }

  const { data: reports, count, error } = await query;

  if (error) {
    return Response.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }

  return Response.json({
    reports: reports || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
}
