import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { listApiKeys, createApiKey } from '@/lib/auth/api-keys';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await listApiKeys(user.id);
    return Response.json({ success: true, keys });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Eroare la încărcarea cheilor API';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string; scopes?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  try {
    const apiKey = await createApiKey(user.id, body.name, body.scopes);
    return Response.json({ success: true, apiKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Eroare la crearea cheii API';
    if (message.includes('FORBIDDEN')) {
      return Response.json(
        { error: 'Accesul la chei API este rezervat conturilor Business.' },
        { status: 403 }
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
