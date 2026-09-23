import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Shuffle, 
  Repeat, 
  Heart, 
  Search, 
  ExternalLink, 
  Sparkles, 
  Music2, 
  Radio, 
  Film, 
  Flame, 
  Zap, 
  Coffee, 
  Sliders, 
  ListMusic, 
  Grid, 
  Share2, 
  Check, 
  Headphones, 
  Info,
  Disc,
  Disc3,
  Waves,
  Gauge,
  Music,
  CheckCircle2,
  ListPlus
} from 'lucide-react';
import { SpotifyTrack, SpotifyCategoryType, ForgeXTheme } from '../types';
import { SPOTIFY_CATEGORIES, SPOTIFY_TRACKS } from '../data/spotifyMusicData';
import { spotifyPlayerService } from '../services/spotifyPlayerService';

// Official Spotify Brand SVG Icon
export const SpotifyBrandIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

interface SpotifyStudioWorkspaceProps {
  theme: ForgeXTheme;
}

export const SpotifyStudioWorkspace: React.FC<SpotifyStudioWorkspaceProps> = ({ theme }) => {
  const isDark = theme === 'dark';

  // Category & Filter State
  const [selectedCategory, setSelectedCategory] = useState<SpotifyCategoryType | 'all'>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);

  // Player State synced with real audio service
  const [playerState, setPlayerState] = useState(() => spotifyPlayerService.getState());
  const [favorites, setFavorites] = useState<string[]>(() => spotifyPlayerService.getFavorites());
  const [currentSong, setCurrentSong] = useState<SpotifyTrack>(() => SPOTIFY_TRACKS[0]);
  const [playbackMode, setPlaybackMode] = useState<'full_song' | 'real_audio' | 'spotify_embed'>('real_audio');

  // Background Audio Streaming Engine (Streams full 3+ min audio with NO video shown in UI)
  const [bgIsPlaying, setBgIsPlaying] = useState(false);
  const [bgCurrentTime, setBgCurrentTime] = useState(0);
  const [bgVolume, setBgVolume] = useState(0.85);
  const [bgIsMuted, setBgIsMuted] = useState(false);
  const bgIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Parse duration helper (e.g. "3:23" -> 203)
  const songDurationSeconds = useMemo(() => {
    if (!currentSong.duration) return 180;
    const parts = currentSong.duration.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    return 180;
  }, [currentSong]);

  // Background stream URL for current track (YouTube with autoplay and JS API enabled)
  const bgStreamUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (currentSong.youtubeId) {
      return `https://www.youtube-nocookie.com/embed/${currentSong.youtubeId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
    }
    return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(currentSong.creator + ' ' + currentSong.title + ' audio')}&autoplay=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
  }, [currentSong]);

  // Send command to hidden background YouTube iframe
  const sendBgCommand = (func: string, args: (number | string | boolean)[] = []) => {
    try {
      bgIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch (e) {
      console.warn('Background command notice:', e);
    }
  };

  // Timer interval for background audio scrubber
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (bgIsPlaying && playbackMode === 'full_song') {
      interval = setInterval(() => {
        setBgCurrentTime((prev) => {
          if (prev >= songDurationSeconds) {
            if (playerState.isRepeating) {
              sendBgCommand('seekTo', [0, true]);
              sendBgCommand('playVideo');
              return 0;
            } else {
              handleNextTrack();
              return 0;
            }
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [bgIsPlaying, playbackMode, songDurationSeconds, playerState.isRepeating]);

  const toggleBgPlayPause = () => {
    if (playerState.isPlaying) {
      spotifyPlayerService.pause();
      setBgIsPlaying(false);
    } else {
      if (playerState.duration > 0 && playerState.currentTime >= playerState.duration - 0.5) {
        spotifyPlayerService.seek(0);
      }
      spotifyPlayerService.playTrack(currentSong, playerState.currentTime);
      setBgIsPlaying(true);
    }
  };

  const seekBg = (seconds: number) => {
    spotifyPlayerService.seek(seconds);
    setBgCurrentTime(seconds);
  };

  const setBgVol = (val: number) => {
    setBgVolume(val);
    spotifyPlayerService.setVolume(val);
  };

  const toggleBgMute = () => {
    const nextMuted = !bgIsMuted;
    setBgIsMuted(nextMuted);
    spotifyPlayerService.toggleMute();
  };

  // Mobile View Toggle
  const [mobileTab, setMobileTab] = useState<'browse' | 'player'>('browse');

  // Canvas Waveform Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subscribe to real audio player service
  useEffect(() => {
    const unsubscribe = spotifyPlayerService.subscribe(() => {
      const state = spotifyPlayerService.getState();
      setPlayerState(state);
      if (state.currentTrack) {
        setCurrentSong(state.currentTrack);
      }
      setFavorites(spotifyPlayerService.getFavorites());
    });
    return () => unsubscribe();
  }, []);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return SPOTIFY_TRACKS.filter((track) => {
      const matchesCategory = selectedCategory === 'all' || track.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        track.title.toLowerCase().includes(q) || 
        track.creator.toLowerCase().includes(q) || 
        track.album.toLowerCase().includes(q) ||
        track.genre.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Current category metadata
  const currentCategoryMeta = useMemo(() => {
    if (selectedCategory === 'all') {
      return {
        name: 'All Curated Tracks',
        description: 'Browse all 60 authentic tracks across 6 categories. Stream real audio directly or launch in Spotify.',
        count: SPOTIFY_TRACKS.length,
      };
    }
    const cat = SPOTIFY_CATEGORIES.find((c) => c.id === selectedCategory);
    return {
      name: cat ? cat.name : 'Curated Tracks',
      description: cat ? cat.description : '',
      count: SPOTIFY_TRACKS.filter((t) => t.category === selectedCategory).length,
    };
  }, [selectedCategory]);

  // Handle Play Real Song
  const handlePlayRealSong = (track: SpotifyTrack, modeOverride?: 'full_song' | 'real_audio' | 'spotify_embed') => {
    const isSameTrack = currentSong.id === track.id;
    setCurrentSong(track);
    const targetMode = modeOverride || playbackMode;

    if (targetMode === 'spotify_embed') {
      spotifyPlayerService.pause();
      setBgIsPlaying(false);
    } else {
      setBgIsPlaying(false);
      if (playerState.duration > 0 && playerState.currentTime >= playerState.duration - 0.5) {
        spotifyPlayerService.seek(0);
      }
      spotifyPlayerService.playTrack(track, isSameTrack ? playerState.currentTime : 0);
    }

    if (modeOverride) {
      setPlaybackMode(modeOverride);
    }
    setMobileTab('player');
  };

  // Handle Next Track
  const handleNextTrack = () => {
    const list = filteredTracks.length > 0 ? filteredTracks : SPOTIFY_TRACKS;
    const currentIndex = list.findIndex((t) => t.id === currentSong.id);
    let nextIndex = (currentIndex + 1) % list.length;
    if (playerState.isShuffled) {
      nextIndex = Math.floor(Math.random() * list.length);
    }
    handlePlayRealSong(list[nextIndex]);
  };

  // Handle Previous Track
  const handlePrevTrack = () => {
    const list = filteredTracks.length > 0 ? filteredTracks : SPOTIFY_TRACKS;
    const currentIndex = list.findIndex((t) => t.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    handlePlayRealSong(list[prevIndex]);
  };

  // Toggle Favorite
  const handleToggleFavorite = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    spotifyPlayerService.toggleFavorite(trackId);
    setFavorites(spotifyPlayerService.getFavorites());
  };

  // Copy Track Link
  const handleCopyTrackLink = (e: React.MouseEvent, track: SpotifyTrack) => {
    e.stopPropagation();
    navigator.clipboard.writeText(track.spotifyUrl);
    setCopiedTrackId(track.id);
    setTimeout(() => setCopiedTrackId(null), 2000);
  };

  // High-Fidelity Audio Spectrum Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const analyser = spotifyPlayerService.getAnalyser();
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 32);

    const renderSpectrum = () => {
      animationId = requestAnimationFrame(renderSpectrum);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyser && playerState.isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else if (bgIsPlaying) {
        // High-energy reactive pulse when streaming full background song
        const now = Date.now() / 150;
        for (let i = 0; i < dataArray.length; i++) {
          const w1 = Math.sin(now * 1.6 + i * 0.45) * 60;
          const w2 = Math.cos(now * 2.3 + i * 0.3) * 45;
          const beat = Math.sin(now * 3.5) > 0.55 ? 65 : 0;
          dataArray[i] = Math.min(255, Math.max(20, Math.floor(125 + w1 + w2 + beat)));
        }
      } else {
        // Idle gentle waveform pulse
        const now = Date.now() / 250;
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = playerState.isPlaying ? 85 + Math.sin(now + i * 0.4) * 45 : 16;
        }
      }

      const barCount = 32;
      const barWidth = (width / barCount) - 2;
      const step = Math.floor(dataArray.length / barCount) || 1;

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] || 0;
        const barHeight = Math.max(3, (val / 255) * height * 0.95);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Gradient with Spotify Green and Electric Cyan
        const gradient = ctx.createLinearGradient(0, height, 0, y);
        gradient.addColorStop(0, '#10b981'); // Emerald
        gradient.addColorStop(0.5, '#1db954'); // Spotify Green
        gradient.addColorStop(1, '#38bdf8'); // Sky Blue

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
        ctx.fill();
      }
    };

    renderSpectrum();
    return () => cancelAnimationFrame(animationId);
  }, [playerState.isPlaying]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Studio Header */}
      <header className={`px-4 sm:px-6 py-3 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'border-neutral-850 bg-neutral-950/85 backdrop-blur-xl' : 'border-neutral-200 bg-white/85 backdrop-blur-xl'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1DB954] to-emerald-400 text-black flex items-center justify-center shadow-lg shadow-[#1DB954]/25 shrink-0">
            <Music className="w-5 h-5 fill-black text-black stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate flex items-center gap-2">
                Music Player
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30">
                <CheckCircle2 className="w-3 h-3 text-[#1DB954]" />
                Real Song Player
              </span>
            </div>
            <p className={`text-xs truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Listen to real recorded master audio: Interstellar, Levitating, 60 songs in 6 categories & direct Spotify icons.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handlePlayRealSong(SPOTIFY_TRACKS[0])}
            className="px-3.5 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#1DB954]/25 transition-all active:scale-95"
            title="Play Interstellar Cornfield Chase Real Audio"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Play Cornfield Chase</span>
          </button>

          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isDark 
                ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:border-[#1DB954]/50' 
                : 'border-neutral-200 bg-white text-neutral-700 hover:text-black hover:border-[#1DB954]/50'
            }`}
            title="Open Spotify Web App"
          >
            <SpotifyBrandIcon className="w-3.5 h-3.5 text-[#1DB954]" />
            <span className="hidden sm:inline">Spotify Web</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </a>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className={`flex md:hidden items-center border-b px-3 py-1.5 gap-2 shrink-0 ${
        isDark ? 'border-neutral-850 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-100'
      }`}>
        <button
          type="button"
          onClick={() => setMobileTab('browse')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'browse'
              ? 'bg-[#1DB954] text-black font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Browse Library ({filteredTracks.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('player')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'player'
              ? 'bg-[#1DB954] text-black font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <Disc3 className={`w-3.5 h-3.5 ${playerState.isPlaying ? 'animate-spin text-black' : ''}`} />
          <span>Player & Audio</span>
        </button>
      </div>

      {/* Main Studio Body: Left Track Browser + Right High-End Player Dock */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Column: Categories Bar & Track Browser */}
        <div className={`flex-1 flex flex-col overflow-hidden ${
          mobileTab === 'browse' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Categories Horizontal Tabs */}
          <div className={`px-4 sm:px-6 pt-3 pb-2 border-b shrink-0 overflow-x-auto no-scrollbar ${
            isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50/60'
          }`}>
            <div className="flex items-center gap-2 min-w-max">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm font-bold'
                    : isDark
                    ? 'bg-neutral-900/60 text-neutral-400 hover:text-white border border-neutral-800/80'
                    : 'bg-white text-neutral-600 hover:text-black border border-neutral-200'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>All Categories (60)</span>
              </button>

              {SPOTIFY_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-[#1DB954] text-black font-bold shadow-md shadow-[#1DB954]/25 border border-[#1DB954]'
                        : isDark
                        ? 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80 hover:border-neutral-700'
                        : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive 
                        ? 'bg-black/20 text-black' 
                        : isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      10
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Real Song Status & View Toggles */}
          <div className={`px-4 sm:px-6 py-2.5 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'border-neutral-850 bg-neutral-950/40' : 'border-neutral-200 bg-white/40'
          }`}>
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, creator names (Hans Zimmer, Dua Lipa), albums..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border transition-all focus:outline-none focus:ring-1 focus:ring-[#1DB954] ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                    : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
                }`}
              />
            </div>

            {/* View Stats & Toggles */}
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                <strong className="text-[#1DB954]">{filteredTracks.length}</strong> songs loaded
              </span>

              <div className={`flex items-center rounded-xl p-0.5 border ${
                isDark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-neutral-100'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#1DB954] text-black shadow-sm'
                      : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                  }`}
                  title="Grid Cards View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#1DB954] text-black shadow-sm'
                      : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                  }`}
                  title="List Rows View"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tracks View List / Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Category Hero Banner */}
            <div className={`mb-6 p-4 sm:p-5 rounded-2xl border relative overflow-hidden ${
              isDark 
                ? 'bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border-neutral-800/80 shadow-lg' 
                : 'bg-gradient-to-r from-emerald-50 via-white to-neutral-50 border-neutral-200 shadow-sm'
            }`}>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30">
                      Music Player Category
                    </span>
                    <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      10 Real Master Songs Included
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    {currentCategoryMeta.name}
                  </h2>
                  <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {currentCategoryMeta.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (filteredTracks.length > 0) {
                        handlePlayRealSong(filteredTracks[0]);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#1DB954]/25 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Play Real Songs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (filteredTracks.length > 0) {
                        const randomTrack = filteredTracks[Math.floor(Math.random() * filteredTracks.length)];
                        handlePlayRealSong(randomTrack);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isDark 
                        ? 'border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:text-white' 
                        : 'border-neutral-200 bg-white text-neutral-700 hover:text-black'
                    }`}
                  >
                    <Shuffle className="w-3.5 h-3.5 text-[#1DB954]" />
                    <span>Shuffle</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Empty Search Result */}
            {filteredTracks.length === 0 ? (
              <div className="py-16 text-center">
                <Music2 className="w-12 h-12 mx-auto text-neutral-500 mb-3 opacity-50" />
                <h3 className="text-base font-semibold">No matching songs found</h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Try searching another song title or creator name.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 px-3.5 py-1.5 rounded-xl bg-[#1DB954] text-black text-xs font-bold"
                >
                  Reset Library
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTracks.map((track) => {
                  const isCurrent = currentSong.id === track.id;
                  const isPlayingCurrent = isCurrent && playerState.isPlaying;
                  const isFav = favorites.includes(track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayRealSong(track)}
                      className={`group rounded-2xl border p-4 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isCurrent
                          ? 'border-[#1DB954] bg-[#1DB954]/10 shadow-lg shadow-[#1DB954]/15'
                          : isDark
                          ? 'border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-850/80'
                          : 'border-neutral-200/80 bg-white hover:border-neutral-300 hover:bg-neutral-50 shadow-sm'
                      }`}
                    >
                      {/* Top Row: Artwork + Title + Creator */}
                      <div className="flex gap-3 items-start">
                        {/* Artwork with spinning vinyl hover effect */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                            isPlayingCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <div className="w-8 h-8 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                              {isPlayingCurrent ? (
                                <Pause className="w-4 h-4 fill-black" />
                              ) : (
                                <Play className="w-4 h-4 fill-black ml-0.5" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Song Title & CREATOR NAME BELOW THAT SONG */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className={`font-bold text-sm tracking-tight truncate leading-snug ${
                              isCurrent ? 'text-[#1DB954]' : isDark ? 'text-white' : 'text-neutral-900'
                            }`}>
                              {track.title}
                            </h3>
                            <span className="text-[11px] font-mono tabular-nums text-neutral-400 shrink-0 leading-none">
                              {track.duration}
                            </span>
                          </div>

                          {/* USER REQUIREMENT: "give the creator name belove that song" */}
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs font-bold text-[#1DB954] truncate flex items-center gap-1 leading-normal">
                              <span className="text-neutral-400 font-normal">By</span>
                              <span>{track.creator}</span>
                            </p>
                            <p className={`text-[11px] truncate leading-normal ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              {track.album} • {track.year}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Song Description */}
                      <p className={`text-[11px] line-clamp-2 mt-2.5 leading-relaxed text-left ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {track.description}
                      </p>

                      {/* Bottom Footer Actions: Spotify Link Icon + Favorite + Play Real Song Button */}
                      <div className="mt-3.5 pt-2.5 border-t border-neutral-800/40 flex items-center justify-between gap-2">
                        {/* Real Audio Pill */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Real Song
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Favorite Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, track.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isFav
                                ? 'text-rose-500 bg-rose-500/10'
                                : isDark
                                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                            }`}
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                          </button>

                          {/* Share Link */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyTrackLink(e, track)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                            }`}
                            title="Copy Spotify track URL"
                          >
                            {copiedTrackId === track.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* USER REQUIREMENT: "and add a icon which take user to that song in Spotify" */}
                          <a
                            href={track.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 group/link"
                            title={`Open "${track.title}" on Spotify`}
                          >
                            <SpotifyBrandIcon className="w-3.5 h-3.5 fill-black" />
                            <span>Spotify</span>
                            <ExternalLink className="w-2.5 h-2.5 text-black/70 group-hover/link:translate-x-0.5 transition-transform" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className={`rounded-2xl border divide-y overflow-hidden ${
                isDark ? 'border-neutral-800 bg-neutral-900/60 divide-neutral-800/60' : 'border-neutral-200 bg-white divide-neutral-100'
              }`}>
                {filteredTracks.map((track, idx) => {
                  const isCurrent = currentSong.id === track.id;
                  const isPlayingCurrent = isCurrent && playerState.isPlaying;
                  const isFav = favorites.includes(track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayRealSong(track)}
                      className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-[#1DB954]/10'
                          : isDark
                          ? 'hover:bg-neutral-850/60'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Number or Equalizer */}
                        <div className="w-6 text-center shrink-0">
                          {isPlayingCurrent ? (
                            <Waves className="w-4 h-4 text-[#1DB954] animate-pulse mx-auto" />
                          ) : (
                            <span className={`text-xs font-mono ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                              {idx + 1}
                            </span>
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative group/thumb shadow-sm">
                          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <Play className="w-3.5 h-3.5 fill-white text-white" />
                          </div>
                        </div>

                        {/* Song Title & CREATOR NAME BELOW THAT SONG */}
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold truncate ${
                            isCurrent ? 'text-[#1DB954]' : isDark ? 'text-white' : 'text-neutral-900'
                          }`}>
                            {track.title}
                          </div>
                          <div className="text-xs text-[#1DB954] font-semibold truncate flex items-center gap-1.5">
                            <span className="text-neutral-400 font-normal">By</span>
                            <span>{track.creator}</span>
                            <span className="text-neutral-500">•</span>
                            <span className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              {track.album}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Meta + Spotify Icon Link */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-flex">
                          Real Audio
                        </span>

                        <span className="hidden sm:inline-block text-xs font-mono tabular-nums text-neutral-400">
                          {track.duration}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, track.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isFav ? 'text-rose-500' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                        </button>

                        {/* USER REQUIREMENT: "and add a icon which take user to that song in Spotify" */}
                        <a
                          href={track.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-xl bg-[#1DB954]/15 hover:bg-[#1DB954] text-[#1DB954] hover:text-black transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
                          title="Open in Spotify"
                        >
                          <SpotifyBrandIcon className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Spotify</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High-End Music Player Dock with Real Audio Controls */}
        <div className={`w-full md:w-[380px] lg:w-[420px] border-l flex flex-col shrink-0 overflow-y-auto ${
          mobileTab === 'player' ? 'flex' : 'hidden md:flex'
        } ${isDark ? 'border-neutral-850 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-100/50'}`}>
          {/* Player Dock Header */}
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'border-neutral-850 bg-neutral-950/70' : 'border-neutral-200 bg-white/70'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954] border border-[#1DB954]/30">
                <Disc3 className={`w-5 h-5 ${playerState.isPlaying ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1DB954] flex items-center gap-1.5">
                  Now Playing Real Song
                  {playerState.isPlaying && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </h3>
                <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Master audio recording & live visualizer
                </p>
              </div>
            </div>

            {/* Switch Mode: Full 3-5m Song vs Fast Preview vs Spotify Embed */}
            <div className={`flex items-center rounded-xl p-0.5 border ${
              isDark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-neutral-100'
            }`}>
              <button
                type="button"
                onClick={() => setPlaybackMode('full_song')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  playbackMode === 'full_song'
                    ? 'bg-[#1DB954] text-black shadow-sm'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
                title="Play complete full-length 3+ minute song"
              >
                Full 3-5m Song
              </button>
              <button
                type="button"
                onClick={() => setPlaybackMode('real_audio')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  playbackMode === 'real_audio'
                    ? 'bg-[#1DB954] text-black shadow-sm'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
                title="Play 30s preview with live visualizer spectrum"
              >
                Preview (30s)
              </button>
              <button
                type="button"
                onClick={() => setPlaybackMode('spotify_embed')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  playbackMode === 'spotify_embed'
                    ? 'bg-[#1DB954] text-black shadow-sm'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
                title="Spotify embedded stream"
              >
                Spotify Embed
              </button>
            </div>
          </div>

          {/* Current Song Details & Controls */}
          <div className="p-4 sm:p-5 flex flex-col gap-4">
            {/* Explainer Banner: 30s raw file vs 3-min full song */}
            <div className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
              isDark ? 'border-[#1DB954]/30 bg-[#1DB954]/10 text-neutral-200' : 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
            }`}>
              <Info className="w-4 h-4 text-[#1DB954] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-bold text-xs text-[#1DB954] flex items-center gap-1.5">
                  Full 3+ Minute Song Unlocked
                </div>
                <p className={`text-[11px] leading-relaxed mt-0.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Record label copyright law limits raw MP3 files to 30s samples. In <strong>Full 3-5m Song Mode</strong> below, you can listen to the <strong>complete unedited original recording ({currentSong.duration})</strong> without cutoff!
                </p>
              </div>
            </div>
            {/* Spinning Vinyl Turntable Display */}
            <div className="relative mx-auto w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
              {/* Vinyl Disc that slides out and spins when playing */}
              <div className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-950 border-4 border-neutral-800 shadow-2xl transition-all duration-700 flex items-center justify-center ${
                (playerState.isPlaying || (playbackMode === 'full_song' && bgIsPlaying))
                  ? 'translate-x-6 rotate-180 animate-[spin_4s_linear_infinite]' 
                  : 'translate-x-0 rotate-0'
              }`}>
                {/* Vinyl Grooves */}
                <div className="w-36 h-36 rounded-full border border-neutral-800/80 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border border-neutral-700/80 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center shadow-inner">
                      <div className="w-3 h-3 rounded-full bg-black" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Album Art Cover (Front sleeve) */}
              <div className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800/80">
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                {/* Status badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1DB954] text-black flex items-center gap-1 shadow-md">
                    <SpotifyBrandIcon className="w-2.5 h-2.5 fill-black" />
                    {currentSong.categoryLabel}
                  </span>
                </div>

                {/* Duration */}
                <div className="absolute bottom-2.5 right-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-black/60 backdrop-blur-md text-white border border-white/10">
                    {currentSong.year} • {currentSong.duration}
                  </span>
                </div>
              </div>
            </div>

            {/* Song Title & PROMINENT CREATOR NAME BELOW THAT SONG */}
            <div className="text-center px-1">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white truncate leading-tight">
                {currentSong.title}
              </h2>

              {/* USER REQUIREMENT: "give the creator name belove that song" */}
              <div className="mt-1.5 flex flex-col items-center justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954] font-bold text-xs leading-none">
                  <span className="text-neutral-400 font-normal">Creator:</span>
                  <span>{currentSong.creator}</span>
                </div>
                <p className={`text-xs mt-1.5 truncate max-w-xs leading-normal ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {currentSong.album} • {currentSong.year}
                </p>
              </div>
            </div>

            {/* USER REQUIREMENT: "and add a icon which take user to that song in Spotify" */}
            <div className="flex items-center justify-center">
              <a
                href={currentSong.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#1DB954]/25 transition-all active:scale-98 leading-none"
                title={`Open "${currentSong.title}" by ${currentSong.creator} in Spotify`}
              >
                <SpotifyBrandIcon className="w-4 h-4 fill-black shrink-0" />
                <span className="leading-none">Listen on Spotify</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 shrink-0" />
              </a>
            </div>

            {/* Player View: Mode 1 - Full 3-5m Song Player (Audio in background, NO video in UI) */}
            {playbackMode === 'full_song' ? (
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'border-neutral-800 bg-neutral-950/90' : 'border-neutral-200 bg-white shadow-sm'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between text-[11px] mb-2.5">
                  <span className="text-[#1DB954] font-bold flex items-center gap-1.5">
                    <Disc3 className={`w-3.5 h-3.5 text-[#1DB954] ${bgIsPlaying ? 'animate-spin' : ''}`} />
                    Full Uncut Audio Track
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30 flex items-center gap-1 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Video Hidden • Background Audio
                  </span>
                </div>

                {/* Pure Music Player Visualizer Display */}
                <div className="rounded-xl overflow-hidden bg-neutral-900/90 border border-neutral-800 p-3 flex flex-col items-center justify-center relative shadow-inner">
                  {/* Canvas Audio Spectrum */}
                  <canvas
                    ref={canvasRef}
                    width={340}
                    height={68}
                    className="w-full h-16 rounded-lg bg-neutral-950/60"
                  />
                  <div className="mt-2 text-center">
                    <p className="text-xs font-bold text-white truncate max-w-[280px] leading-tight">
                      {currentSong.title}
                    </p>
                    <p className="text-[11px] text-[#1DB954] font-semibold truncate mt-0.5 leading-normal">
                      By {currentSong.creator} • {currentSong.album}
                    </p>
                  </div>
                </div>

                {/* Scrubber Progress Bar for Full Song */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-neutral-400 mb-1">
                    <span>{formatTime(bgCurrentTime)}</span>
                    <span className="text-[#1DB954] font-semibold">
                      {formatTime(songDurationSeconds)} full length
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={songDurationSeconds || 180}
                    step={1}
                    value={bgCurrentTime}
                    onChange={(e) => seekBg(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                  />
                </div>

                {/* Full Song Nav & Playback Controls */}
                <div className="mt-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => spotifyPlayerService.toggleShuffle()}
                    className={`p-2 rounded-lg transition-colors ${
                      playerState.isShuffled ? 'text-[#1DB954] bg-[#1DB954]/15' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Shuffle tracks"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevTrack}
                      className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Previous song"
                    >
                      <SkipBack className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={toggleBgPlayPause}
                      className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg shadow-[#1DB954]/30 transition-transform active:scale-95"
                      title={bgIsPlaying ? 'Pause' : 'Play Full Song'}
                    >
                      {bgIsPlaying ? (
                        <Pause className="w-5 h-5 fill-black" />
                      ) : (
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleNextTrack}
                      className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Next song"
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => spotifyPlayerService.toggleRepeat()}
                    className={`p-2 rounded-lg transition-colors ${
                      playerState.isRepeating ? 'text-[#1DB954] bg-[#1DB954]/15' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Repeat track"
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </div>

                {/* Volume Slider & Mute Toggle */}
                <div className="mt-3.5 pt-3 border-t border-neutral-800/60 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={toggleBgMute}
                    className="text-neutral-400 hover:text-white transition-colors"
                    title={bgIsMuted ? 'Unmute' : 'Mute'}
                  >
                    {bgIsMuted || bgVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-[#1DB954]" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={bgIsMuted ? 0 : bgVolume}
                    onChange={(e) => setBgVol(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                  />
                  <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                    {Math.round((bgIsMuted ? 0 : bgVolume) * 100)}%
                  </span>
                </div>
              </div>
            ) : playbackMode === 'real_audio' ? (
              /* Mode 2 - 30s Fast Master Preview with Live Waveform Canvas Spectrum */
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'border-neutral-800 bg-neutral-950/90' : 'border-neutral-200 bg-white shadow-sm'
              }`}>
                {/* Visualizer Spectrum Header */}
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-[#1DB954] font-bold flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5" />
                    30s Master Equalizer Spectrum
                  </span>
                  <span className="text-neutral-400 font-mono text-[10px]">
                    {currentSong.genre} • {currentSong.bpm} BPM
                  </span>
                </div>

                {/* Canvas Audio Spectrum */}
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={68}
                  className="w-full h-16 rounded-xl bg-neutral-900/95 border border-neutral-800/80"
                />

                {/* Scrubber Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-neutral-400 mb-1">
                    <span>{formatTime(playerState.currentTime)}</span>
                    <span className="text-emerald-400 font-semibold">
                      {playerState.isLoading ? 'Loading master...' : formatTime(playerState.duration)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={playerState.duration || 30}
                    step={0.1}
                    value={playerState.currentTime}
                    onChange={(e) => spotifyPlayerService.seek(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                  />
                </div>

                {/* Playback Controls */}
                <div className="mt-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => spotifyPlayerService.toggleShuffle()}
                    className={`p-2 rounded-lg transition-colors ${
                      playerState.isShuffled ? 'text-[#1DB954] bg-[#1DB954]/15' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Shuffle tracks"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevTrack}
                      className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Previous song"
                    >
                      <SkipBack className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => spotifyPlayerService.togglePlayPause(currentSong)}
                      className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg shadow-[#1DB954]/30 transition-transform active:scale-95"
                      title={playerState.isPlaying ? 'Pause' : 'Play Real Song'}
                    >
                      {playerState.isPlaying ? (
                        <Pause className="w-5 h-5 fill-black" />
                      ) : (
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleNextTrack}
                      className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Next song"
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => spotifyPlayerService.toggleRepeat()}
                    className={`p-2 rounded-lg transition-colors ${
                      playerState.isRepeating ? 'text-[#1DB954] bg-[#1DB954]/15' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Repeat track"
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </div>

                {/* Volume Slider & Mute Toggle */}
                <div className="mt-3.5 pt-3 border-t border-neutral-800/60 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => spotifyPlayerService.toggleMute()}
                    className="text-neutral-400 hover:text-white transition-colors"
                    title={playerState.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {playerState.isMuted || playerState.volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-[#1DB954]" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={playerState.isMuted ? 0 : playerState.volume}
                    onChange={(e) => spotifyPlayerService.setVolume(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                  />
                  <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                    {Math.round((playerState.isMuted ? 0 : playerState.volume) * 100)}%
                  </span>
                </div>
              </div>
            ) : (
              /* Mode 3: Official Spotify Player Embed */
              <div className="rounded-2xl border border-neutral-800/80 overflow-hidden bg-black/40 shadow-inner p-1">
                <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800/40 mb-1">
                  <span className="flex items-center gap-1.5 text-[#1DB954] font-bold">
                    <SpotifyBrandIcon className="w-3.5 h-3.5" />
                    Official Spotify Embedded Player
                  </span>
                  <span>Direct Stream</span>
                </div>
                <iframe
                  title={`Spotify Player: ${currentSong.title}`}
                  src={currentSong.embedUrl}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                />
              </div>
            )}

            {/* Song Meta Information */}
            <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              isDark ? 'border-neutral-800/80 bg-neutral-950/50 text-neutral-300' : 'border-neutral-200 bg-white text-neutral-700'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
                <span className="flex items-center gap-1 text-[#1DB954]">
                  <Info className="w-3.5 h-3.5" />
                  Song Information
                </span>
                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                  {currentSong.mood}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-400">
                {currentSong.description}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentSong.tags?.map((tag) => (
                  <span
                    key={tag}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                      isDark ? 'bg-neutral-800/80 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Background YouTube Audio Streamer - Plays audio in background with NO video shown in UI */}
      <div
        className="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden select-none"
        aria-hidden="true"
        tabIndex={-1}
      >
        <iframe
          ref={bgIframeRef}
          id="hidden-bg-yt-audio-player"
          title="Background Audio Stream"
          src={bgStreamUrl}
          width="100"
          height="100"
          allow="autoplay; encrypted-media"
        />
      </div>
    </div>
  );
};
