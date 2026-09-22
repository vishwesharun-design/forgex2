import React from 'react';
import { X, Heart, Maximize2, Download, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';
import { GeneratedImage, GeneratedVideo, ForgeXTheme } from '../types';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: GeneratedImage[];
  videos: GeneratedVideo[];
  theme: ForgeXTheme;
  onViewImage: (img: GeneratedImage) => void;
  onViewVideo: (vid: GeneratedVideo) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  images,
  videos,
  theme,
  onViewImage,
  onViewVideo,
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const favoriteImages = images.filter((img) => img.isFavorite);
  const favoriteVideos = videos.filter((vid) => vid.isFavorite);
  const totalFavorites = favoriteImages.length + favoriteVideos.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/65 animate-in fade-in duration-200">
      <div
        id="modal-favorites-forgex"
        className={`relative w-full max-w-4xl rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all max-h-[85vh] flex flex-col ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/80'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl">Favorites</h3>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {totalFavorites} starred creations in your vault
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

        <div className="flex-1 overflow-y-auto space-y-8 pr-1">
          {/* Favorited Images */}
          {favoriteImages.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Images ({favoriteImages.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {favoriteImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      onClose();
                      onViewImage(img);
                    }}
                    className="group relative rounded-2xl overflow-hidden border border-neutral-800 aspect-video cursor-pointer"
                  >
                    <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                      <p className="text-[11px] text-white line-clamp-1">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorited Videos */}
          {favoriteVideos.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                <VideoIcon className="w-3.5 h-3.5" />
                <span>Videos ({favoriteVideos.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {favoriteVideos.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => {
                      onClose();
                      onViewVideo(vid);
                    }}
                    className="group relative rounded-2xl overflow-hidden border border-neutral-800 aspect-video cursor-pointer"
                  >
                    <img src={vid.thumbnailUrl} alt={vid.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end justify-between">
                      <p className="text-[11px] text-white line-clamp-1">{vid.prompt}</p>
                      <span className="text-[10px] font-mono text-amber-400">{vid.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalFavorites === 0 && (
            <div className="py-16 text-center text-neutral-500 text-xs">
              No favorites saved yet. Click the heart icon on any image or video in your studios to add it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
