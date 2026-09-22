export interface WebSearchResult {
  query: string;
  summary: string;
  sources: { title: string; url: string; snippet?: string }[];
  searchType: 'fast' | 'deep';
  timestamp: number;
}

const STORAGE_KEY_SEARCH = 'forgex_web_searches';

export const webSearchService = {
  getSearchHistory(): WebSearchResult[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SEARCH);
      return stored ? JSON.parse(stored) : [];
    } catch (_e) {
      return [];
    }
  },

  saveSearch(result: WebSearchResult): void {
    const list = this.getSearchHistory();
    list.unshift(result);
    localStorage.setItem(STORAGE_KEY_SEARCH, JSON.stringify(list.slice(0, 30)));
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
    this.saveSearch(data);
    return data;
  },
};
