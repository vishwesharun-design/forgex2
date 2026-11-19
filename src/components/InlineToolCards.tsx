import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  ExternalLink,
  Music,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Bot,
  ShieldAlert,
  Globe,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Wand2,
  Minimize2,
  Maximize2,
  SpellCheck,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  ActionConfirmationRequest,
  AgentStep,
  CanvasBoard,
  DataAnalysisReport,
  ForgeXTheme,
  GeneratedSong,
  PresentationDeck,
  SpotifyTrack,
  WritingAction,
  WritingCategory,
  WritingTone,
} from '../types';
import { AudioTrackPlayer } from './AudioTrackPlayer';
import { musicService } from '../services/musicService';
import { spotifyPlayerService } from '../services/spotifyPlayerService';
import { presentationService } from '../services/presentationService';
import { writingStudioService } from '../services/writingStudioService';
import { InteractiveChart, ChartConfig } from './InteractiveChart';
import { MarkdownRenderer } from './MarkdownRenderer';

function formatSecs(sec: number): string {
  const safe = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/* ============================================================================
   1. INLINE SONG GENERATOR CARD (AI Track + Vocals + Beat Mixer + Lyrics)
   ============================================================================ */
interface InlineSongCardProps {
  song: GeneratedSong;
  theme: ForgeXTheme;
  onSongUpdated?: (song: GeneratedSong) => void;
  onDeleteMessage?: () => void;
}

export const InlineSongCard: React.FC<InlineSongCardProps> = ({
  song,
  theme,
  onSongUpdated,
  onDeleteMessage,
}) => {
  const isDark = theme === 'dark';
  const [localSong, setLocalSong] = useState<GeneratedSong>(song);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(song.durationSeconds || 180);
  const [volume, setVolume] = useState(0.85);
  const playbackHandleRef = useRef<{ stop: () => void; setVolume: (v: number) => void } | null>(null);

  useEffect(() => {
    setLocalSong(song);
  }, [song]);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        musicService.stopPlayback();
      }
    };
  }, [isPlaying]);

  const handlePlayToggle = (target: GeneratedSong) => {
    if (isPlaying) {
      musicService.stopPlayback();
      playbackHandleRef.current = null;
      setIsPlaying(false);
      return;
    }
    const startOffset =
      playbackTime > 0 && playbackTime < (playbackDuration || 180) - 1 ? playbackTime : 0;
    const handle = musicService.playSong(
      target,
      (cur, dur) => {
        setPlaybackTime(cur);
        if (dur > 0) setPlaybackDuration(dur);
      },
      () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      },
      startOffset,
      volume
    );
    playbackHandleRef.current = handle;
    setIsPlaying(true);
  };

  const handleSeek = (target: GeneratedSong, timeSec: number) => {
    setPlaybackTime(timeSec);
    if (isPlaying) {
      const handle = musicService.playSong(
        target,
        (cur, dur) => {
          setPlaybackTime(cur);
          if (dur > 0) setPlaybackDuration(dur);
        },
        () => {
          setIsPlaying(false);
          setPlaybackTime(0);
        },
        timeSec,
        volume
      );
      playbackHandleRef.current = handle;
    }
  };

  const handleDownload = async (target: GeneratedSong) => {
    try {
      const url = await musicService.exportSongWav(target);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${target.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.warn('Song download failed:', e);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updatedList = musicService.toggleFavorite(id);
    const updated = updatedList.find((s) => s.id === id) || {
      ...localSong,
      isFavorite: !localSong.isFavorite,
    };
    setLocalSong(updated);
    onSongUpdated?.(updated);
  };

  const handleDelete = (id: string) => {
    if (isPlaying) {
      musicService.stopPlayback();
      setIsPlaying(false);
    }
    musicService.deleteSong(id);
    onDeleteMessage?.();
  };

  return (
    <div className="w-full max-w-2xl">
      <AudioTrackPlayer
        song={localSong}
        isPlaying={isPlaying}
        playbackTime={playbackTime}
        playbackDuration={playbackDuration}
        isDark={isDark}
        onPlayToggle={handlePlayToggle}
        onSeek={handleSeek}
        onDownload={handleDownload}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDelete}
        onVolumeChange={(v) => {
          setVolume(v);
          playbackHandleRef.current?.setVolume(v);
        }}
      />
    </div>
  );
};

