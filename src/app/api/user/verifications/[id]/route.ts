import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('verifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    return Response.json({ error: 'Failed to delete verification' }, { status: 500 });
  }
  // Zero rows is a wrong id or someone else's report, not a success.
  if (!data || data.length === 0) {
    return Response.json({ error: 'Verification not found' }, { status: 404 });
  }

  return Response.json({ success: true });
}
