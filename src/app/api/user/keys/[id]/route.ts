import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { revokeApiKey } from '@/lib/auth/api-keys';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return Response.json({ error: 'Identificator cheie lipsă' }, { status: 400 });
  }

  const success = await revokeApiKey(id, user.id);
  if (!success) {
    return Response.json({ error: 'Eroare la revocarea cheii API' }, { status: 500 });
  }

  return Response.json({ success: true });
}
