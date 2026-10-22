import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { OwnVisitsExcluded } from '@/components/admin/OwnVisitsExcluded';

/**
 * Safety net for everything under /admin: the pages read with the service-role
 * client, so a new page that forgot its own requireAdmin() would otherwise show
 * every user's data to anyone. Each page still checks for itself, because some
 * (financial, statistics) admit admins only, not moderators.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin({ allowModerator: true });
  } catch {
    redirect('/cont');
  }

  return (
    <>
      {children}
      <OwnVisitsExcluded />
    </>
  );
}
