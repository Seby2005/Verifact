import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

interface VerificationRecord {
  id: string;
  user_id: string | null;
  is_public: boolean;
  [key: string]: unknown;
}

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  const report = data as VerificationRecord;

  if (!report.is_public && report.user_id !== user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ report });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { is_public?: boolean; isPublic?: boolean; show_author?: boolean; showAuthor?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const isPublic = typeof body.is_public === 'boolean' ? body.is_public : body.isPublic;
  if (typeof isPublic !== 'boolean') {
    return Response.json({ error: 'is_public must be a boolean' }, { status: 400 });
  }

  const showAuthor = typeof body.show_author === 'boolean' ? body.show_author : body.showAuthor;

  const { setReportVisibility } = await import('@/lib/verification/public-reports');
  const result = await setReportVisibility({
    verificationId: id,
    userId: user.id,
    isPublic,
    showAuthor,
  });

  if (!result.success) {
    const status = result.code === 'FORBIDDEN' ? 403 : result.code === 'REPORT_NOT_FOUND' ? 404 : 400;
    return Response.json({ error: result.error, code: result.code }, { status });
  }

  return Response.json({
    success: true,
    isPublic: result.isPublic,
    visibilityStatus: result.visibilityStatus,
    showAuthor: result.showAuthor,
    message: result.message,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  // Check if user is owner or admin (sebi.iancu23@gmail.com or role === admin)
  const { data: profile } = await (adminClient as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = (profile as { role?: string } | null)?.role === 'admin' || user.email?.toLowerCase() === 'sebi.iancu23@gmail.com';

  if (!isAdmin) {
    const { data: verification } = await (adminClient as any)
      .from('verifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!verification || (verification as { user_id: string }).user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Set visibility_status to taken_down and is_public to false
  const { error } = await (adminClient as any)
    .from('verifications')
    .update({
      is_public: false,
      visibility_status: 'taken_down',
    })
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Purge Next.js cache on Vercel
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/rapoarte');
  revalidatePath(`/rapoarte/${id}`);
  revalidatePath('/sitemap.xml');

  return Response.json({ success: true, message: 'Raport șters cu succes de administrator.' });
}
