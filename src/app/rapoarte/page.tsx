import React from 'react';
import type { Metadata } from 'next';
import { listPublicReports } from '@/lib/verification/public-reports-query';
import { PublicReportsFeed } from './PublicReportsFeed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Rapoarte Publice de Verificare — Verifact',
  description:
    'Explorează arhiva publică de știri și afirmații verificate factual. Transparență totală, scoruri de veridicitate și surse originale.',
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function PublicReportsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10));

  const { reports, totalPages } = await listPublicReports({ page, limit: 12 });

  return <PublicReportsFeed reports={reports} page={page} totalPages={totalPages} />;
}
