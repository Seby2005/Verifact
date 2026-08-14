import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin, AuthorizationError } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateFinancialMetrics } from '@/lib/financial/stats';
import { FinancialDashboard } from '@/components/admin/FinancialDashboard';
import shell from '../../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Dashboard Financiar · Admin Verifact',
  description: 'Panou intern pentru monitorizarea costurilor per verificare, abonamentelor fixe, MRR și pragului de rentabilitate.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminFinancialPage() {
  // 1. Strict server-side verification: Admin only (no moderators)
  try {
    await requireAdmin({ allowModerator: false });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect('/cont');
    }
    redirect('/cont');
  }

  // 2. Fetch initial metrics using admin client
  const adminClient = createAdminClient();
  const initialMetrics = await calculateFinancialMetrics(adminClient);

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Panou Administrator</p>
        <h1 className={shell.title}>Dashboard Financiar</h1>
        <p className={shell.lead}>
          Costuri reale per verificare (tokeni Gemini & OpenRouter), cheltuieli fixe de infrastructură, MRR și analiză de rentabilitate.
        </p>
      </header>

      <div className={shell.body}>
        <FinancialDashboard initialMetrics={initialMetrics} />
      </div>
    </div>
  );
}
