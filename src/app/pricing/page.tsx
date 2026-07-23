import type { Metadata } from 'next';
import { PricingClient } from './PricingClient';

export const metadata: Metadata = {
  title: 'Prețuri — FactCheck AI',
  description:
    'Alege planul potrivit pentru tine. Gratuit pentru uz personal, Pro pentru jurnaliști, Business pentru organizații.',
};

export default function PricingPage() {
  return <PricingClient />;
}
