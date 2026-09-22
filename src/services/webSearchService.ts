import { authService } from './authService';
import { firestoreStorageService } from './firestoreStorageService';

export interface WebSearchResult {
  id: string;
  query: string;
  correctedQuery?: string;
  didYouMean?: string;
  exactApp?: {
    name: string;
    url: string;
    category?: string;
    developer?: string;
    description?: string;
    access?: string;
  };
  summary: string;
  sources: { title: string; url: string; snippet?: string }[];
  searchType: 'fast' | 'deep';
  timestamp: number;
}

function getSearchStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_web_searches_${userId}`;
}

export const webSearchService = {
  getSearchHistory(): WebSearchResult[] {
    try {
      const key = getSearchStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            ...item,
            id: item.id || `search_${item.timestamp || Math.random().toString(36).slice(2, 9)}`,
          }));
        }
      }
    } catch (_e) {
      console.warn('Failed to load search history');
    }
    return [];
  },

  saveSearch(result: WebSearchResult): void {
    const key = getSearchStorageKey();
    const current = this.getSearchHistory().filter(
      (s) => s.id !== result.id && s.timestamp !== result.timestamp && s.query.toLowerCase() !== result.query.toLowerCase()
    );
    const updated = [result, ...current].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));

    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      firestoreStorageService.saveUserWebSearch(userId, result).catch(() => {});
    }
  },

  async deleteSearch(idOrTimestamp: string | number): Promise<WebSearchResult[]> {
    const key = getSearchStorageKey();
    const current = this.getSearchHistory();
    const targetItem = current.find((item) => {
      if (typeof idOrTimestamp === 'number') {
        return item.timestamp === idOrTimestamp;
      }
      return item.id === idOrTimestamp || String(item.timestamp) === idOrTimestamp;
    });

    const updated = current.filter((item) => {
      if (typeof idOrTimestamp === 'number') {
        return item.timestamp !== idOrTimestamp;
      }
      return item.id !== idOrTimestamp && String(item.timestamp) !== idOrTimestamp;
    });

    localStorage.setItem(key, JSON.stringify(updated));

    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest' && targetItem) {
      firestoreStorageService.deleteUserWebSearch(userId, targetItem.id).catch(() => {});
    }
    return updated;
  },

  async clearHistory(): Promise<void> {
    const key = getSearchStorageKey();
    localStorage.removeItem(key);

    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      firestoreStorageService.clearUserWebSearches(userId).catch(() => {});
    }
  },

  async syncWithFirestore(): Promise<WebSearchResult[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        const cloudSearches = await firestoreStorageService.loadUserWebSearches(userId);
        if (cloudSearches && cloudSearches.length > 0) {
          const key = getSearchStorageKey();
          const mapped: WebSearchResult[] = cloudSearches.map((cs) => ({
            ...cs,
            id: cs.id,
          }));
          localStorage.setItem(key, JSON.stringify(mapped));
          return mapped;
        } else {
          // Push any existing local searches for this user
          const local = this.getSearchHistory();
          for (const s of local) {
            await firestoreStorageService.saveUserWebSearch(userId, s);
          }
        }
      }
    } catch (err) {
      console.warn('Web search firestore sync skipped/offline:', err);
    }
    return this.getSearchHistory();
  },

  async search(query: string, searchType: 'fast' | 'deep' = 'fast'): Promise<WebSearchResult> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';

    const res = await fetch('/api/web-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        query: query.trim(),
        searchType,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Web search query failed.');
    }

    const data: WebSearchResult = await res.json();
    if (!data.id) {
      data.id = `search_${data.timestamp || Date.now()}`;
    }
    this.saveSearch(data);
    return data;
  },
};
