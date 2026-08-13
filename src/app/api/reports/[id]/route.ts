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

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('verifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json({ error: 'Failed to delete report' }, { status: 500 });
  }

  return Response.json({ success: true });
}
