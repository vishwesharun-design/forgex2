import React, { useState, useRef } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Plus,
  Trash2,
  Move,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CanvasBoard, CanvasNode, CanvasEdge, ForgeXTheme, ForgeXModelId } from '../types';
import { canvasService } from '../services/canvasService';
import { ModelSelector } from './ModelSelector';

interface CanvasWorkspaceProps {
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (id: ForgeXModelId) => void;
  onSendToChat?: (text: string) => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  isDark,
  theme,
  selectedModelId,
  onSelectModel,
  onSendToChat,
}) => {
  const [boards, setBoards] = useState<CanvasBoard[]>(() => canvasService.getBoards());
  const [activeBoard, setActiveBoard] = useState<CanvasBoard>(() => boards[0] || canvasService.getDefaultBoard());
  const [topicInput, setTopicInput] = useState('');
  const [canvasType, setCanvasType] = useState<'mindmap' | 'flowchart' | 'brainstorm'>('mindmap');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleGenerate = async (customTopic?: string) => {
    const targetTopic = customTopic || topicInput;
    if (!targetTopic.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const newBoard = await canvasService.generateCanvas(targetTopic.trim(), canvasType);
      const updated = canvasService.getBoards();
      setBoards(updated);
      setActiveBoard(newBoard);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Canvas generation notice: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = activeBoard.nodes.find((n) => n.id === id);
    if (!node) return;
    setDraggingNodeId(id);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    });
  };

  const handleMouseMoveContainer = (e: React.MouseEvent) => {
    if (!draggingNodeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = Math.max(10, Math.min(1600, e.clientX - rect.left - 20));
    const newY = Math.max(10, Math.min(1200, e.clientY - rect.top - 20));

    const updatedNodes = activeBoard.nodes.map((n) =>
      n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n
    );

    const updatedBoard = { ...activeBoard, nodes: updatedNodes };
    setActiveBoard(updatedBoard);
  };

  const handleMouseUpContainer = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      canvasService.saveBoard(activeBoard);
    }
  };

  const handleAddNode = () => {
    const newNode: CanvasNode = {
      id: 'node-' + Date.now(),
      type: 'idea',
      title: 'New Idea Node',
      content: 'Click to edit description and details',
      x: 200 + Math.random() * 200,
      y: 150 + Math.random() * 150,
      width: 200,
      height: 110,
      color: '#f59e0b',
    };
    const updated = {
      ...activeBoard,
      nodes: [...activeBoard.nodes, newNode],
    };
    canvasService.saveBoard(updated);
    setActiveBoard(updated);
  };

  const handleDeleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = {
      ...activeBoard,
      nodes: activeBoard.nodes.filter((n) => n.id !== id),
      edges: activeBoard.edges.filter((edge) => edge.fromId !== id && edge.toId !== id),
    };
    canvasService.saveBoard(updated);
    setActiveBoard(updated);
  };

  const handleClearActiveBoard = () => {
    const updated = {
      ...activeBoard,
      nodes: [],
      edges: [],
      lastModified: Date.now(),
    };
    canvasService.saveBoard(updated);
    setActiveBoard(updated);
  };

  const handleNewBoard = () => {
    const newBoard = canvasService.createBlankBoard('New Visual Canvas');
    canvasService.saveBoard(newBoard);
    const updated = canvasService.getBoards();
    setBoards(updated);
    setActiveBoard(newBoard);
  };

  const handleDeleteBoard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = canvasService.deleteBoard(id);
    if (remaining.length === 0) {
      const fresh = canvasService.createBlankBoard('New Blank Canvas');
      canvasService.saveBoard(fresh);
      setBoards([fresh]);
      setActiveBoard(fresh);
    } else {
      setBoards(remaining);
      if (activeBoard.id === id) {
        setActiveBoard(remaining[0]);
      }
    }
  };

  const handleClearAllCanvasHistory = () => {
    const fresh = canvasService.clearAllBoards();
    setBoards(fresh);
    setActiveBoard(fresh[0]);
  };

  const handleUpdateNode = (id: string, field: 'title' | 'content', val: string) => {
    const updated = {
      ...activeBoard,
      nodes: activeBoard.nodes.map((n) => (n.id === id ? { ...n, [field]: val } : n)),
    };
    canvasService.saveBoard(updated);
    setActiveBoard(updated);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Top Header */}
      <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              AI Infinite Canvas & Mindmap
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Visual Whiteboard
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Map concepts, brainstorm architecture, create process flowcharts, and connect ideas visually with AI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewBoard}
            className="px-3 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-850 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Canvas</span>
          </button>
          <button
            type="button"
            onClick={handleClearActiveBoard}
            title="Clear all nodes and connections on this board"
            className="px-3 py-1.5 rounded-xl border border-neutral-800 hover:text-red-400 hover:bg-neutral-850 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Board</span>
          </button>
          <button
            type="button"
            onClick={handleAddNode}
            className="px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Node</span>
          </button>
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
          />
        </div>
      </div>

      {/* Main Dual Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left AI Generator Panel */}
        <div className={`w-80 border-r flex flex-col shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-4 border-b border-neutral-800/40 space-y-3">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Canvas Architect
            </span>

            <div>
              <label className="block text-[11px] font-semibold mb-1 text-neutral-400">Topic / Domain</label>
              <input
                id="canvas-topic-input"
                type="text"
                placeholder="e.g. Distributed Database Architecture"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300'
                }`}
              />
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Microservices Graph', 'AI Agent Loop', 'User Auth Flow'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setTopicInput(sug);
                      handleGenerate(sug);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                      isDark 
                        ? 'border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/40' 
                        : 'border-neutral-200 text-neutral-600 hover:text-amber-600 hover:border-amber-400'
                    }`}
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-start justify-between gap-2">
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300 font-bold">×</button>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold mb-1 text-neutral-400">Layout Format</label>
              <select
                value={canvasType}
                onChange={(e) => setCanvasType(e.target.value as any)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300'
                }`}
              >
                <option value="mindmap">Mindmap Tree</option>
                <option value="flowchart">Process Flowchart</option>
                <option value="brainstorm">Brainstorm Clusters</option>
              </select>
            </div>

            <button
              id="generate-canvas-btn"
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || !topicInput.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Structuring Nodes...' : 'Generate Canvas'}</span>
            </button>
          </div>

          {/* Boards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Boards ({boards.length})
              </span>
              <button
                type="button"
                onClick={handleClearAllCanvasHistory}
                className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors font-medium cursor-pointer"
                title="Wipe canvas boards history"
              >
                Clear History
              </button>
            </div>

            {boards.map((b) => (
              <div
                key={b.id}
                onClick={() => setActiveBoard(b)}
                className={`p-3 rounded-xl border cursor-pointer transition-all relative group ${
                  activeBoard.id === b.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : isDark
                    ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/60'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <p className="text-xs font-bold truncate flex-1">{b.name}</p>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteBoard(b.id, e)}
                    className="opacity-60 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition-all text-neutral-400"
                    title="Delete this board"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/30 text-[10px] text-neutral-400">
                  <span>{b.nodes.length} nodes</span>
                  <span>{b.edges.length} edges</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2D Stage Canvas */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMoveContainer}
          onMouseUp={handleMouseUpContainer}
          className={`flex-1 relative overflow-auto select-none ${
            isDark ? 'bg-[#09090b]' : 'bg-[#f4f4f5]'
          }`}
          style={{
            backgroundImage: isDark
              ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)'
              : 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Zoom & View Controls Overlay */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md p-1.5 rounded-xl border border-neutral-800 text-xs">
            <button
              onClick={() => setZoomScale((prev) => Math.max(0.6, prev - 0.1))}
              className="p-1 hover:text-amber-400 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[10px] w-8 text-center">{Math.round(zoomScale * 100)}%</span>
            <button
              onClick={() => setZoomScale((prev) => Math.min(1.5, prev + 0.1))}
              className="p-1 hover:text-amber-400 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div
            className="w-[1800px] h-[1400px] relative transition-transform origin-top-left"
            style={{ transform: `scale(${zoomScale})` }}
          >
            {/* SVG Connecting Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" opacity="0.7" />
                </marker>
              </defs>
              {activeBoard.edges.map((edge) => {
                const fromNode = activeBoard.nodes.find((n) => n.id === edge.fromId);
                const toNode = activeBoard.nodes.find((n) => n.id === edge.toId);
                if (!fromNode || !toNode) return null;

                const startX = fromNode.x + fromNode.width / 2;
                const startY = fromNode.y + fromNode.height / 2;
                const endX = toNode.x + toNode.width / 2;
                const endY = toNode.y + toNode.height / 2;

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                return (
                  <g key={edge.id}>
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeOpacity="0.5"
                      strokeDasharray="4 2"
                      markerEnd="url(#arrowhead)"
                    />
                    {edge.label && (
                      <text
                        x={midX}
                        y={midY - 6}
                        fill="#f59e0b"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="bg-black/60 px-1 py-0.5"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Draggable Nodes */}
            {activeBoard.nodes.map((node) => {
              const isDragging = draggingNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  style={{
                    transform: `translate(${node.x}px, ${node.y}px)`,
                    width: `${node.width}px`,
                    borderColor: node.color,
                  }}
                  className={`absolute top-0 left-0 p-3.5 rounded-2xl border-2 shadow-xl cursor-grab active:cursor-grabbing transition-shadow z-10 ${
                    isDragging ? 'shadow-amber-500/30 ring-2 ring-amber-400' : ''
                  } ${isDark ? 'bg-neutral-900/90 text-white' : 'bg-white text-neutral-900'}`}
                >
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10">
                    <span
                      style={{ color: node.color }}
                      className="text-[9px] font-mono uppercase font-black tracking-wider"
                    >
                      {node.type}
                    </span>
                    <button
                      onClick={(e) => handleDeleteNode(node.id, e)}
                      className="text-neutral-500 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={node.title}
                    onChange={(e) => handleUpdateNode(node.id, 'title', e.target.value)}
                    className="w-full text-xs font-bold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded p-0.5"
                  />

                  <textarea
                    rows={2}
                    value={node.content}
                    onChange={(e) => handleUpdateNode(node.id, 'content', e.target.value)}
                    className="w-full text-[11px] opacity-80 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded p-0.5 mt-1 resize-none leading-relaxed"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
