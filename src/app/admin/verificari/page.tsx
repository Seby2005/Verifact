import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin, AuthorizationError } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVerificationLog, parseVerificationLogQuery } from '@/lib/verification/admin-log';
import { VerificationLog } from '@/components/admin/VerificationLog';
import shell from '../../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Toate verificările · Admin Verifact',
  description: 'Panou intern cu toate verificările făcute de utilizatori: întrebarea, răspunsul și semnalele slabe.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Holds readers' questions and account emails: admin only, no moderators.
  try {
    await requireAdmin({ allowModerator: false });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect('/cont');
    }
    redirect('/cont');
  }

  const query = parseVerificationLogQuery(await searchParams);
  const log = await getVerificationLog(createAdminClient(), query);

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Panou Administrator</p>
        <h1 className={shell.title}>Toate verificările</h1>
        <p className={shell.lead}>
          Ce au întrebat utilizatorii și ce le-a răspuns algoritmul. „Semnale slabe” adună
          verificările neclare, cu încredere scăzută, fără surse sau contestate.
        </p>
      </header>

      <div className={shell.body}>
        <VerificationLog log={log} query={query} />
      </div>
    </div>
  );
}
