import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from('verifications')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: 'Failed to delete verification' }, { status: 500 });
  }

  return Response.json({ success: true });
}
