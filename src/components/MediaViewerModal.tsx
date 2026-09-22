import React from 'react';
import { X, Download, Copy, Heart, Sparkles, Zap, Trash2 } from 'lucide-react';
import { GeneratedImage, GeneratedVideo, ForgeXTheme, FORGEX_MODELS } from '../types';
import { SlideMotionPlayer } from './SlideMotionPlayer';

interface MediaViewerModalProps {
  media: {
    type: 'image' | 'video';
    item: GeneratedImage | GeneratedVideo;
  } | null;
  onClose: () => void;
  theme: ForgeXTheme;
  onToggleFavorite: (id: string, type: 'image' | 'video') => void;
  onDelete?: (id: string, type: 'image' | 'video') => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  media,
  onClose,
  theme,
  onToggleFavorite,
  onDelete,
}) => {
  if (!media) return null;
  const isDark = theme === 'dark';
  const { type, item } = media;

  const modelMeta = FORGEX_MODELS.find((m) => m.id === item.modelId) || FORGEX_MODELS[4];

  const handleDownload = () => {
    const a = document.createElement('a');
    if (type === 'image') {
      a.href = (item as GeneratedImage).imageUrl;
      a.download = `forgex-${item.id}.jpg`;
    } else {
      a.href = (item as GeneratedVideo).videoUrl;
      a.download = `forgex-${item.id}.mp4`;
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(item.prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 backdrop-blur-xl bg-black/80 animate-in fade-in duration-200">
      <div
        id="modal-media-viewer"
        className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] ${
          isDark
            ? 'bg-neutral-950 border-neutral-800 text-white shadow-black'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-2xl'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-xl bg-black/60 hover:bg-neutral-800 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media stage */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[480px] p-2 relative">
          {type === 'image' ? (
            <img
              src={(item as GeneratedImage).imageUrl}
              alt={item.prompt}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
            />
          ) : (
            <div className={`relative max-h-[75vh] flex items-center justify-center ${
              (item as GeneratedVideo).aspectRatio === '9:16'
                ? 'aspect-[9/16] h-[75vh] max-w-sm'
                : (item as GeneratedVideo).aspectRatio === '1:1'
                ? 'aspect-square h-[75vh] max-w-xl'
                : 'aspect-video w-full max-w-4xl'
            }`}>
              <SlideMotionPlayer
                video={item as GeneratedVideo}
                isPlaying={true}
                isDark={isDark}
              />
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div
          className={`w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l ${
            isDark ? 'border-neutral-850 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold uppercase">
                {type}
              </span>
              <span className="text-[11px] font-mono text-neutral-400 inline-flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{modelMeta.name}</span>
              </span>
            </div>

            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Creation Prompt
            </h4>
            <p className="text-xs sm:text-sm leading-relaxed mb-4 select-text">
              {item.prompt}
            </p>

            <div className="space-y-2 text-xs text-neutral-400 border-t border-neutral-800/40 pt-4 mb-6">
              <div className="flex justify-between">
                <span>Aspect Ratio</span>
                <span className="font-mono text-neutral-200">{item.aspectRatio}</span>
              </div>
              {type === 'image' && (
                <div className="flex justify-between">
                  <span>Style Preset</span>
                  <span className="font-mono text-neutral-200">{(item as GeneratedImage).style}</span>
                </div>
              )}
              {type === 'video' && (
                <>
                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span className="font-mono text-neutral-200">{(item as GeneratedVideo).duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality</span>
                    <span className="font-mono text-neutral-200">{(item as GeneratedVideo).quality}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>Created</span>
                <span className="font-mono text-neutral-200">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>

              <button
                onClick={() => onToggleFavorite(item.id, type)}
                className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors ${
                  item.isFavorite
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : isDark
                      ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                      : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              onClick={copyPrompt}
              className={`w-full py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                isDark ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300' : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Prompt Text</span>
            </button>

            {onDelete && (
              <button
                id="btn-delete-modal-item"
                onClick={() => {
                  onDelete(item.id, type);
                  onClose();
                }}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {type === 'image' ? 'Image' : 'Video'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
