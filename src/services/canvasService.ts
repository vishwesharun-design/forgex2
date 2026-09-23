import { CanvasBoard, CanvasNode, CanvasEdge } from '../types';
import { authService } from './authService';

function getBoardStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_canvas_boards_${partition}`;
}

export const canvasService = {
  getBoards(): CanvasBoard[] {
    try {
      const key = getBoardStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {
      // fallback
    }
    return [this.getDefaultBoard()];
  },

  saveBoards(boards: CanvasBoard[]): void {
    const key = getBoardStorageKey();
    localStorage.setItem(key, JSON.stringify(boards));
  },

  saveBoard(board: CanvasBoard): void {
    const list = this.getBoards();
    const idx = list.findIndex((b) => b.id === board.id);
    if (idx >= 0) {
      list[idx] = board;
    } else {
      list.unshift(board);
    }
    this.saveBoards(list);
  },

  deleteBoard(id: string): CanvasBoard[] {
    const list = this.getBoards().filter((b) => b.id !== id);
    this.saveBoards(list);
    return list;
  },

  clearAllBoards(): CanvasBoard[] {
    const blank = this.createBlankBoard('New Blank Canvas');
    this.saveBoards([blank]);
    return [blank];
  },

  createBlankBoard(name: string = 'Untitled Canvas'): CanvasBoard {
    return {
      id: 'board-' + Date.now(),
      name,
      nodes: [],
      edges: [],
      lastModified: Date.now(),
    };
  },

  async generateCanvas(topic: string, canvasType: 'mindmap' | 'flowchart' | 'brainstorm' = 'mindmap'): Promise<CanvasBoard> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';

    const res = await fetch('/api/ai-canvas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        topic,
        canvasType,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Canvas generation failed.');
    }

    const data = await res.json();
    const board: CanvasBoard = {
      id: 'board-' + Date.now(),
      name: data.board.name || `${topic} Canvas`,
      nodes: data.board.nodes || [],
      edges: data.board.edges || [],
      lastModified: Date.now(),
    };

    this.saveBoard(board);
    return board;
  },

  getDefaultBoard(): CanvasBoard {
    return {
      id: 'canvas-' + Date.now(),
      name: 'New Blank Canvas',
      nodes: [],
      edges: [],
      lastModified: Date.now(),
    };
  },
};
