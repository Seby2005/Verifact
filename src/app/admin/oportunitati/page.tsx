import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin, AuthorizationError } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { aggregateDailyOpportunities, saveOpportunities } from '@/lib/opportunities/trends-service';
import { OpportunitiesList } from '@/components/admin/OpportunitiesList';
import type { ContentOpportunity } from '@/types/database';
import shell from '../../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Oportunități de Conținut · Admin Verifact',
  description: 'Panou intern pentru monitorizarea subiectelor trending și generarea rapoartelor de verificare.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminOpportunitiesPage() {
  // 1. Verify admin/moderator authentication
  try {
    await requireAdmin({ allowModerator: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect('/cont');
    }
    redirect('/cont');
  }

  // 2. Load active/new content opportunities
  const adminClient = createAdminClient();
  let { data: opportunities, error } = await (adminClient.from('content_opportunities') as unknown as {
    select: (fields: string) => {
      eq: (field: string, val: string) => {
        order: (field: string, opts: { ascending: boolean }) => {
          order: (field: string, opts: { ascending: boolean; nullsFirst?: boolean }) => Promise<{
            data: ContentOpportunity[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .select('*')
    .eq('status', 'new')
    .order('fetched_at', { ascending: false })
    .order('trend_rank', { ascending: true, nullsFirst: false });

  // If no opportunities exist in the database (e.g. fresh environment or cron hasn't fired yet),
  // automatically aggregate once on first admin visit
  if (!error && (!opportunities || opportunities.length === 0)) {
    try {
      const candidates = await aggregateDailyOpportunities();
      if (candidates.length > 0) {
        await saveOpportunities(candidates);
        const { data: refetched } = await (adminClient.from('content_opportunities') as unknown as {
          select: (fields: string) => {
            eq: (field: string, val: string) => {
              order: (field: string, opts: { ascending: boolean }) => {
                order: (field: string, opts: { ascending: boolean; nullsFirst?: boolean }) => Promise<{
                  data: ContentOpportunity[] | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        })
          .select('*')
          .eq('status', 'new')
          .order('fetched_at', { ascending: false })
          .order('trend_rank', { ascending: true, nullsFirst: false });

        if (refetched && refetched.length > 0) {
          opportunities = refetched;
        }
      }
    } catch {
      // Non-fatal, fallback to empty list
    }
  }

  const initialItems: ContentOpportunity[] = error || !opportunities ? [] : opportunities;

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Panou Administrator</p>
        <h1 className={shell.title}>Oportunități de Conținut</h1>
        <p className={shell.lead}>
          Subiecte trending agregate automat din România pentru identificarea afirmațiilor de
          verificat și publicat pe /rapoarte.
        </p>
      </header>

      <div className={shell.body}>
        <OpportunitiesList initialOpportunities={initialItems} />
      </div>
    </div>
  );
}
