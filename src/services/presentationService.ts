import { PresentationDeck } from '../types';
import { authService } from './authService';

function getDeckStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_presentation_decks_${userId}`;
}

export const presentationService = {
  getDecks(): PresentationDeck[] {
    try {
      const key = getDeckStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_presentation_decks');
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

  saveDecks(decks: PresentationDeck[]): void {
    const key = getDeckStorageKey();
    localStorage.setItem(key, JSON.stringify(decks));
  },

  saveDeck(deck: PresentationDeck): void {
    const list = this.getDecks();
    const idx = list.findIndex((d) => d.id === deck.id);
    if (idx >= 0) {
      list[idx] = deck;
    } else {
      list.unshift(deck);
    }
    this.saveDecks(list);
  },

  deleteDeck(id: string): PresentationDeck[] {
    const list = this.getDecks().filter((d) => d.id !== id);
    this.saveDecks(list);
    return list;
  },

  async generateDeck(topic: string, slideCount: number = 6, themeStyle: any = 'dark-amber'): Promise<PresentationDeck> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';

    const res = await fetch('/api/presentation-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        topic,
        slideCount,
        themeStyle,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Presentation generation failed.');
    }

    const data = await res.json();
    const deck = data.deck;
    this.saveDeck(deck);
    return deck;
  },

  exportHTML(deck: PresentationDeck): void {
    const slidesHtml = deck.slides
      .map(
        (s) => `
      <section style="page-break-after: always; min-height: 80vh; padding: 40px; border-bottom: 2px solid #333; font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff;">
        <div style="font-size: 14px; text-transform: uppercase; color: #f59e0b; margin-bottom: 8px;">Slide ${s.slideNumber}</div>
        <h1 style="font-size: 32px; margin-bottom: 12px; color: #fff;">${s.title}</h1>
        ${s.subtitle ? `<h3 style="font-size: 18px; color: #aaa; margin-bottom: 24px;">${s.subtitle}</h3>` : ''}
        <ul style="font-size: 18px; line-height: 1.8; color: #ddd; padding-left: 24px;">
          ${s.bullets.map((b) => `<li>${b}</li>`).join('')}
        </ul>
        ${s.keyTakeaway ? `<div style="margin-top: 30px; padding: 16px; background: rgba(245,158,11,0.1); border-left: 4px solid #f59e0b; font-style: italic;">Takeaway: ${s.keyTakeaway}</div>` : ''}
      </section>
    `
      )
      .join('\n');

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${deck.title}</title>
</head>
<body style="margin: 0; background: #0a0a0a;">
  ${slidesHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_presentation.html`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
