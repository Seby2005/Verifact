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

  let body: { isPublic?: boolean; is_public?: boolean; showAuthor?: boolean; show_author?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const isPublic = typeof body.isPublic === 'boolean' ? body.isPublic : typeof body.is_public === 'boolean' ? body.is_public : undefined;
  const showAuthor = typeof body.showAuthor === 'boolean' ? body.showAuthor : typeof body.show_author === 'boolean' ? body.show_author : undefined;

  if (typeof isPublic !== 'boolean' && typeof showAuthor !== 'boolean') {
    return Response.json({ error: 'At puțin un parametru (isPublic/is_public sau showAuthor/show_author) este obligatoriu' }, { status: 400 });
  }

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
