import { drawRound, bankCounts, type Region, type Category } from '@/lib/academy/bank';

export const dynamic = 'force-dynamic';

function list<T extends string>(raw: string | null): T[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as T[];
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const regions = list<Region>(url.searchParams.get('regions'));
  const categories = list<Category>(url.searchParams.get('categories'));
  const count = Math.min(30, Math.max(4, Number(url.searchParams.get('count')) || 12));
  const exclude = list<string>(url.searchParams.get('exclude'));

  const items = drawRound({ regions, categories, count, exclude });
  return Response.json({ items, counts: bankCounts() });
}
