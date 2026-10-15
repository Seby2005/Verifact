import {
  parseUsagePeriod,
  summarizeUsage,
  type UsageAccount,
  type UsageVerification,
} from '@/lib/verification/usage-stats';

// Wednesday noon in Romania; the 7-day period is 8–14 Oct, the one before it 1–7 Oct.
const NOW = new Date('2026-10-14T09:00:00Z');

let nextId = 0;
function verification(at: string, who: Partial<UsageVerification> = {}): UsageVerification {
  return {
    id: `v${nextId++}`,
    created_at: at,
    user_id: null,
    anonymous_hash: 'aaaaaa111',
    input_type: 'text',
    verdict: 'false',
    language: 'ro',
    ...who,
  };
}

const ADMIN: UsageAccount = { id: 'admin', created_at: '2026-07-01T10:00:00Z', tier: 'pro', role: 'admin' };
const READER: UsageAccount = { id: 'reader', created_at: '2026-10-13T10:00:00Z', tier: 'free', role: 'user' };

describe('summarizeUsage', () => {
  it('counts verifications, people and returning people per period', () => {
    const stats = summarizeUsage(
      [
        verification('2026-10-13T10:00:00Z'),
        verification('2026-10-14T08:00:00Z'), // same anonymous reader, another day
        verification('2026-10-14T08:30:00Z', { user_id: 'reader', anonymous_hash: null }),
        verification('2026-10-05T10:00:00Z', { anonymous_hash: 'bbbbbb222' }), // previous period
        verification('2026-09-20T10:00:00Z'), // before both periods
      ],
      [ADMIN, READER],
      7,
      NOW
    );

    expect(stats.current).toEqual({ verifications: 3, people: 2, returning: 1, signups: 1 });
    expect(stats.previous).toEqual({ verifications: 1, people: 1, returning: 0, signups: 0 });
    expect(stats.fromAccounts).toBe(1);
  });

  it('leaves the team out of every number', () => {
    const stats = summarizeUsage(
      [verification('2026-10-14T08:00:00Z', { user_id: 'admin', anonymous_hash: null })],
      [ADMIN, READER],
      7,
      NOW
    );

    expect(stats.current.verifications).toBe(0);
    expect(stats.topPeople).toEqual([]);
    expect(stats.accounts).toEqual({ total: 1, byTier: [{ key: 'free', count: 1 }] });
  });

  it('lists every day of the period, empty ones included, by the Romanian calendar', () => {
    const stats = summarizeUsage(
      // 23:30 on the 12th in Romania, though still the 12th at 20:30 UTC;
      // 00:30 on the 14th in Romania, though the 13th in UTC.
      [verification('2026-10-12T20:30:00Z'), verification('2026-10-13T21:30:00Z')],
      [],
      7,
      NOW
    );

    expect(stats.daily.map((d) => d.date)).toEqual([
      '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14',
    ]);
    expect(stats.daily.map((d) => d.verifications)).toEqual([0, 0, 0, 0, 1, 0, 1]);
  });

  it('ranks people by how much they verified and labels them without exposing a full hash', () => {
    const stats = summarizeUsage(
      [
        verification('2026-10-13T10:00:00Z', { user_id: 'reader', anonymous_hash: null }),
        verification('2026-10-14T08:00:00Z', { user_id: 'reader', anonymous_hash: null }),
        verification('2026-10-14T08:10:00Z'),
      ],
      [READER],
      7,
      NOW,
      (id) => (id === 'reader' ? 'cititor@example.ro' : null)
    );

    expect(stats.topPeople).toEqual([
      {
        userId: 'reader',
        label: 'cititor@example.ro',
        tier: 'free',
        verifications: 2,
        activeDays: 2,
        lastSeen: '2026-10-14T08:00:00Z',
      },
      {
        userId: null,
        label: 'Anonim · aaaaaa',
        tier: null,
        verifications: 1,
        activeDays: 1,
        lastSeen: '2026-10-14T08:10:00Z',
      },
    ]);
  });

  it('counts readers saved without a hash as separate people', () => {
    const stats = summarizeUsage(
      [
        verification('2026-10-14T08:00:00Z', { anonymous_hash: null }),
        verification('2026-10-14T08:10:00Z', { anonymous_hash: null }),
      ],
      [],
      7,
      NOW
    );

    expect(stats.current.people).toBe(2);
  });

  it('breaks the period down by input type, verdict and language, largest first', () => {
    const stats = summarizeUsage(
      [
        verification('2026-10-14T08:00:00Z'),
        verification('2026-10-14T08:10:00Z', { input_type: 'screenshot', verdict: 'true', language: 'en' }),
        verification('2026-10-14T08:20:00Z'),
      ],
      [],
      7,
      NOW
    );

    expect(stats.byInputType).toEqual([{ key: 'text', count: 2 }, { key: 'screenshot', count: 1 }]);
    expect(stats.byVerdict).toEqual([{ key: 'false', count: 2 }, { key: 'true', count: 1 }]);
    expect(stats.byLanguage).toEqual([{ key: 'ro', count: 2 }, { key: 'en', count: 1 }]);
  });
});

describe('parseUsagePeriod', () => {
  it('accepts the offered periods and falls back to 30 days for anything else', () => {
    expect(parseUsagePeriod({ zile: '7' })).toBe(7);
    expect(parseUsagePeriod({ zile: ['90', '7'] })).toBe(90);
    expect(parseUsagePeriod({ zile: '12' })).toBe(30);
    expect(parseUsagePeriod({})).toBe(30);
  });
});
