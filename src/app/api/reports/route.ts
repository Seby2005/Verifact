import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const searchParams = url.searchParams;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  const language = searchParams.get('language');
  const verdict = searchParams.get('verdict');
  const search = searchParams.get('search');
  const period = searchParams.get('period');
  const userOnly = searchParams.get('user_only') === 'true';

  const user = await getAuthenticatedUser();
  const supabase = userOnly && user ? createServerClient() : createAdminClient();

  let query = supabase
    .from('verifications')
    .select('*', { count: 'exact' });

  if (userOnly && user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.eq('is_public', true);
  }

  if (language && language !== 'all') {
    query = query.eq('language', language);
  }

  if (verdict && verdict !== 'all') {
    query = query.eq('verdict', verdict);
  }

  if (search && search.trim() !== '') {
    query = query.ilike('input_text', `%${search.trim()}%`);
  }

  if (period && period !== 'all') {
    const now = new Date();
    let cutoff: Date | null = null;
    if (period === '24h') {
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === '7d') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (cutoff) {
      query = query.gte('created_at', cutoff.toISOString());
    }
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: reports, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    reports: reports || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
