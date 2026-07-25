import Link from 'next/link';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: 'var(--font-newsreader)' }}>
        404 — Pagina nu a fost găsită
      </h1>
      <p style={{ color: 'var(--color-slate-600)', marginBottom: '2rem' }}>
        Ne pare rău, pagina pe care o căutați nu există sau a fost mutată.
      </p>
      <Link href="/">
        <Button variant="primary">Înapoi la prima pagină</Button>
      </Link>
    </div>
  );
}
