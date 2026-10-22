import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

/** Dev-only route: a real 404 in production, not an empty 200 page. */
export default function DevOnlyLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return children;
}
