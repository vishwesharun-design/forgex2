import { WritingDoc, WritingCategory, WritingTone, WritingAction } from '../types';
import { authService } from './authService';

function getWritingStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_writing_documents_${userId}`;
}

export const writingStudioService = {
  getDocuments(): WritingDoc[] {
    try {
      const key = getWritingStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_writing_documents');
        if (legacy) {
          stored = legacy;
          localStorage.setItem(key, legacy);
        }
      }
      return stored ? JSON.parse(stored) : [];
    } catch (_e) {
      return [];
    }
  },

  saveDocuments(docs: WritingDoc[]): void {
    const key = getWritingStorageKey();
    localStorage.setItem(key, JSON.stringify(docs));
  },

  saveDocument(doc: WritingDoc): void {
    const list = this.getDocuments();
    const idx = list.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      list[idx] = doc;
    } else {
      list.unshift(doc);
    }
    this.saveDocuments(list);
  },

  deleteDocument(id: string): WritingDoc[] {
    const list = this.getDocuments().filter((d) => d.id !== id);
    this.saveDocuments(list);
    return list;
  },

  async generateWriting(params: {
    category: WritingCategory;
    tone: WritingTone;
    topic: string;
  }): Promise<string> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';

    const res = await fetch('/api/writing-studio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        action: 'generate',
        category: params.category,
        tone: params.tone,
        topic: params.topic,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Writing generation failed.');
    }

    const data = await res.json();
    return data.content || '';
  },

  async alterWriting(params: {
    category: WritingCategory;
    tone: WritingTone;
    currentContent: string;
    alterAction: WritingAction;
  }): Promise<string> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';

    const res = await fetch('/api/writing-studio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        action: 'alter',
        category: params.category,
        tone: params.tone,
        currentContent: params.currentContent,
        alterAction: params.alterAction,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Text alteration failed.');
    }

    const data = await res.json();
    return data.content || '';
  },
};
