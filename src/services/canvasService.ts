import { CanvasBoard, CanvasNode, CanvasEdge } from '../types';
import { authService } from './authService';

function getBoardStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_canvas_boards_${userId}`;
}

export const canvasService = {
  getBoards(): CanvasBoard[] {
    try {
      const key = getBoardStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_canvas_boards');
        if (legacy) {
          stored = legacy;
          localStorage.setItem(key, legacy);
        }
      }
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
    const nodes: CanvasNode[] = [
      {
        id: 'node-root',
        type: 'mindmap',
        title: 'ForgeX Architecture',
        content: 'Core multimodal workspace system with high performance',
        x: 360,
        y: 200,
        width: 220,
        height: 110,
        color: '#f59e0b',
      },
      {
        id: 'node-1',
        type: 'idea',
        title: 'Document AI',
        content: 'Deep semantic PDF, DOCX, and CSV reasoning',
        x: 80,
        y: 80,
        width: 190,
        height: 100,
        color: '#3b82f6',
      },
      {
        id: 'node-2',
        type: 'process',
        title: 'Autonomous Agents',
        content: 'Multi-step autonomous execution loop',
        x: 640,
        y: 80,
        width: 190,
        height: 100,
        color: '#10b981',
      },
      {
        id: 'node-3',
        type: 'decision',
        title: 'Document & Knowledge AI',
        content: 'Semantic multi-document summarization & QA',
        x: 80,
        y: 350,
        width: 190,
        height: 100,
        color: '#8b5cf6',
      },
      {
        id: 'node-4',
        type: 'note',
        title: 'Code Studio Sandbox',
        content: 'Real-time compilation and AI code alteration',
        x: 640,
        y: 350,
        width: 190,
        height: 100,
        color: '#ec4899',
      },
    ];

    const edges: CanvasEdge[] = [
      { id: 'edge-1', fromId: 'node-root', toId: 'node-1', label: 'analyzes' },
      { id: 'edge-2', fromId: 'node-root', toId: 'node-2', label: 'orchestrates' },
      { id: 'edge-3', fromId: 'node-root', toId: 'node-3', label: 'visualizes' },
      { id: 'edge-4', fromId: 'node-root', toId: 'node-4', label: 'executes' },
    ];

    return {
      id: 'default-board-1',
      name: 'ForgeX Overview Canvas',
      nodes,
      edges,
      lastModified: Date.now(),
    };
  },
};
