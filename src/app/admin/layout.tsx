import React from 'react';
import { OwnVisitsExcluded } from '@/components/admin/OwnVisitsExcluded';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OwnVisitsExcluded />
    </>
  );
}
