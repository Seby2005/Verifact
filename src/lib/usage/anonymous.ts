export function getAnonymousUsage(): { count: number; lastReset: string } {
  if (typeof window === 'undefined') return { count: 0, lastReset: '' };
  const stored = localStorage.getItem('agy_anon_usage');
  if (!stored) return { count: 0, lastReset: new Date().toISOString() };
  try {
    return JSON.parse(stored);
  } catch {
    return { count: 0, lastReset: new Date().toISOString() };
  }
}

export function incrementAnonymousUsage(): void {
  if (typeof window === 'undefined') return;
  const usage = getAnonymousUsage();
  localStorage.setItem(
    'agy_anon_usage',
    JSON.stringify({
      count: usage.count + 1,
      lastReset: usage.lastReset || new Date().toISOString(),
    })
  );
}

export function isAnonymousLimitReached(): boolean {
  const { count } = getAnonymousUsage();
  return count >= 3;
}
