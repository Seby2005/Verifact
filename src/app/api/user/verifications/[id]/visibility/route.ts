import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { isPublic?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.isPublic !== 'boolean') {
    return Response.json({ error: 'isPublic must be a boolean' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('verifications')
    .update({ is_public: body.isPublic } as never)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: 'Failed to update visibility' }, { status: 500 });
  }

  return Response.json({ success: true, isPublic: body.isPublic });
}