/* ============================================================================
   2. INLINE SPOTIFY / MUSIC PLAYER CARD
   ============================================================================ */
interface InlineSpotifyCardProps {
  tracks: SpotifyTrack[];
  query?: string;
  theme: ForgeXTheme;
}

export const InlineSpotifyCard: React.FC<InlineSpotifyCardProps> = ({
  tracks,
  query,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [playerState, setPlayerState] = useState(() => spotifyPlayerService.getState());
  const [favorites, setFavorites] = useState<string[]>(() => spotifyPlayerService.getFavorites());
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    const unsub = spotifyPlayerService.subscribe(() => {
      setPlayerState(spotifyPlayerService.getState());
      setFavorites(spotifyPlayerService.getFavorites());
    });
    return () => {
      unsub();
    };
  }, []);

  const filteredTracks = tracks.filter((t) => {
    const q = filterText.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.creator.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q) ||
      t.mood.toLowerCase().includes(q)
    );
  });

  const activeTrackInList =
    tracks.find((t) => t.id === playerState.currentTrack?.id) || filteredTracks[0] || tracks[0];
  const isCurrentActivePlaying =
    Boolean(activeTrackInList) &&
    playerState.currentTrack?.id === activeTrackInList.id &&
    playerState.isPlaying;

  const handlePrevNext = (dir: -1 | 1) => {
    const list = filteredTracks.length > 0 ? filteredTracks : tracks;
    if (list.length === 0) return;
    const idx = list.findIndex((t) => t.id === playerState.currentTrack?.id);
    const nextIdx =
      idx === -1 ? 0 : (idx + dir + list.length) % list.length;
    spotifyPlayerService.playTrack(list[nextIdx], 0);
  };

  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <div
      className={`w-full max-w-2xl rounded-2xl border overflow-hidden ${
        isDark ? 'bg-neutral-900/90 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Headphones className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <h4 className="font-display font-semibold text-sm truncate">
              Music Player {query ? `· ${query}` : ''}
            </h4>
            <p className="text-xs text-neutral-500 tabular-nums">
              {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'} ready to stream
            </p>
          </div>
        </div>

        {tracks.length > 3 && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
              isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
            }`}
          >
            <Search className="w-3 h-3 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter tracks..."
              className="bg-transparent outline-none w-28 sm:w-36 text-xs"
            />
          </div>
        )}
      </div>

      {/* Now Playing Transport Strip */}
      {activeTrackInList && (
        <div
          className={`px-4 py-3 border-b flex flex-col gap-2.5 ${
            isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50/80 border-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {activeTrackInList.coverUrl && !brokenCovers[activeTrackInList.id] ? (
                <img
                  src={activeTrackInList.coverUrl}
                  alt={activeTrackInList.title}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenCovers((prev) => ({ ...prev, [activeTrackInList.id]: true }))
                  }
                  className="w-11 h-11 rounded-lg object-cover shrink-0 border border-neutral-700/30"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{activeTrackInList.title}</p>
                <p className="text-xs text-neutral-500 truncate">
                  {activeTrackInList.creator} · {activeTrackInList.genre}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handlePrevNext(-1)}
                title="Previous track"
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => spotifyPlayerService.togglePlayPause(activeTrackInList)}
                title={isCurrentActivePlaying ? 'Pause' : 'Play'}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {isCurrentActivePlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handlePrevNext(1)}
                title="Next track"
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {playerState.currentTrack?.id === activeTrackInList.id && (
            <div className="flex items-center gap-2.5 text-[11px] font-mono tabular-nums text-neutral-500">
              <span className="w-9 text-right">{formatSecs(playerState.currentTime)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, playerState.duration || activeTrackInList.durationSeconds || 30)}
                value={Math.min(
                  playerState.currentTime,
                  playerState.duration || activeTrackInList.durationSeconds || 30
                )}
                onChange={(e) => spotifyPlayerService.seek(Number(e.target.value))}
                className="flex-1 accent-emerald-500 h-1 cursor-pointer"
              />
              <span className="w-9">
                {formatSecs(playerState.duration || activeTrackInList.durationSeconds || 30)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Track Rows */}
      <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70 max-h-72 overflow-y-auto">
        {filteredTracks.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500">
            No matching tracks found for "{filterText}".
          </div>
        ) : (
          filteredTracks.map((track, idx) => {
            const isActive = playerState.currentTrack?.id === track.id;
            const playingThis = isActive && playerState.isPlaying;
            const isFav = favorites.includes(track.id);

            return (
              <div
                key={track.id}
                className={`px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-emerald-500/8'
                      : 'bg-emerald-50/70'
                    : isDark
                    ? 'hover:bg-neutral-800/40'
                    : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => spotifyPlayerService.togglePlayPause(track)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono tabular-nums shrink-0 transition-colors cursor-pointer ${
                      playingThis
                        ? 'bg-emerald-500 text-neutral-950'
                        : isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {playingThis ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : isActive ? (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium truncate ${
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {track.creator} · {track.album} · {track.mood}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono tabular-nums text-neutral-500">
                    {track.duration}
                  </span>
                  <button
                    type="button"
                    onClick={() => spotifyPlayerService.toggleFavorite(track.id)}
                    title={isFav ? 'Remove favorite' : 'Favorite track'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isFav
                        ? 'text-rose-500'
                        : isDark
                        ? 'text-neutral-500 hover:text-neutral-300'
                        : 'text-neutral-400 hover:text-neutral-700'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on Spotify"
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   3. INLINE PRESENTATION DECK CARD
   ============================================================================ */
interface InlinePresentationCardProps {
  deck: PresentationDeck;
  theme: ForgeXTheme;
}

export const InlinePresentationCard: React.FC<InlinePresentationCardProps> = ({
  deck,
  theme,
}) => {
  const isDark = theme === 'dark';
  const slides = deck.slides || [];
  const [currentIdx, setCurrentIdx] = useState(0);

  if (slides.length === 0) return null;
  const activeSlide = slides[Math.min(currentIdx, slides.length - 1)];

  return (
    <div
      className={`w-full max-w-2xl rounded-2xl border overflow-hidden ${
        isDark ? 'bg-neutral-900/90 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
      }`}
    >
      {/* Deck Toolbar */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <div className="min-w-0">
          <h4 className="font-display font-semibold text-sm truncate">{deck.title}</h4>
          <p className="text-xs text-neutral-500 tabular-nums">
            Slide {currentIdx + 1} of {slides.length} · {activeSlide.layout} layout
          </p>
        </div>

        <button
          type="button"
          onClick={() => presentationService.exportHTML(deck)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isDark
              ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
              : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export HTML</span>
        </button>
      </div>

      {/* Active Slide Canvas */}
      <div
        className={`p-5 sm:p-6 min-h-[240px] flex flex-col justify-between ${
          isDark ? 'bg-neutral-950/70' : 'bg-neutral-50/70'
        }`}
      >
        <div>
          <p className="text-xs font-mono tabular-nums text-amber-500 mb-1">
            0{activeSlide.slideNumber}.
          </p>
          <h3 className="font-display font-bold text-lg sm:text-xl tracking-tight mb-1 text-balance">
            {activeSlide.title}
          </h3>
          {activeSlide.subtitle && (
            <p className={`text-xs sm:text-sm mb-4 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              {activeSlide.subtitle}
            </p>
          )}

          {activeSlide.statsData && activeSlide.statsData.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-3">
              {activeSlide.statsData.map((st, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border ${
                    isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                  }`}
                >
                  <p className="font-mono font-bold text-base tabular-nums text-amber-500">
                    {st.value}
                  </p>
                  <p className="text-xs text-neutral-500">{st.label}</p>
                </div>
              ))}
            </div>
          )}

          {activeSlide.bullets && activeSlide.bullets.length > 0 && (
            <ul className="space-y-2 mt-3 text-xs sm:text-sm leading-relaxed">
              {activeSlide.bullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono text-xs text-amber-500 pt-0.5 shrink-0">•</span>
                  <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(activeSlide.keyTakeaway || activeSlide.visualNote) && (
          <div
            className={`mt-5 pt-3 border-t text-xs space-y-1 ${
              isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200 text-neutral-600'
            }`}
          >
            {activeSlide.keyTakeaway && (
              <p>
                <span className="font-semibold text-amber-500">Key takeaway:</span>{' '}
                {activeSlide.keyTakeaway}
              </p>
            )}
            {activeSlide.visualNote && (
              <p className="text-[11px] text-neutral-500">
                Visual cue: {activeSlide.visualNote}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Slide Switcher */}
      <div
        className={`px-4 py-2.5 border-t flex items-center justify-between gap-3 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-1 overflow-x-auto">
          {slides.map((s, idx) => (
            <button
              key={s.id || idx}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                idx === currentIdx
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : isDark
                  ? 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 cursor-pointer ${
              isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={currentIdx >= slides.length - 1}
            onClick={() => setCurrentIdx((i) => Math.min(slides.length - 1, i + 1))}
            className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 cursor-pointer ${
              isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. INLINE AI CANVAS / MINDMAP BOARD CARD
   ============================================================================ */
interface InlineCanvasCardProps {
  board: CanvasBoard;
  theme: ForgeXTheme;
}

export const InlineCanvasCard: React.FC<InlineCanvasCardProps> = ({ board, theme }) => {
  const isDark = theme === 'dark';
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    board.nodes?.[0]?.id || null
  );
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
    targetNodeId: string | null;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
    moved: false,
    targetNodeId: null,
  });

  const nodes = board.nodes || [];
  const edges = board.edges || [];

  // Normalize coordinates so nodes always fit cleanly inside the canvas bounds
  const minX = nodes.length > 0 ? Math.min(...nodes.map((n) => n.x)) : 0;
  const minY = nodes.length > 0 ? Math.min(...nodes.map((n) => n.y)) : 0;
  const maxX = nodes.length > 0 ? Math.max(...nodes.map((n) => n.x + (n.width || 180))) : 720;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.y + (n.height || 90))) : 420;
  const pad = 32;
  const width = Math.max(640, maxX - minX + pad * 2);
  const height = Math.max(320, maxY - minY + pad * 2);

  const computeFitView = (boxWidth: number, boxHeight: number) => {
    const safeW = Math.max(280, boxWidth);
    const safeH = Math.max(220, boxHeight);
    const fitZoom = Math.max(
      0.35,
      Math.min(1.05, Number(Math.min((safeW - 32) / width, (safeH - 32) / height).toFixed(3)))
    );
    return {
      zoom: fitZoom,
      panX: Math.round((safeW - width * fitZoom) / 2),
      panY: Math.round((safeH - height * fitZoom) / 2),
    };
  };

  const [view, setView] = useState<{ zoom: number; panX: number; panY: number }>(() =>
    computeFitView(640, 340)
  );

  // Keep a small portion of the diagram inside the box so it cannot be dragged completely off-screen
  const clampPan = (panX: number, panY: number, zoom: number) => {
    const boxW = viewportRef.current?.clientWidth || 640;
    const boxH = viewportRef.current?.clientHeight || 340;
    const margin = 72;
    const clampedX = Math.max(-width * zoom + margin, Math.min(boxW - margin, panX));
    const clampedY = Math.max(-height * zoom + margin, Math.min(boxH - margin, panY));
    return { panX: clampedX, panY: clampedY };
  };

  const handleResetView = () => {
    const boxW = viewportRef.current?.clientWidth || 640;
    const boxH = viewportRef.current?.clientHeight || 340;
    setView(computeFitView(boxW, boxH));
  };

  // Fit mindmap smoothly to the actual container dimensions when mounted or board changes
  useEffect(() => {
    handleResetView();
    setSelectedNodeId(board.nodes?.[0]?.id || null);
  }, [board.id, width, height]);

  // Native non-passive wheel listener so scrolling zooms toward cursor without scrolling the outer chat page
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      setView((prev) => {
        const factor = Math.exp(-e.deltaY * 0.0018);
        const nextZoom = Math.max(0.3, Math.min(2.5, Number((prev.zoom * factor).toFixed(3))));
        if (nextZoom === prev.zoom) return prev;

        const worldX = (cx - prev.panX) / prev.zoom;
        const worldY = (cy - prev.panY) / prev.zoom;
        const rawPanX = cx - worldX * nextZoom;
        const rawPanY = cy - worldY * nextZoom;
        const { panX, panY } = clampPan(rawPanX, rawPanY, nextZoom);
        return { zoom: nextZoom, panX, panY };
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [width, height]);

  // Global mouse/touch drag listeners for smooth panning inside the box
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (!drag.moved && Math.hypot(dx, dy) > 4) {
        drag.moved = true;
        setIsDragging(true);
      }

      if (drag.moved) {
        setView((prev) => {
          const { panX, panY } = clampPan(drag.origPanX + dx, drag.origPanY + dy, prev.zoom);
          return { ...prev, panX, panY };
        });
      }
    };

    const handlePointerUp = () => {
      const drag = dragStateRef.current;
      if (!drag.active) return;
      const wasClick = !drag.moved;
      const clickedNodeId = drag.targetNodeId;
      dragStateRef.current.active = false;
      dragStateRef.current.moved = false;
      dragStateRef.current.targetNodeId = null;
      setIsDragging(false);

      if (wasClick && clickedNodeId) {
        setSelectedNodeId(clickedNodeId);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [width, height]);

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const nodeEl = (e.target as HTMLElement).closest('[data-canvas-node-id]');
    const targetNodeId = nodeEl?.getAttribute('data-canvas-node-id') || null;

    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: view.panX,
      origPanY: view.panY,
      moved: false,
      targetNodeId,
    };
  };

  const handleButtonZoom = (delta: number) => {
    const boxW = viewportRef.current?.clientWidth || 640;
    const boxH = viewportRef.current?.clientHeight || 340;
    const cx = boxW / 2;
    const cy = boxH / 2;

    setView((prev) => {
      const nextZoom = Math.max(0.3, Math.min(2.5, Number((prev.zoom + delta).toFixed(2))));
      const worldX = (cx - prev.panX) / prev.zoom;
      const worldY = (cy - prev.panY) / prev.zoom;
      const { panX, panY } = clampPan(cx - worldX * nextZoom, cy - worldY * nextZoom, nextZoom);
      return { zoom: nextZoom, panX, panY };
    });
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(board, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(board.name || 'canvas').replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gridStep = Math.max(12, Math.round(24 * view.zoom));

  return (
    <div
      className={`w-full max-w-2xl rounded-2xl border overflow-hidden ${
        isDark ? 'bg-neutral-900/90 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
      }`}
    >
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <div className="min-w-0">
          <h4 className="font-display font-semibold text-sm truncate">{board.name}</h4>
          <p className="text-xs text-neutral-500 tabular-nums">
            {nodes.length} nodes · {edges.length} connections · Drag to pan · Scroll to zoom
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleButtonZoom(-0.15)}
            title="Zoom out"
            className={`p-1.5 rounded-lg border cursor-pointer ${
              isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono tabular-nums px-1.5 min-w-[44px] text-center">
            {Math.round(view.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleButtonZoom(0.15)}
            title="Zoom in"
            className={`p-1.5 rounded-lg border cursor-pointer ${
              isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Fit & center mindmap"
            className={`p-1.5 rounded-lg border cursor-pointer ${
              isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
              isDark ? 'border-neutral-800 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Interactive Pan & Mouse-Wheel Zoom Box */}
      <div
        ref={viewportRef}
        onPointerDown={handleViewportPointerDown}
        style={{
          touchAction: 'none',
          backgroundImage: isDark
            ? 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)'
            : 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)',
          backgroundSize: `${gridStep}px ${gridStep}px`,
          backgroundPosition: `${view.panX}px ${view.panY}px`,
        }}
        className={`relative overflow-hidden h-[340px] select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isDark ? 'bg-neutral-950/90' : 'bg-neutral-50'}`}
      >
        <div
          style={{
            width,
            height,
            transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
            transformOrigin: '0 0',
            position: 'relative',
            willChange: 'transform',
          }}
        >
          {/* Connection SVG Layer */}
          <svg
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none"
          >
            {edges.map((edge) => {
              const from = nodes.find((n) => n.id === edge.fromId);
              const to = nodes.find((n) => n.id === edge.toId);
              if (!from || !to) return null;
              const x1 = from.x - minX + pad + (from.width || 180) / 2;
              const y1 = from.y - minY + pad + (from.height || 86) / 2;
              const x2 = to.x - minX + pad + (to.width || 180) / 2;
              const y2 = to.y - minY + pad + (to.height || 86) / 2;
              return (
                <g key={edge.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isDark ? '#404040' : '#d4d4d4'}
                    strokeWidth={1.75}
                    strokeDasharray={edge.style === 'dashed' ? '5 4' : undefined}
                  />
                  {edge.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 4}
                      textAnchor="middle"
                      fontSize={10}
                      fill={isDark ? '#a3a3a3' : '#737373'}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            return (
              <button
                key={node.id}
                type="button"
                data-canvas-node-id={node.id}
                style={{
                  left: node.x - minX + pad,
                  top: node.y - minY + pad,
                  width: node.width || 180,
                  minHeight: node.height || 86,
                }}
                className={`absolute text-left p-2.5 rounded-xl border transition-colors ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                } ${
                  isSelected
                    ? isDark
                      ? 'bg-neutral-800 border-amber-500 text-white'
                      : 'bg-amber-50/70 border-amber-500 text-neutral-950'
                    : isDark
                    ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                    : 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-800 shadow-xs'
                }`}
              >
                <p className="text-[10px] font-mono text-amber-500 mb-0.5 capitalize">
                  {node.type}
                </p>
                <p className="text-xs font-semibold leading-snug line-clamp-1">
                  {node.title}
                </p>
                <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5">
                  {node.content}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Node Detail Bar */}
      {selectedNode && (
        <div
          className={`px-4 py-3 border-t text-xs ${
            isDark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'
          }`}
        >
          <p className="font-semibold mb-0.5">
            {selectedNode.title}{' '}
            <span className="font-normal text-neutral-500">· {selectedNode.type}</span>
          </p>
          <p className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>
            {selectedNode.content}
          </p>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   5. INLINE DATA ANALYSIS CARD
   ============================================================================ */
interface InlineDataAnalysisCardProps {
  report: DataAnalysisReport;
  dataset?: {
    name: string;
    rowCount: number;
    columnCount: number;
    headers: string[];
    sampleRows: Record<string, string | number>[];
  };
  theme: ForgeXTheme;
}

export const InlineDataAnalysisCard: React.FC<InlineDataAnalysisCardProps> = ({
  report,
  dataset,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'insights' | 'charts' | 'table'>('insights');

  const charts: ChartConfig[] = (report.chartSuggestions || [])
    .filter((c) => Array.isArray(c.data) && c.data.length > 0)
    .map((c) => ({
      type: c.type === 'line' ? 'line' : 'bar',
      title: c.title,
      subtitle: `${c.xAxis} vs ${c.yAxis}`,
      unit: c.yAxis,
      data: c.data!,
    }));

  const findings = report.insights || report.trends || [];
  const recs = report.recommendations || report.actionableInsights || [];

  return (
    <div
      className={`w-full max-w-2xl rounded-2xl border overflow-hidden ${
        isDark ? 'bg-neutral-900/90 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
      }`}
    >
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <h4 className="font-display font-semibold text-sm truncate">
              {report.title || report.datasetName}
            </h4>
            <p className="text-xs text-neutral-500 tabular-nums">
              {dataset
                ? `${dataset.rowCount.toLocaleString()} rows · ${dataset.columnCount} columns`
                : report.datasetName}
            </p>
          </div>
        </div>

        {/* Interactive View Switcher */}
        <div
          className={`flex items-center gap-1 p-1 rounded-lg ${
            isDark ? 'bg-neutral-950' : 'bg-neutral-100'
          }`}
        >
          {(
            [
              { id: 'insights', label: 'Insights' },
              ...(charts.length > 0 ? [{ id: 'charts', label: 'Charts' }] : []),
              ...(dataset && dataset.sampleRows.length > 0 ? [{ id: 'table', label: 'Data' }] : []),
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? isDark
                    ? 'bg-neutral-800 text-white'
                    : 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metrics Row */}
      {report.keyMetrics && report.keyMetrics.length > 0 && (
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x border-b ${
            isDark ? 'divide-neutral-800 border-neutral-800' : 'divide-neutral-200 border-neutral-200'
          }`}
        >
          {report.keyMetrics.slice(0, 3).map((metric, idx) => (
            <div key={idx} className="px-4 py-3">
              <p className="text-xs text-neutral-500 truncate">{metric.label}</p>
              <p className="font-mono font-bold text-base sm:text-lg tabular-nums mt-0.5">
                {metric.value}
              </p>
              {metric.change && (
                <p className="text-[11px] text-neutral-500 truncate mt-0.5">{metric.change}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="p-4 space-y-4 text-xs sm:text-sm">
        {activeTab === 'insights' && (
          <>
            <p className={`leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              {report.executiveSummary || report.summary}
            </p>

            {findings.length > 0 && (
              <div>
                <h5 className="font-semibold text-xs text-neutral-500 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>Key Findings</span>
                </h5>
                <ul className="space-y-1.5 text-xs leading-relaxed">
                  {findings.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 font-mono">·</span>
                      <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recs.length > 0 && (
              <div>
                <h5 className="font-semibold text-xs text-neutral-500 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Recommendations</span>
                </h5>
                <ul className="space-y-1.5 text-xs leading-relaxed">
                  {recs.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-mono">·</span>
                      <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.anomalies && report.anomalies.length > 0 && (
              <div className="pt-2 border-t border-neutral-200/70 dark:border-neutral-800/70 text-xs text-neutral-500 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{report.anomalies[0]}</span>
              </div>
            )}
          </>
        )}

        {activeTab === 'charts' && charts.length > 0 && (
          <div className="space-y-4">
            {charts.map((cfg, idx) => (
              <InteractiveChart key={idx} config={cfg} theme={theme} />
            ))}
          </div>
        )}

        {activeTab === 'table' && dataset && (
          <div className="overflow-x-auto max-h-64 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={isDark ? 'bg-neutral-950 text-neutral-400' : 'bg-neutral-50 text-neutral-600'}>
                <tr>
                  {dataset.headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold border-b border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
                {dataset.sampleRows.slice(0, 12).map((row, rIdx) => (
                  <tr key={rIdx} className={isDark ? 'hover:bg-neutral-800/40' : 'hover:bg-neutral-50'}>
                    {dataset.headers.map((h) => {
                      const val = row[h];
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={h}
                          className={`px-3 py-2 whitespace-nowrap ${
                            isNum ? 'font-mono tabular-nums text-right' : ''
                          }`}
                        >
                          {String(val ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   6. INLINE WRITING ASSISTANT CARD
   ============================================================================ */
interface InlineWritingCardProps {
  content: string;
  meta: { category: WritingCategory; tone: WritingTone };
  theme: ForgeXTheme;
  onUpdateContent: (nextContent: string) => void;
}

export const InlineWritingCard: React.FC<InlineWritingCardProps> = ({
  content,
  meta,
  theme,
  onUpdateContent,
}) => {
  const isDark = theme === 'dark';
  const [busyAction, setBusyAction] = useState<WritingAction | null>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleAlter = async (alterAction: WritingAction) => {
    if (busyAction) return;
    setBusyAction(alterAction);
    try {
      const updated = await writingStudioService.alterWriting({
        category: meta.category,
        tone: meta.tone,
        currentContent: content,
        alterAction,
      });
      onUpdateContent(updated);
    } finally {
      setBusyAction(null);
    }
  };

  const actions: { id: WritingAction; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'improve', label: 'Improve', icon: Wand2 },
    { id: 'rewrite', label: 'Rewrite', icon: RefreshCw },
    { id: 'shorten', label: 'Shorten', icon: Minimize2 },
    { id: 'expand', label: 'Expand', icon: Maximize2 },
    { id: 'grammar', label: 'Fix grammar', icon: SpellCheck },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-neutral-500 tabular-nums">
        <span>{meta.category}</span>
        <span aria-hidden="true">·</span>
        <span>{meta.tone}</span>
        <span aria-hidden="true">·</span>
        <span>{wordCount} words</span>
      </div>

      <MarkdownRenderer content={content} theme={theme} />

      <div
        className={`pt-2.5 border-t flex flex-wrap items-center gap-1.5 ${
          isDark ? 'border-neutral-800/60' : 'border-neutral-200/80'
        }`}
      >
        {actions.map((act) => {
          const Icon = act.icon;
          const isRunning = busyAction === act.id;
          return (
            <button
              key={act.id}
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => void handleAlter(act.id)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 ${
                isDark
                  ? 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800 text-neutral-300'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <Icon className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Updating...' : act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
   7. INLINE AUTONOMOUS AI AGENT CARD
   ============================================================================ */
interface InlineAgentCardProps {
  task: string;
  status: 'running' | 'awaiting_confirmation' | 'completed' | 'error';
  steps: AgentStep[];
  logs: string[];
  content: string;
  requiresConfirmation?: ActionConfirmationRequest;
  openBrowser?: boolean;
  browserUrl?: string;
  theme: ForgeXTheme;
  onConfirmAction?: (approved: boolean) => void;
}

export const InlineAgentCard: React.FC<InlineAgentCardProps> = ({
  task,
  status,
  steps,
  logs,
  content,
  requiresConfirmation,
  openBrowser,
  browserUrl,
  theme,
  onConfirmAction,
}) => {
  const isDark = theme === 'dark';
  const [stepsExpanded, setStepsExpanded] = useState(status === 'running');

  useEffect(() => {
    if (status === 'completed') {
      setStepsExpanded(false);
    }
  }, [status]);

  return (
    <div className="space-y-3 w-full max-w-2xl">
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-neutral-900/90 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
        }`}
      >
        <button
          type="button"
          onClick={() => setStepsExpanded((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Bot className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold truncate">
                {status === 'running'
                  ? `Running AI Agent · ${task}`
                  : status === 'awaiting_confirmation'
                  ? 'Agent awaiting confirmation'
                  : status === 'error'
                  ? 'Agent task error'
                  : `Agent completed · ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`}
              </p>
              <p className="text-[11px] text-neutral-500 tabular-nums">
                {logs.length} tool {logs.length === 1 ? 'event' : 'events'}
              </p>
            </div>
          </div>

          {stepsExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
          )}
        </button>

        {stepsExpanded && (steps.length > 0 || logs.length > 0) && (
          <div
            className={`px-4 pb-3 pt-2 border-t space-y-2 text-xs ${
              isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50/70'
            }`}
          >
            {steps.map((step, i) => (
              <div key={step.id || i} className="flex items-start gap-2">
                <span className="font-mono text-amber-500 tabular-nums shrink-0">
                  {i + 1}.
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{step.title}</p>
                  {step.detail && (
                    <p className="text-neutral-500 text-[11px]">{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
            {logs.length > 0 && (
              <div className="pt-1.5 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-0.5 font-mono text-[11px] text-neutral-500">
                {logs.slice(-6).map((log, i) => (
                  <p key={i} className="truncate">
                    {log}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {requiresConfirmation && status === 'awaiting_confirmation' && onConfirmAction && (
          <div
            className={`px-4 py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDark ? 'border-neutral-800 bg-amber-500/5' : 'border-neutral-200 bg-amber-50/60'
            }`}
          >
            <div className="flex items-start gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold">{requiresConfirmation.title}</p>
                <p className="text-neutral-500">{requiresConfirmation.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onConfirmAction(false)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                  isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-300 hover:bg-white'
                }`}
              >
                Deny
              </button>
              <button
                type="button"
                onClick={() => onConfirmAction(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold cursor-pointer"
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </div>

      {openBrowser && browserUrl && (
        <a
          href={browserUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            isDark
              ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
              : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span className="truncate max-w-xs">Open {browserUrl}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {content && <MarkdownRenderer content={content} theme={theme} />}
    </div>
  );
};


