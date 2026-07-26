import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const KNOWN_STORAGE_BUCKETS = ['screenshots', 'avatars', 'user-uploads'];

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Trebuie să fii autentificat pentru a efectua această acțiune.' },
        { status: 401 }
      );
    }

    // 1. Rate limiting check (max 5 delete attempts per hour per user)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateCheck = await checkRateLimit(`delete-account:${user.id || clientIp}`, 5, 60 * 60 * 1000);

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Ai depășit limita de încercări de ștergere. Te rugăm să aștepți o oră înainte de a încerca din nou.' },
        { status: 429 }
      );
    }

    const admin = createAdminClient();

    // 2. Explicitly delete private verifications owned by this user
    // (Public verifications stay in the database with user_id = NULL for transparency)
    const { error: privateVerificationsErr } = await admin
      .from('verifications')
      .delete()
      .eq('user_id', user.id)
      .eq('is_public', false);

    if (privateVerificationsErr) {
      logger.error('Failed to delete private verifications during account deletion', {
        service: 'api/user/delete',
        userId: user.id,
        error: privateVerificationsErr,
      });
    }

    // 3. Storage Cleanup: Remove any uploaded user files in storage buckets if they exist
    for (const bucketName of KNOWN_STORAGE_BUCKETS) {
      try {
        const { data: fileList } = await admin.storage.from(bucketName).list(user.id);
        if (fileList && fileList.length > 0) {
          const filesToRemove = fileList.map((f) => `${user.id}/${f.name}`);
          await admin.storage.from(bucketName).remove(filesToRemove);
        }
      } catch {
        // Storage bucket may not exist or may not contain user files — ignore gracefully
      }
    }

    // 4. Delete user from Supabase Auth
    // Cascades to profiles table (ON DELETE CASCADE) and sets user_id to NULL on remaining public verifications (ON DELETE SET NULL).
    const { error: deleteUserErr } = await admin.auth.admin.deleteUser(user.id);

    if (deleteUserErr) {
      logger.error('Failed to delete auth user from Supabase Admin', {
        service: 'api/user/delete',
        userId: user.id,
        error: deleteUserErr,
      });
      return NextResponse.json(
        { error: 'A apărut o eroare la ștergerea contului. Te rugăm să încerci din nou mai târziu.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/user/delete', {
      service: 'api/user/delete',
      error,
    });
    return NextResponse.json(
      { error: 'A apărut o eroare neașteptată. Te rugăm să reîncerci.' },
      { status: 500 }
    );
  }
}
