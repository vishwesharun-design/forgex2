import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MousePointer2,
  Type,
  Shapes,
  Eraser,
  Undo2,
  Redo2,
  Check,
  Circle,
  Square,
  Minus,
  MoveUpRight,
  Trash2,
} from 'lucide-react';

interface SketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachSketch: (dataUrl: string) => void;
}

type SketchTool = 'select' | 'pen' | 'text' | 'shapes' | 'eraser';
type ShapeKind = 'circle' | 'rect' | 'line' | 'arrow';

const SKETCH_COLORS = [
  '#000000', // Black
  '#6b7280', // Gray
  '#7c3f1d', // Brown
  '#dc2626', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber / Yellow
  '#16a34a', // Green
  '#0d9488', // Teal
  '#06b6d4', // Cyan
  '#2563eb', // Blue
  '#4f46e5', // Indigo
  '#9333ea', // Purple
  '#db2777', // Pink / Magenta
];

const CANVAS_W = 1200;
const CANVAS_H = 820;

const SquigglePenIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 16c2-5 4.5-9 6.5-9s1.5 8 3.5 8 3.5-5.5 6.5-7.5" />
    <path d="M19.5 18.5h.01" />
  </svg>
);

export const SketchModal: React.FC<SketchModalProps> = ({
  isOpen,
  onClose,
  onAttachSketch,
}) => {
  const [activeTool, setActiveTool] = useState<SketchTool>('pen');
  const [shapeKind, setShapeKind] = useState<ShapeKind>('circle');
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [color, setColor] = useState<string>('#000000');
  const [strokeSize, setStrokeSize] = useState<number>(10);
  const [hasContent, setHasContent] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Cursor ring preview state (for eraser & pen)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Inline text input overlay when Text tool is clicked on canvas
  const [textInputState, setTextInputState] = useState<{
    canvasX: number;
    canvasY: number;
    cssLeft: number;
    cssTop: number;
    value: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Drawing refs
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const preActionSnapshotRef = useRef<ImageData | null>(null);

  // Select/Move drag refs
  const selectDragSnapshotRef = useRef<ImageData | null>(null);
  const selectDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Undo/Redo history stack
  const historyRef = useRef<ImageData[]>([]);
  const historyIdxRef = useRef<number>(-1);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current >= 0 && historyIdxRef.current < historyRef.current.length - 1);
    setHasContent(historyIdxRef.current > 0);
  }, []);

  const pushSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const trimmed = historyRef.current.slice(0, historyIdxRef.current + 1);
    trimmed.push(snap);
    // Keep max 40 snapshots
    if (trimmed.length > 40) {
      trimmed.shift();
    }
    historyRef.current = trimmed;
    historyIdxRef.current = trimmed.length - 1;
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  // Initialize crisp white canvas whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setActiveTool('pen');
    setShowShapeMenu(false);
    setTextInputState(null);
    setCursorPos(null);

    const raf = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (!canvas || !ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [initial];
      historyIdxRef.current = 0;
      updateHistoryFlags();
    });

    return () => cancelAnimationFrame(raf);
  }, [isOpen, updateHistoryFlags]);

  useEffect(() => {
    if (textInputState && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputState]);

  const handleUndo = () => {
    if (historyIdxRef.current <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    historyIdxRef.current -= 1;
    const snap = historyRef.current[historyIdxRef.current];
    if (snap) {
      ctx.putImageData(snap, 0, 0);
    }
    updateHistoryFlags();
  };

  const handleRedo = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    historyIdxRef.current += 1;
    const snap = historyRef.current[historyIdxRef.current];
    if (snap) {
      ctx.putImageData(snap, 0, 0);
    }
    updateHistoryFlags();
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pushSnapshot();
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, cssX: 0, cssY: 0, scaleX: 1 };
    const rect = canvas.getBoundingClientRect();
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: cssX * scaleX,
      y: cssY * scaleY,
      cssX,
      cssY,
      scaleX,
    };
  };

  const commitPendingText = () => {
    if (!textInputState) return;
    const value = textInputState.value.trim();
    if (value) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (canvas && ctx) {
        const fontSize = Math.max(24, strokeSize * 2.6);
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(value, textInputState.canvasX, textInputState.canvasY);
        ctx.restore();
        pushSnapshot();
      }
    }
    setTextInputState(null);
  };

  const drawShapeOnCtx = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
    kind: ShapeKind,
    strokeColor: string,
    lineWidth: number
  ) => {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    if (kind === 'circle') {
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === 'rect') {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (kind === 'line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (kind === 'arrow') {
      const headLen = Math.max(16, lineWidth * 3.2);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setShowShapeMenu(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const { x, y, cssX, cssY } = getCanvasCoords(e.clientX, e.clientY);

    if (activeTool === 'text') {
      if (textInputState) {
        commitPendingText();
      } else {
        setTextInputState({
          canvasX: x,
          canvasY: y,
          cssLeft: cssX,
          cssTop: cssY,
          value: '',
        });
      }
      return;
    }

    if (textInputState) {
      commitPendingText();
    }

    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    if (activeTool === 'select') {
      selectDragSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      selectDragStartRef.current = { x, y };
      return;
    }

    if (activeTool === 'shapes') {
      shapeStartRef.current = { x, y };
      preActionSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return;
    }

    // Pen or Eraser
    lastPointRef.current = { x, y };
    const effectiveColor = activeTool === 'eraser' ? '#ffffff' : color;
    const effectiveWidth = activeTool === 'eraser' ? Math.max(12, strokeSize * 3.4) : Math.max(2, strokeSize * 1.15);

    ctx.save();
    ctx.fillStyle = effectiveColor;
    ctx.beginPath();
    ctx.arc(x, y, effectiveWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const { x, y, cssX, cssY } = getCanvasCoords(e.clientX, e.clientY);
    setCursorPos({ x: cssX, y: cssY });

    if (!isDrawingRef.current) return;

    if (activeTool === 'select') {
      const snap = selectDragSnapshotRef.current;
      const start = selectDragStartRef.current;
      if (snap && start) {
        const dx = Math.round(x - start.x);
        const dy = Math.round(y - start.y);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(snap, dx, dy);
      }
      return;
    }

    if (activeTool === 'shapes') {
      const start = shapeStartRef.current;
      const snap = preActionSnapshotRef.current;
      if (start && snap) {
        ctx.putImageData(snap, 0, 0);
        drawShapeOnCtx(ctx, start, { x, y }, shapeKind, color, Math.max(2, strokeSize * 1.1));
      }
      return;
    }

    // Pen or Eraser smooth stroke
    const prev = lastPointRef.current || { x, y };
    const effectiveColor = activeTool === 'eraser' ? '#ffffff' : color;
    const effectiveWidth = activeTool === 'eraser' ? Math.max(12, strokeSize * 3.4) : Math.max(2, strokeSize * 1.15);

    ctx.save();
    ctx.strokeStyle = effectiveColor;
    ctx.lineWidth = effectiveWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = { x, y };
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    shapeStartRef.current = null;
    preActionSnapshotRef.current = null;
    selectDragSnapshotRef.current = null;
    selectDragStartRef.current = null;
    pushSnapshot();
  };

  // Vertical stroke-size slider drag handler
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const updateSizeFromSliderPointer = (clientY: number) => {
    const track = sliderTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const nextSize = Math.round(2 + ratio * 38); // range 2..40
    setStrokeSize(nextSize);
  };

  if (!isOpen) return null;

  const sliderPercent = ((strokeSize - 2) / 38) * 100;
  const cursorDiameterCss =
    activeTool === 'eraser'
      ? Math.max(16, Math.min(84, strokeSize * 1.85))
      : Math.max(6, Math.min(44, strokeSize * 0.72));

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-[680px] h-[min(560px,88dvh)] sm:h-[590px] max-h-[92dvh] bg-white text-neutral-900 rounded-[24px] sm:rounded-[28px] border border-neutral-200/90 shadow-2xl shadow-black/20 flex flex-col overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar: X on left, Pill Toolbar centered, Undo/Redo on right */}
        <div className="relative z-20 px-2.5 sm:px-4 pt-3 pb-2 flex items-center justify-between gap-1">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Close sketch"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Centered Tool Pill */}
          <div className="relative flex items-center gap-0.5 bg-neutral-100/95 border border-neutral-200/80 rounded-full p-0.5 sm:p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveTool('select');
                setShowShapeMenu(false);
              }}
              title="Select & Move"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'select'
                  ? 'bg-neutral-200/90 text-neutral-950 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('pen');
                setShowShapeMenu(false);
              }}
              title="Freehand Pen"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'pen'
                  ? 'bg-neutral-200/90 text-neutral-950 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
              }`}
            >
              <SquigglePenIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('text');
                setShowShapeMenu(false);
              }}
              title="Add Text"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'text'
                  ? 'bg-neutral-200/90 text-neutral-950 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
              }`}
            >
              <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveTool('shapes');
                  setShowShapeMenu((p) => !p);
                }}
                title="Shapes"
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeTool === 'shapes'
                    ? 'bg-neutral-200/90 text-neutral-950 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
                }`}
              >
                <Shapes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {showShapeMenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl p-1.5 flex items-center gap-1 z-30">
                  {(
                    [
                      { id: 'circle', label: 'Circle', icon: Circle },
                      { id: 'rect', label: 'Rectangle', icon: Square },
                      { id: 'line', label: 'Line', icon: Minus },
                      { id: 'arrow', label: 'Arrow', icon: MoveUpRight },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setShapeKind(item.id);
                          setActiveTool('shapes');
                          setShowShapeMenu(false);
                        }}
                        title={item.label}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                          shapeKind === item.id
                            ? 'bg-neutral-900 text-white'
                            : 'text-neutral-600 hover:bg-neutral-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTool('eraser');
                setShowShapeMenu(false);
              }}
              title="Eraser"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'eraser'
                  ? 'bg-neutral-200/90 text-neutral-950 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
              }`}
            >
              <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Undo & Redo + Clear on Top-Right */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors ${
                canUndo
                  ? 'text-neutral-700 hover:bg-neutral-100 cursor-pointer'
                  : 'text-neutral-300 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors ${
                canRedo
                  ? 'text-neutral-700 hover:bg-neutral-100 cursor-pointer'
                  : 'text-neutral-300 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            {hasContent && (
              <button
                type="button"
                onClick={handleClearCanvas}
                title="Clear canvas"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-red-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Canvas Area with Left Vertical Size Slider */}
        <div
          ref={canvasWrapperRef}
          className="relative flex-1 min-h-0 w-full bg-white overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => {
              setCursorPos(null);
              if (isDrawingRef.current) {
                handlePointerUp();
              }
            }}
            className={`w-full h-full block touch-none ${
              activeTool === 'eraser'
                ? 'cursor-none'
                : activeTool === 'text'
                ? 'cursor-text'
                : activeTool === 'select'
                ? 'cursor-grab active:cursor-grabbing'
                : 'cursor-crosshair'
            }`}
          />

          {/* Circular Brush / Eraser Cursor Preview (matches ChatGPT Screenshot) */}
          {cursorPos && (activeTool === 'eraser' || activeTool === 'pen') && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-500/80 bg-white/10"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: cursorDiameterCss,
                height: cursorDiameterCss,
              }}
            />
          )}

          {/* Left-Edge Vertical Stroke Size Slider (matches ChatGPT Screenshot) */}
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center py-2 px-1">
            <div
              ref={sliderTrackRef}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                updateSizeFromSliderPointer(e.clientY);
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return;
                updateSizeFromSliderPointer(e.clientY);
              }}
              title={`Stroke size: ${strokeSize}px`}
              className="relative w-5 h-44 flex items-center justify-center cursor-ns-resize touch-none"
            >
              {/* Thin vertical track */}
              <div className="w-[2px] h-full bg-neutral-200 rounded-full" />
              {/* Circular white thumb */}
              <div
                className="absolute w-4 h-4 rounded-full bg-white border border-neutral-300 shadow-sm transition-transform hover:scale-110"
                style={{
                  bottom: `calc(${sliderPercent}% - 8px)`,
                }}
              />
            </div>
          </div>

          {/* Floating Text Box when Text tool is active */}
          {textInputState && (
            <input
              ref={textInputRef}
              type="text"
              value={textInputState.value}
              onChange={(e) =>
                setTextInputState((prev) => (prev ? { ...prev, value: e.target.value } : null))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitPendingText();
                } else if (e.key === 'Escape') {
                  setTextInputState(null);
                }
              }}
              onBlur={commitPendingText}
              placeholder="Type text..."
              style={{
                left: Math.min(textInputState.cssLeft, Math.max(120, (canvasWrapperRef.current?.clientWidth || 320) - 140)),
                top: Math.max(12, textInputState.cssTop - 16),
                color,
              }}
              className="absolute z-20 bg-white/95 border border-neutral-300 rounded-lg px-2 py-1 text-sm font-semibold shadow-sm outline-none min-w-[120px]"
            />
          )}
        </div>

        {/* Bottom Footer: Rainbow Picker + Color Swatches + Pink Circular Submit Checkmark */}
        <div className="relative z-20 px-4 sm:px-5 pb-4 pt-2 flex items-center justify-between gap-2 bg-white">
          <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-1 no-scrollbar">
            {/* Rainbow Color Wheel Picker */}
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              title="Custom color"
              className="relative w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-110 border border-neutral-200 shadow-2xs"
              style={{
                background:
                  'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
              }}
            >
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (activeTool === 'eraser') setActiveTool('pen');
                }}
                className="sr-only"
              />
            </button>

            {/* 13 Color Swatches */}
            {SKETCH_COLORS.map((swatch) => {
              const isSelected = color.toLowerCase() === swatch.toLowerCase() && activeTool !== 'eraser';
              return (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => {
                    setColor(swatch);
                    if (activeTool === 'eraser') setActiveTool('pen');
                  }}
                  title={`Select color ${swatch}`}
                  className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full shrink-0 transition-transform cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-offset-2 ring-neutral-900 scale-105'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              );
            })}
          </div>

          {/* Bottom-Right Circular Pink Checkmark Submit Button */}
          <button
            type="button"
            onClick={() => {
              if (textInputState) {
                commitPendingText();
              }
              const dataUrl = canvasRef.current?.toDataURL('image/png');
              if (dataUrl) {
                onAttachSketch(dataUrl);
              }
              onClose();
            }}
            title="Attach Sketch"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              hasContent
                ? 'bg-[#e879a0] hover:bg-[#db5b89] text-white active:scale-95'
                : 'bg-[#f4b6cc] hover:bg-[#e894b2] text-white'
            }`}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
