import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdmin, AuthorizationError } from '@/lib/auth/admin';
import { ReportComposer } from '@/components/admin/ReportComposer';
import shell from '../../page-shell.module.css';

export const metadata: Metadata = {
  title: 'Raport nou cu imagine · Admin Verifact',
  description: 'Panou intern pentru publicarea rapidă a rapoartelor de verificare cu imagini.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminNewReportPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect('/cont');
    }
    redirect('/cont');
  }

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">Panou Administrator</p>
        <h1 className={shell.title}>Raport nou cu imagine</h1>
        <p className={shell.lead}>
          Încarcă screenshot-uri, scrie verdictul și publică imediat pe /rapoarte. Doar
          administratorii pot publica rapoarte cu imagini.
        </p>
      </header>

      <div className={shell.body}>
        <ReportComposer />
      </div>
    </div>
  );
}
