import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createClient as createServerClient } from '@/lib/supabase/server';

interface VerificationRecord {
  id: string;
  user_id: string | null;
  is_public: boolean;
  [key: string]: unknown;
}

export const dynamic = 'force-dynamic';

// What a reader may see of a report. Never `select('*')`: the row also holds
// the anonymous IP hash, the owner's id, moderation stamps and AI token counts.
const READER_COLUMNS =
  'id, user_id, input_type, input_text, verdict, score, report_json, is_public, visibility_status, language, show_author, image_urls, created_at, published_at';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('verifications')
    .select(READER_COLUMNS)
    .eq('id', id)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  const report = data as VerificationRecord;

  if (!report.is_public && report.user_id !== user?.id) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  // user_id was read only for the ownership check above.
  const { user_id: _owner, ...visible } = report;
  void _owner;
  return Response.json({ report: visible });
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
    userEmail: user.email,
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

  // Check if the caller is the report owner or an admin. Admin is
  // profiles.role only: ADMIN_EMAILS lifts usage caps, it does not let anyone
  // take down other people's reports.
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = (profile as { role?: string } | null)?.role === 'admin';

  if (!isAdmin) {
    const { data: verification } = await adminClient
      .from('verifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!verification || (verification as { user_id: string }).user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Set visibility_status to taken_down and is_public to false
  const { error } = await adminClient
    .from('verifications')
    .update({
      is_public: false,
      visibility_status: 'taken_down',
    } as never)
    .eq('id', id);

  if (error) {
    return Response.json({ error: 'Ștergerea raportului a eșuat.' }, { status: 500 });
  }

  // Purge Next.js cache on Vercel
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/rapoarte');
  revalidatePath(`/rapoarte/${id}`);
  revalidatePath('/sitemap.xml');

  return Response.json({ success: true, message: 'Raport șters cu succes de administrator.' });
}
