import React, { useState } from 'react';
import { X, Clock, MessageSquare, Image as ImageIcon, Video as VideoIcon, Music, Calendar, ArrowRight, Trash2, Mail, ShieldCheck } from 'lucide-react';
import { ChatSession, GeneratedImage, GeneratedSong, GeneratedVideo, ForgeXTheme } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSession[];
  images: GeneratedImage[];
  videos: GeneratedVideo[];
  songs?: GeneratedSong[];
  currentUserEmail?: string;
  theme: ForgeXTheme;
  onSelectChat: (id: string) => void;
  onViewImage: (img: GeneratedImage) => void;
  onViewVideo: (vid: GeneratedVideo) => void;
  onSelectSong?: (song: GeneratedSong) => void;
  onDeleteItem?: (id: string, type: 'chat' | 'image' | 'video' | 'song') => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  chats,
  images,
  videos,
  songs = [],
  currentUserEmail,
  theme,
  onSelectChat,
  onViewImage,
  onViewVideo,
  onSelectSong,
  onDeleteItem,
}) => {
  const [filter, setFilter] = useState<'all' | 'chats' | 'songs' | 'images' | 'videos'>('all');
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  // Combine items and sort by timestamp descending
  interface HistoryItem {
    id: string;
    type: 'chat' | 'image' | 'video' | 'song';
    title: string;
    timestamp: number;
    previewUrl?: string;
    subtitle?: string;
    raw: ChatSession | GeneratedImage | GeneratedVideo | GeneratedSong;
  }

  const allItems: HistoryItem[] = [
    ...chats.map((c) => ({
      id: c.id,
      type: 'chat' as const,
      title: c.title,
      timestamp: c.updatedAt || c.createdAt,
      raw: c,
    })),
    ...songs.map((s) => ({
      id: s.id,
      type: 'song' as const,
      title: s.title,
      subtitle: s.artist ? `${s.artist} • ${s.genre}` : s.genre,
      timestamp: s.createdAt,
      previewUrl: s.coverUrl,
      raw: s,
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
    if (filter === 'songs') return item.type === 'song';
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-xl">Generation History</h3>
                {currentUserEmail && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isDark
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                      : 'bg-amber-100 border border-amber-300 text-amber-800 font-medium'
                  }`}>
                    <Mail className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>{currentUserEmail}</span>
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Isolated personal history database for {currentUserEmail ? currentUserEmail : 'this session'}
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
        <div className={`flex items-center gap-2 mb-4 pb-2 border-b flex-wrap ${
          isDark ? 'border-neutral-800/40' : 'border-neutral-200'
        }`}>
          {(['all', 'chats', 'songs', 'images', 'videos'] as const).map((cat) => (
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
              {cat} ({cat === 'all' ? allItems.length : allItems.filter(i => i.type === (cat === 'chats' ? 'chat' : cat === 'songs' ? 'song' : cat === 'images' ? 'image' : 'video')).length})
            </button>
          ))}
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              No creation history recorded in this account's database for this filter.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onClose();
                  if (item.type === 'chat') onSelectChat(item.id);
                  if (item.type === 'song' && onSelectSong) onSelectSong(item.raw as GeneratedSong);
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
                  ) : item.type === 'song' ? (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-100 text-amber-700 border-amber-300'
                    }`}>
                      <Music className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                        isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-800'
                      }`}>
                        {item.type}
                      </span>
                      {item.subtitle && (
                        <span className={`text-[10px] truncate max-w-[150px] ${
                          isDark ? 'text-amber-400/90 font-medium' : 'text-amber-700 font-semibold'
                        }`}>
                          {item.subtitle}
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold truncate leading-tight">
                      {item.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onDeleteItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id, item.type);
                      }}
                      title="Delete item"
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ArrowRight className="w-4 h-4 text-neutral-500" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
