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
  } catch {
    return Response.json({ error: 'Eroare la încărcarea cheilor API' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: unknown; scopes?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  try {
    const apiKey = await createApiKey(user.id, body.name, body.scopes);
    return Response.json({ success: true, apiKey });
  } catch (err) {
    // Only stable codes leave this route; database detail stays in the log.
    const message = err instanceof Error ? err.message : '';
    if (message.includes('FORBIDDEN')) {
      return Response.json(
        { error: 'Accesul la chei API este rezervat conturilor Business.' },
        { status: 403 }
      );
    }
    if (message.includes('KEY_LIMIT')) {
      return Response.json(
        { error: 'Ai atins numărul maxim de chei active. Revocă o cheie înainte să creezi alta.' },
        { status: 400 }
      );
    }
    return Response.json({ error: 'Eroare la crearea cheii API' }, { status: 500 });
  }
}
