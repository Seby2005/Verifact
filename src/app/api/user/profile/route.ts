import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/;

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServerClient();
  const updates: Record<string, unknown> = {};

  if (typeof body.username === 'string') {
    const trimmed = body.username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      return Response.json(
        { error: 'Numele de utilizator trebuie să aibă 3-30 de caractere (litere, cifre, _ . -).' },
        { status: 400 }
      );
    }
    updates.username = trimmed;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 });
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
