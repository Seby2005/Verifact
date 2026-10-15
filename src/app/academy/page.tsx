import type { Metadata } from 'next';
import { Trainer } from '@/components/academy/Trainer';

export const metadata: Metadata = {
  title: 'Academy — Verifact',
  description:
    'Antrenează-ți imunitatea la dezinformare: sute de afirmații reale verificate de fact-checkeri din România, Europa și restul lumii. Tu dai verdictul.',
};

// Deliberately not wrapped in the site's page shell: the trainer takes over the
// viewport, so the editorial container would fight it.
export default function AcademyPage() {
  return <Trainer />;
}
