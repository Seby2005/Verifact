import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUsageStats, parseUsagePeriod } from '@/lib/verification/usage-stats';
import { UsageStats } from '@/components/admin/UsageStats';
import shell from '../../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Statistici · Admin Verifact',
  description: 'Panou intern: câți oameni folosesc Verifact, cât de des revin și ce verifică.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Lists account emails: admin only, no moderators.
  try {
    await requireAdmin({ allowModerator: false });
  } catch {
    redirect('/cont');
  }

  const stats = await getUsageStats(createAdminClient(), parseUsagePeriod(await searchParams));

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Panou Administrator</p>
        <h1 className={shell.title}>Statistici</h1>
        <p className={shell.lead}>
          Câți oameni folosesc Verifact, cât de des revin și ce verifică. Fără verificările echipei.
        </p>
      </header>

      <div className={shell.body}>
        <UsageStats stats={stats} />
      </div>
    </div>
  );
}
