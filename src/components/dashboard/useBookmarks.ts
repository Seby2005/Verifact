'use client';

import { useState, useEffect, useCallback } from 'react';

const BOOKMARKS_STORAGE_KEY = 'verifact_user_bookmarks';

export interface BookmarkedVerification {
  id: string;
  input_text: string;
  verdict: 'true' | 'partial' | 'unclear' | 'false' | null;
  score: number | null;
  created_at: string;
  is_public?: boolean;
}

export function useBookmarks(userId?: string) {
  const [bookmarks, setBookmarks] = useState<BookmarkedVerification[]>([]);
  const storageKey = userId ? `${BOOKMARKS_STORAGE_KEY}_${userId}` : BOOKMARKS_STORAGE_KEY;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setBookmarks(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  const saveBookmarks = useCallback(
    (next: BookmarkedVerification[]) => {
      setBookmarks(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore localStorage write error
      }
    },
    [storageKey]
  );

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((item) => item.id === id),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (item: BookmarkedVerification) => {
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.id === item.id);
        const next = exists ? prev.filter((b) => b.id !== item.id) : [item, ...prev];
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [storageKey]
  );

  const removeBookmark = useCallback(
    (id: string) => {
      setBookmarks((prev) => {
        const next = prev.filter((b) => b.id !== id);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    [storageKey]
  );

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    count: bookmarks.length,
  };
}
