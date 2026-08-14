import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, rawLimit)) : 20;

  const verdict = searchParams.get('verdict');
  const search = searchParams.get('q') || searchParams.get('search');
  const offset = (page - 1) * limit;

  const supabase = await createServerClient();
  let query = supabase
    .from('verifications')
    .select('id, input_text, input_type, verdict, score, is_public, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (verdict && verdict !== 'all') {
    query = query.eq('verdict', verdict);
  }

  if (search && search.trim().length > 0) {
    query = query.ilike('input_text', `%${search.trim()}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return Response.json({ error: 'Server error' }, { status: 500 });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return Response.json({
    verifications: data || [],
    total,
    page,
    limit,
    totalPages,
  });
}
