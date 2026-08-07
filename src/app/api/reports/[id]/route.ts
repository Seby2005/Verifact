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

  let body: { is_public?: boolean; isPublic?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const isPublic = typeof body.is_public === 'boolean' ? body.is_public : body.isPublic;
  if (typeof isPublic !== 'boolean') {
    return Response.json({ error: 'is_public must be a boolean' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: updated, error } = await supabase
    .from('verifications')
    .update({ is_public: isPublic } as never)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !updated) {
    return Response.json({ error: 'Failed to update visibility' }, { status: 500 });
  }

  return Response.json({ report: updated, success: true });
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
