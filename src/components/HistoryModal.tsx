import React, { useState } from 'react';
import { X, Clock, MessageSquare, Image as ImageIcon, Video as VideoIcon, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { ChatSession, GeneratedImage, GeneratedVideo, ForgeXTheme } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSession[];
  images: GeneratedImage[];
  videos: GeneratedVideo[];
  theme: ForgeXTheme;
  onSelectChat: (id: string) => void;
  onViewImage: (img: GeneratedImage) => void;
  onViewVideo: (vid: GeneratedVideo) => void;
  onDeleteItem?: (id: string, type: 'chat' | 'image' | 'video') => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  chats,
  images,
  videos,
  theme,
  onSelectChat,
  onViewImage,
  onViewVideo,
  onDeleteItem,
}) => {
  const [filter, setFilter] = useState<'all' | 'chats' | 'images' | 'videos'>('all');
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  // Combine items and sort by timestamp descending
  interface HistoryItem {
    id: string;
    type: 'chat' | 'image' | 'video';
    title: string;
    timestamp: number;
    previewUrl?: string;
    raw: ChatSession | GeneratedImage | GeneratedVideo;
  }

  const allItems: HistoryItem[] = [
    ...chats.map((c) => ({
      id: c.id,
      type: 'chat' as const,
      title: c.title,
      timestamp: c.updatedAt || c.createdAt,
      raw: c,
    })),
    ...images.map((i) => ({
      id: i.id,
      type: 'image' as const,
      title: i.prompt,
      timestamp: i.createdAt,
      previewUrl: i.imageUrl,
      raw: i,
    })),
    ...videos.map((v) => ({
      id: v.id,
      type: 'video' as const,
      title: v.prompt,
      timestamp: v.createdAt,
      previewUrl: v.thumbnailUrl,
      raw: v,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const filteredItems = allItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'chats') return item.type === 'chat';
    if (filter === 'images') return item.type === 'image';
    if (filter === 'videos') return item.type === 'video';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/65 animate-in fade-in duration-200">
      <div
        id="modal-history-forgex"
        className={`relative w-full max-w-3xl rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all max-h-[85vh] flex flex-col ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/80'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl">Generation History</h3>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Organized chronicle of all creative actions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-800/40">
          {(['all', 'chats', 'images', 'videos'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                filter === cat
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              No creation history recorded for this filter.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onClose();
                  if (item.type === 'chat') onSelectChat(item.id);
                  if (item.type === 'image') onViewImage(item.raw as GeneratedImage);
                  if (item.type === 'video') onViewVideo(item.raw as GeneratedVideo);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isDark
                    ? 'bg-neutral-950/50 border-neutral-800/80 hover:border-amber-500/40 hover:bg-neutral-950'
                    : 'bg-neutral-50 border-neutral-200 hover:border-amber-400 hover:bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-neutral-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold bg-neutral-800 text-neutral-300">
                        {item.type}
                      </span>
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-xs font-medium truncate ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                      {item.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onDeleteItem && (
                    <button
                      id={`btn-del-history-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id, item.type);
                      }}
                      title={`Delete this ${item.type}`}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="text-neutral-400 hover:text-amber-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
