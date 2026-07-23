import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const verdict = searchParams.get('verdict');
  const limit = 30;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();
  let query = supabase
    .from('verifications')
    .select('id, input_text, verdict, score, is_public, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (verdict) {
    query = query.eq('verdict', verdict);
  }

  const { data, count, error } = await query;
  if (error) return Response.json({ error: 'Server error' }, { status: 500 });

  return Response.json({
    verifications: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit) || 1,
  });
}
