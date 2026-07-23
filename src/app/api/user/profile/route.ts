import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return Response.json({ error: 'Profile not found' }, { status: 404 });

  return Response.json({ profile });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { username?: string; avatarUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};

  if (typeof body.username === 'string') {
    updates.username = body.username.trim();
  }
  if (typeof body.avatarUrl === 'string') {
    updates.avatar_url = body.avatarUrl;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates as never)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return Response.json({ error: 'Update failed' }, { status: 500 });

  return Response.json({ profile });
}
