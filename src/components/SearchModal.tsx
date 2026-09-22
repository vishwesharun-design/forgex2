import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, Image as ImageIcon, Video as VideoIcon, ArrowRight } from 'lucide-react';
import { ChatSession, GeneratedImage, GeneratedVideo, ForgeXTheme } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSession[];
  images: GeneratedImage[];
  videos: GeneratedVideo[];
  theme: ForgeXTheme;
  onSelectChat: (id: string) => void;
  onViewImage: (img: GeneratedImage) => void;
  onViewVideo: (vid: GeneratedVideo) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  chats,
  images,
  videos,
  theme,
  onSelectChat,
  onViewImage,
  onViewVideo,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const q = query.toLowerCase().trim();

  const matchingChats = q ? chats.filter((c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q))) : chats.slice(0, 3);
  const matchingImages = q ? images.filter((img) => img.prompt.toLowerCase().includes(q) || img.style.toLowerCase().includes(q)) : images.slice(0, 3);
  const matchingVideos = q ? videos.filter((vid) => vid.prompt.toLowerCase().includes(q)) : videos.slice(0, 3);

  const totalResults = matchingChats.length + matchingImages.length + matchingVideos.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-20 overflow-y-auto backdrop-blur-md bg-black/65 animate-in fade-in duration-150">
      <div
        id="modal-search-forgex"
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/80'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
        }`}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 p-4 border-b border-neutral-800/40">
          <Search className="w-5 h-5 text-neutral-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            id="search-input-field"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations, images, and video creations..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-neutral-500 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className={`text-xs px-2 py-1 rounded-lg border ${
              isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200 text-neutral-500'
            }`}
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {matchingChats.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                Conversations
              </p>
              <div className="space-y-1">
                {matchingChats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onClose();
                      onSelectChat(c.id);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-medium truncate">{c.title}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchingImages.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                Images
              </p>
              <div className="space-y-1">
                {matchingImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => {
                      onClose();
                      onViewImage(img);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <img src={img.imageUrl} alt="preview" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                      <span className="text-xs font-medium truncate">{img.prompt}</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500">{img.style}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchingVideos.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                Videos
              </p>
              <div className="space-y-1">
                {matchingVideos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onClose();
                      onViewVideo(v);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <img src={v.thumbnailUrl} alt="preview" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                      <span className="text-xs font-medium truncate">{v.prompt}</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400">{v.duration}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <div className="py-12 text-center text-xs text-neutral-500">
              No results matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
