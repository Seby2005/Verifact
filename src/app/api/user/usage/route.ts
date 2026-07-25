import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { checkUsageLimit } from '@/lib/usage/limits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const limitCheck = await checkUsageLimit(user.id);
    return Response.json({ success: true, usage: limitCheck });
  } catch {
    return Response.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
