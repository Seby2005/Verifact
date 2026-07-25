import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Deleting the auth.users row cascades to profiles (ON DELETE CASCADE) and
  // sets verifications.user_id to NULL (ON DELETE SET NULL), so any reports
  // the user published stay in the public feed, anonymised, exactly as
  // described in the privacy policy — no separate anonymisation step needed.
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('[/api/user/delete] Failed to delete user:', error);
    return Response.json({ error: 'Ștergerea contului a eșuat. Încearcă din nou.' }, { status: 500 });
  }

  return Response.json({ success: true });
}
