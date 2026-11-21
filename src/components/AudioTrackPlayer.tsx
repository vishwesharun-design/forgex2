import React from 'react';
import { Play, Pause } from 'lucide-react';
import { GeneratedSong } from '../types';

interface AudioTrackPlayerProps {
  song: GeneratedSong;
  isPlaying: boolean;
  playbackTime: number;
  playbackDuration: number;
  isDark: boolean;
  onPlayToggle: (song: GeneratedSong) => void;
  onSeek?: (song: GeneratedSong, timeSeconds: number) => void;
  onDownload?: (song: GeneratedSong) => void;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  onVolumeChange?: (vol: number) => void;
  onSaveToCloud?: (song: GeneratedSong) => void;
}

export const AudioTrackPlayer: React.FC<AudioTrackPlayerProps> = ({
  song,
  isPlaying,
  playbackTime,
  playbackDuration,
  isDark,
  onPlayToggle,
  onSeek,
}) => {
  const duration =
    playbackDuration && playbackDuration > 0
      ? playbackDuration
      : song.durationSeconds && song.durationSeconds > 0
      ? song.durationSeconds
      : 180;

  const clampedTime = Math.max(0, Math.min(duration, playbackTime || 0));
  const progressPercent = Math.min(100, Math.max(0, (clampedTime / duration) * 100));

  const formatTime = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (onSeek && Number.isFinite(newTime)) {
      onSeek(song, newTime);
    }
  };

  return (
    <div
      id={`audio-player-${song.id}`}
      className={`rounded-2xl border px-4 py-3.5 transition-colors ${
        isDark
          ? 'bg-[#1a1a1f] border-white/[0.08] text-neutral-100'
          : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => onPlayToggle(song)}
          aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-neutral-200 hover:bg-white text-neutral-950'
              : 'bg-neutral-900 hover:bg-neutral-800 text-white'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate" title={song.title}>
              {song.title}
            </p>
            <span
              className={`text-xs font-mono tabular-nums shrink-0 ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {playbackTime > 0 ? `${formatTime(clampedTime)} / ` : ''}
              {formatTime(duration)}
            </span>
          </div>

          <div className="relative h-4 flex items-center group">
            <div
              className={`w-full h-1.5 rounded-full overflow-hidden ${
                isDark ? 'bg-neutral-800' : 'bg-neutral-200'
              }`}
            >
              <div
                className="h-full rounded-full bg-sky-400 transition-[width] duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={clampedTime}
              onChange={handleScrubberChange}
              aria-label={`Seek ${song.title}`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
