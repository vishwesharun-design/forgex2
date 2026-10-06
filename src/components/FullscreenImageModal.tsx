import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  ChevronDown, 
  PenTool, 
  MessageSquare, 
  Layers, 
  Eraser, 
  Maximize2, 
  GripVertical, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Image as ImageIcon,
  RotateCcw,
  Send,
  Mic,
  Brain,
  Move,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { ForgeXTheme } from '../types';

export interface GalleryImageItem {
  id: string;
  url: string;
  prompt: string;
}

interface FullscreenImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  prompt: string;
  theme: ForgeXTheme;
  initialEdit?: boolean;
  galleryImages?: GalleryImageItem[];
  onSelectImage?: (img: GalleryImageItem) => void;
  onOpenInImageStudio?: (prompt: string, imageUrl: string) => void;
  onEditPromptAndRegenerate?: (newPrompt: string) => void;
}

const ZOOM_LEVELS = [
  { label: '25%', value: 0.25 },
  { label: '45%', value: 0.45 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 },
  { label: 'Fit', value: 'fit' as const },
];

export const FullscreenImageModal: React.FC<FullscreenImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  prompt,
  theme,
  initialEdit = false,
  galleryImages = [],
  onSelectImage,
  onOpenInImageStudio,
  onEditPromptAndRegenerate,
}) => {
  // Zoom state (default 45% matching screenshot)
  const [zoomLevel, setZoomLevel] = useState<number | 'fit'>(0.45);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isCopiedShare, setIsCopiedShare] = useState(false);

  // Pan & Drag state: movable image when zoomed
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Edit section minimized state (collapses toolbar and chat input to view image unobstructed)
  const [isEditMinimized, setIsEditMinimized] = useState(false);

  // Active Tool state for floating bottom bar: 'none' | 'markup' | 'comment' | 'removeBg' | 'erase' | 'resize'
  const [activeTool, setActiveTool] = useState<'none' | 'markup' | 'comment' | 'removeBg' | 'erase' | 'resize'>(
    initialEdit ? 'comment' : 'none'
  );

  // Comment / Prompt state
  const [commentText, setCommentText] = useState(prompt);

  // Markup canvas drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [markupColor, setMarkupColor] = useState('#f59e0b');
  const [markupSize, setMarkupSize] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background removal state
  const [bgRemovedUrl, setBgRemovedUrl] = useState<string | null>(null);
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  // Resize aspect ratio selector
  const [selectedRatio, setSelectedRatio] = useState<string>('Original');

  // Quick Chat prompt input at bottom
  const [chatPrompt, setChatPrompt] = useState('');

  useEffect(() => {
    setCommentText(prompt);
  }, [prompt]);

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(0.45);
      setPanOffset({ x: 0, y: 0 });
      setActiveTool(initialEdit ? 'comment' : 'none');
      setBgRemovedUrl(null);
    } else {
      setActiveTool('none');
      setIsZoomMenuOpen(false);
      setIsImageMenuOpen(false);
    }
  }, [isOpen, initialEdit]);

  // Reset pan when zoom changes or image changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [zoomLevel, imageUrl]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTool !== 'none') {
          setActiveTool('none');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTool, onClose]);

  if (!isOpen || !imageUrl) return null;

  const currentDisplayUrl = bgRemovedUrl || imageUrl;

  // Clear markup canvas
  const handleClearMarkup = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Drawing event handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'markup' && activeTool !== 'erase') return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = markupSize * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = markupColor;
      ctx.lineWidth = markupSize;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  // Drag and Pan handlers for moving the image
  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'markup' || activeTool === 'erase') return;
    // Start dragging
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleStageMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan
  const handleStageTouchStart = (e: React.TouchEvent) => {
    if (activeTool === 'markup' || activeTool === 'erase') return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      };
    }
  };

  const handleStageTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanOffset({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    });
  };

  const handleStageTouchEnd = () => {
    setIsDragging(false);
  };

  // Background removal algorithm
  const handleRemoveBackground = () => {
    if (bgRemovedUrl) {
      setBgRemovedUrl(null);
      return;
    }

    setIsProcessingBg(true);
    setTimeout(() => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
          const offscreen = document.createElement('canvas');
          offscreen.width = img.width;
          offscreen.height = img.height;
          const ctx = offscreen.getContext('2d');
          if (!ctx) {
            setIsProcessingBg(false);
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
          const data = imgData.data;

          const r0 = data[0];
          const g0 = data[1];
          const b0 = data[2];
          const threshold = 38;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const diff = Math.sqrt(
              Math.pow(r - r0, 2) + Math.pow(g - g0, 2) + Math.pow(b - b0, 2)
            );
            if (diff < threshold) {
              data[i + 3] = 0;
            }
          }

          ctx.putImageData(imgData, 0, 0);
          const resultUrl = offscreen.toDataURL('image/png');
          setBgRemovedUrl(resultUrl);
          setIsProcessingBg(false);
        };
        img.onerror = () => {
          setIsProcessingBg(false);
        };
      } catch {
        setIsProcessingBg(false);
      }
    }, 200);
  };

  // Download Handler
  const handleDownload = async () => {
    try {
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 2000);

      const filename = `forgex-image-${Date.now()}.png`;
      const targetUrl = currentDisplayUrl;

      if (targetUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = targetUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      const a = document.createElement('a');
      a.href = currentDisplayUrl;
      a.target = '_blank';
      a.download = `forgex-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Share Handler
  const handleShare = () => {
    navigator.clipboard.writeText(imageUrl);
    setIsCopiedShare(true);
    setTimeout(() => setIsCopiedShare(false), 2000);
  };

  // Submit refinement prompt
  const handleSendPromptRefinement = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    onClose();
    if (onEditPromptAndRegenerate) {
      onEditPromptAndRegenerate(clean);
    }
  };

  // Compute transform style for scaling and panning
  const getTransformStyle = () => {
    const scale = zoomLevel === 'fit' ? 1 : zoomLevel;
    return {
      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
      transformOrigin: 'center center',
      transition: isDragging ? 'none' : 'transform 0.15s ease-out',
      ...(zoomLevel === 'fit'
        ? { maxWidth: '82vw', maxHeight: '66vh', objectFit: 'contain' as const }
        : {}),
    };
  };

  const currentZoomLabel = zoomLevel === 'fit' ? 'Fit' : `${Math.round(zoomLevel * 100)}%`;
  const isPanned = panOffset.x !== 0 || panOffset.y !== 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-white text-neutral-900 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200 select-none font-sans"
      onClick={onClose}
    >
      {/* =========================================================================
          TOP BAR (White Background: "Image ▾" on left, "45% ▾", Download, Share, X on right)
          ========================================================================= */}
      <div
        className="w-full flex items-center justify-between px-4 py-3 z-30 shrink-0 border-b border-neutral-200 bg-white/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Left: "Image ▾" Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsImageMenuOpen(!isImageMenuOpen)}
            className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 flex items-center gap-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-neutral-700" />
            <span>Image</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          </button>

          {/* Image Menu Dropdown */}
          {isImageMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl bg-white border border-neutral-200 shadow-xl p-1.5 z-40 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsImageMenuOpen(false);
                  onClose();
                  onOpenInImageStudio?.(prompt, imageUrl);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 text-neutral-800 flex items-center gap-2 cursor-pointer font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Open in Image Studio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsImageMenuOpen(false);
                  handleDownload();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 text-neutral-800 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-neutral-600" />
                <span>Save High-Res File</span>
              </button>
            </div>
          )}
        </div>

        {/* Top Right: Zoom pill ("45% ▾"), Download, Share, Close X */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Zoom Percentage Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
              className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              title="Change zoom level"
            >
              <span>{currentZoomLabel}</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {/* Zoom Levels Dropdown */}
            {isZoomMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-32 rounded-2xl bg-white border border-neutral-200 shadow-xl p-1.5 z-40 text-xs">
                {ZOOM_LEVELS.map((z) => (
                  <button
                    key={z.label}
                    type="button"
                    onClick={() => {
                      setZoomLevel(z.value);
                      setIsZoomMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                      zoomLevel === z.value ? 'bg-neutral-100 text-neutral-900 font-bold' : 'hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <span>{z.label}</span>
                    {zoomLevel === z.value && <Check className="w-3 h-3 text-amber-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset position button if moved */}
          {isPanned && (
            <button
              type="button"
              onClick={() => setPanOffset({ x: 0, y: 0 })}
              className="px-2.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset position to center"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Center</span>
            </button>
          )}

          {/* Toggle Edit Tools Button */}
          <button
            type="button"
            onClick={() => {
              if (!isEditMinimized && activeTool !== 'none') {
                setActiveTool('none');
              }
              setIsEditMinimized(!isEditMinimized);
            }}
            className={`px-2.5 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
              isEditMinimized
                ? 'bg-amber-500/10 border-amber-300 text-amber-800 hover:bg-amber-500/20'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
            }`}
            title={isEditMinimized ? 'Show edit tools' : 'Minimize edit section'}
          >
            <PenTool className="w-3.5 h-3.5 text-neutral-600" />
            <span className="hidden sm:inline">{isEditMinimized ? 'Show Tools' : 'Hide Tools'}</span>
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download image"
            className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-colors cursor-pointer"
          >
            {isDownloaded ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            title="Share image"
            className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-colors cursor-pointer"
          >
            {isCopiedShare ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Close X Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close viewer (Esc)"
            className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 transition-colors cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          BODY STAGE: White Background + Movable / Draggable Canvas Stage
          ========================================================================= */}
      <div 
        className="flex-1 flex items-center justify-center relative min-h-0 w-full overflow-hidden bg-white select-none"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageTouchStart}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handleStageTouchEnd}
      >
        {/* Left Vertical Thumbnail Strip */}
        {galleryImages.length > 0 && (
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto p-1 scrollbar-none"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {galleryImages.map((imgItem) => {
              const isActive = imgItem.url === imageUrl;
              return (
                <button
                  key={imgItem.id}
                  type="button"
                  onClick={() => onSelectImage?.(imgItem)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105 shadow-md'
                      : 'border-neutral-200 opacity-60 hover:opacity-100 hover:border-neutral-400'
                  }`}
                  title={imgItem.prompt}
                >
                  <img
                    src={imgItem.url}
                    alt={imgItem.prompt}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Center Main Image Canvas Stage with Drag / Pan */}
        <div
          className="relative flex items-center justify-center p-4 max-w-full max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            style={getTransformStyle()} 
            className={`relative rounded-2xl shadow-xl overflow-hidden ${
              activeTool !== 'markup' && activeTool !== 'erase' ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            <img
              src={currentDisplayUrl}
              alt={prompt}
              draggable={false}
              className={`rounded-2xl shadow-xl transition-all select-none pointer-events-none ${
                bgRemovedUrl ? 'bg-[radial-gradient(#ccc_1px,transparent_1px)] [background-size:16px_16px]' : ''
              }`}
              onLoad={(e) => {
                const target = e.currentTarget;
                if (canvasRef.current) {
                  canvasRef.current.width = target.clientWidth;
                  canvasRef.current.height = target.clientHeight;
                }
              }}
            />

            {/* Interactive Drawing Canvas for Markup / Erase */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className={`absolute inset-0 z-20 ${
                activeTool === 'markup'
                  ? 'cursor-crosshair pointer-events-auto'
                  : activeTool === 'erase'
                  ? 'cursor-cell pointer-events-auto'
                  : 'pointer-events-none'
              }`}
            />
          </div>
        </div>

        {/* Drag Hint Pill when zoomed or moved */}
        {zoomLevel !== 'fit' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-60 text-[11px] font-medium bg-neutral-900/75 text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <Move className="w-3 h-3" />
            <span>Drag to move image</span>
          </div>
        )}

        {/* =========================================================================
            FLOATING BOTTOM ACTION TOOLBAR (Pill Bar directly below image - Minimizable)
            [Grid dots] | [Markup] | [Comment] | [Remove BG] | [Erase] | [Resize] | [Minimize ▾]
            ========================================================================= */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isEditMinimized ? (
            /* Minimized Collapsed Pill */
            <button
              type="button"
              onClick={() => setIsEditMinimized(false)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#212121]/95 hover:bg-neutral-800 text-white border border-neutral-700/80 shadow-2xl backdrop-blur-md text-xs font-medium transition-all hover:scale-105 cursor-pointer animate-in fade-in duration-150"
              title="Expand edit toolbar"
            >
              <PenTool className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Tools</span>
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          ) : (
            /* Expanded Full Toolbar */
            <div className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-full bg-[#212121]/95 text-white border border-neutral-700/80 shadow-2xl backdrop-blur-md select-none text-xs sm:text-sm font-medium animate-in fade-in duration-150">
              {/* Grip / Grid Icon */}
              <div className="p-1 text-neutral-400 hover:text-white cursor-grab">
                <GripVertical className="w-4 h-4" />
              </div>

              <div className="h-4 w-px bg-neutral-700 mx-0.5" />

              {/* Markup Tool Button */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'markup' ? 'none' : 'markup')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activeTool === 'markup'
                    ? 'bg-white text-neutral-900 font-semibold'
                    : 'hover:bg-white/10 text-neutral-200'
                }`}
                title="Draw annotations on image"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Markup</span>
              </button>

              {/* Comment Tool Button */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'comment' ? 'none' : 'comment')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activeTool === 'comment'
                    ? 'bg-white text-neutral-900 font-semibold'
                    : 'hover:bg-white/10 text-neutral-200'
                }`}
                title="Add prompt feedback or revision comment"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comment</span>
              </button>

              {/* Remove BG Tool Button */}
              <button
                type="button"
                onClick={handleRemoveBackground}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  bgRemovedUrl
                    ? 'bg-amber-500 text-neutral-950 font-semibold'
                    : 'hover:bg-white/10 text-neutral-200'
                }`}
                title="Remove background / isolate subject"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isProcessingBg ? 'Removing...' : bgRemovedUrl ? 'Restore BG' : 'Remove BG'}</span>
              </button>

              {/* Erase Tool Button */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'erase' ? 'none' : 'erase')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activeTool === 'erase'
                    ? 'bg-white text-neutral-900 font-semibold'
                    : 'hover:bg-white/10 text-neutral-200'
                }`}
                title="Erase markings"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Erase</span>
              </button>

              {/* Resize Tool Button */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'resize' ? 'none' : 'resize')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activeTool === 'resize'
                    ? 'bg-white text-neutral-900 font-semibold'
                    : 'hover:bg-white/10 text-neutral-200'
                }`}
                title="Resize or crop image"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Resize</span>
              </button>

              <div className="h-4 w-px bg-neutral-700 mx-0.5" />

              {/* Minimize Toolbar Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool('none');
                  setIsEditMinimized(true);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Minimize edit toolbar"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sub-panel: Markup Color Palette */}
          {activeTool === 'markup' && (
            <div className="mt-2 flex items-center justify-center gap-2 p-1.5 rounded-full bg-[#1e1e1e] border border-white/10 shadow-xl w-fit mx-auto text-xs text-white">
              <span className="text-[11px] text-neutral-400 pl-2">Pen:</span>
              {['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ffffff'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setMarkupColor(color)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    markupColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="h-3 w-px bg-neutral-700 mx-1" />
              <button
                type="button"
                onClick={handleClearMarkup}
                className="px-2 py-0.5 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white text-[11px] cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Sub-panel: Resize Ratios */}
          {activeTool === 'resize' && (
            <div className="mt-2 flex items-center justify-center gap-1.5 p-1.5 rounded-full bg-[#1e1e1e] border border-white/10 shadow-xl w-fit mx-auto text-xs text-white">
              <span className="text-[11px] text-neutral-400 pl-2">Ratio:</span>
              {['Original', '1:1', '16:9', '9:16', '4:3'].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setSelectedRatio(ratio)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                    selectedRatio === ratio ? 'bg-amber-500 text-neutral-950 font-bold' : 'hover:bg-white/10 text-neutral-300'
                  }`}
                >
                  {ratio}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setActiveTool('none');
                  onClose();
                  onOpenInImageStudio?.(prompt, imageUrl);
                }}
                className="ml-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer font-medium"
              >
                Crop in Studio
              </button>
            </div>
          )}

          {/* Sub-panel: Comment / Prompt Revision Drawer */}
          {activeTool === 'comment' && (
            <div className="mt-2 p-3 rounded-2xl bg-[#1e1e1e] border border-white/10 shadow-2xl max-w-md w-[90vw] mx-auto text-xs space-y-2 text-white">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="font-semibold text-white">Refine or Remix Image</span>
                <button
                  type="button"
                  onClick={() => setActiveTool('none')}
                  className="hover:text-white"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                placeholder="What would you like to change or add to this image?"
                className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-amber-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleSendPromptRefinement(commentText)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Apply & Regenerate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          BOTTOM CHAT INPUT CAPSULE (Pinned at bottom - Minimizable)
          [+ Ask ForgeX] | [Think] | [Mic] | [Send]
          ========================================================================= */}
      {!isEditMinimized && (
        <div
          className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1 z-30 shrink-0 bg-white animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="relative rounded-full px-4 py-2.5 bg-neutral-100 border border-neutral-300 shadow-sm flex items-center gap-3">
            {/* Plus / Attach Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInImageStudio?.(prompt, imageUrl);
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
              title="Open in Image Studio"
            >
              <span className="text-lg leading-none font-light">+</span>
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendPromptRefinement(chatPrompt);
                  setChatPrompt('');
                }
              }}
              placeholder="Ask ForgeX or edit this image..."
              className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-500 outline-none"
            />

            {/* Right Action Icons: Think, Mic, Send */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer hidden sm:flex items-center gap-1 text-xs"
                title="Reasoning mode"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Think</span>
              </button>

              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={!chatPrompt.trim()}
                onClick={() => {
                  handleSendPromptRefinement(chatPrompt);
                  setChatPrompt('');
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  chatPrompt.trim()
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
