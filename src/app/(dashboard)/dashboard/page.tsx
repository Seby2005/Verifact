import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — FactCheck AI',
  description: 'Gestionează-ți verificările și contul FactCheck AI.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
