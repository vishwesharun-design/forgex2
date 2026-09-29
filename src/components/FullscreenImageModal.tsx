import React, { useState, useEffect } from 'react';
import { X, Download, Pencil, Sparkles, Check, ArrowRight, Image as ImageIcon, ScanLine, Copy } from 'lucide-react';
import { ForgeXTheme } from '../types';

interface FullscreenImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  prompt: string;
  theme: ForgeXTheme;
  initialEdit?: boolean;
  ocrText?: string;
  onOpenInImageStudio?: (prompt: string, imageUrl: string) => void;
  onEditPromptAndRegenerate?: (newPrompt: string) => void;
}

export const FullscreenImageModal: React.FC<FullscreenImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  prompt,
  theme,
  initialEdit = false,
  ocrText,
  onOpenInImageStudio,
  onEditPromptAndRegenerate,
}) => {
  const [isEditingPrompt, setIsEditingPrompt] = useState(initialEdit);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [ocrCopied, setOcrCopied] = useState(false);

  useEffect(() => {
    setEditedPrompt(prompt);
  }, [prompt]);

  useEffect(() => {
    if (isOpen) {
      setIsEditingPrompt(Boolean(initialEdit));
    } else {
      setIsEditingPrompt(false);
    }
  }, [isOpen, initialEdit]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditingPrompt(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingPrompt) {
          setIsEditingPrompt(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditingPrompt, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async () => {
    try {
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 2000);

      const filename = `forgex-image-${Date.now()}.jpg`;
      if (imageUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const res = await fetch(imageUrl);
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
      a.href = imageUrl;
      a.target = '_blank';
      a.download = `forgex-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleRegenerate = () => {
    const clean = editedPrompt.trim();
    if (!clean) return;
    setIsEditingPrompt(false);
    onClose();
    if (onEditPromptAndRegenerate) {
      onEditPromptAndRegenerate(clean);
    }
  };

  const handleLaunchStudio = () => {
    onClose();
    if (onOpenInImageStudio) {
      onOpenInImageStudio(prompt, imageUrl);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Action Header Bar */}
      <div
        className="w-full flex items-center justify-between gap-3 z-20 pb-3 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Clean subtle icon with OCR text pill if available */}
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          {ocrText && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono max-w-sm sm:max-w-md truncate">
              <ScanLine className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">OCR: "{ocrText}"</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(ocrText);
                  setOcrCopied(true);
                  setTimeout(() => setOcrCopied(false), 2000);
                }}
                className="hover:text-white p-0.5 text-amber-300 transition-colors ml-1"
                title="Copy transcribed text"
              >
                {ocrCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* Right: Edit Icon, Download Icon, and Close (X) Icon */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Edit Icon Button */}
          <button
            id="btn-fullscreen-edit-image"
            type="button"
            onClick={() => setIsEditingPrompt(!isEditingPrompt)}
            title="Edit image prompt or remix in Image Studio"
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isEditingPrompt
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
            }`}
          >
            <Pencil className="w-4 h-4 text-amber-400" />
            <span>Edit</span>
          </button>

          {/* Download Icon Button */}
          <button
            id="btn-fullscreen-download-image"
            type="button"
            onClick={handleDownload}
            title="Download image"
            className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isDownloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Saved</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>Download</span>
              </>
            )}
          </button>

          {/* Close Button (X) */}
          <button
            id="btn-fullscreen-close-image"
            type="button"
            onClick={onClose}
            title="Close fullscreen view (Esc)"
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/15 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Fullscreen Image Stage */}
      <div
        className="flex-1 flex items-center justify-center min-h-0 relative p-2 sm:p-4 my-auto select-none"
        onClick={onClose}
      >
        <img
          src={imageUrl}
          alt={prompt}
          className="max-h-[82vh] max-w-[94vw] w-auto h-auto object-contain rounded-2xl shadow-2xl transition-all cursor-default select-none border border-white/10"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Inline Edit Prompt Drawer (opens when Edit icon is clicked) */}
      {isEditingPrompt && (
        <div
          className="w-full max-w-2xl mx-auto z-20 bg-neutral-900/95 border border-white/15 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Edit Image
            </span>
            <button
              type="button"
              onClick={handleLaunchStudio}
              className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-medium underline"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Open in Image Studio</span>
            </button>
          </div>

          {ocrText && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[11px] text-neutral-400">OCR Text:</span>
              <button
                type="button"
                onClick={() => setEditedPrompt((prev) => (prev ? `${prev}, with text: "${ocrText}"` : `Recreate with text: "${ocrText}"`))}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>+ Insert into Prompt</span>
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRegenerate();
              }}
              placeholder="Refine or change image prompt..."
              className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-amber-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleRegenerate}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Regenerate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
