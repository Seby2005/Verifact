import { DashboardView, UsageCard, HistoryTable, BookmarksList, useBookmarks } from '@/components/dashboard';

describe('Dashboard Components', () => {
  it('exports all dashboard components and hooks properly', () => {
    expect(DashboardView).toBeDefined();
    expect(UsageCard).toBeDefined();
    expect(HistoryTable).toBeDefined();
    expect(BookmarksList).toBeDefined();
    expect(useBookmarks).toBeDefined();
  });
});
