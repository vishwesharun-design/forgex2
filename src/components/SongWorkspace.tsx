import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Play, 
  Pause, 
  Download, 
  Heart, 
  Trash2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Disc3, 
  FileText, 
  Sliders, 
  RotateCcw,
  Radio,
  Share2,
  Check,
  Zap,
  Waves,
  Coffee,
  Film,
  Flame,
  Leaf,
  Compass,
  Mic
} from 'lucide-react';
import { 
  GeneratedSong, 
  SongGenre, 
  SongMood, 
  ForgeXModelId, 
  ForgeXTheme, 
  FORGEX_MODELS 
} from '../types';
import { musicService, parseLyricsSections } from '../services/musicService';
import { ModelSelector } from './ModelSelector';
import { AudioTrackPlayer } from './AudioTrackPlayer';

interface SongWorkspaceProps {
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
}

const GENRES: { id: SongGenre; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: 'Synthwave', label: 'Synthwave', icon: Waves, desc: '80s analog bass, arpeggios & retro neon vibes' },
  { id: 'Lo-Fi', label: 'Lo-Fi Beats', icon: Coffee, desc: 'Warm jazz chords, vinyl dust & relaxed swing' },
  { id: 'Cinematic', label: 'Cinematic', icon: Film, desc: 'Epic orchestral strings, brass & dramatic sub hits' },
  { id: 'EDM', label: 'EDM / Dance', icon: Zap, desc: 'Pumping four-on-the-floor kicks & high-energy drops' },
  { id: 'Rock', label: 'Rock', icon: Flame, desc: 'Overdriven guitars, heavy bass & driving drum beat' },
  { id: 'Acoustic', label: 'Acoustic', icon: Leaf, desc: 'Fingerpicked nylon guitars & warm intimate groove' },
  { id: 'Ambient', label: 'Ambient', icon: Compass, desc: 'Ethereal drifting soundscapes & cosmic frequencies' },
  { id: 'Hip-Hop', label: 'Hip-Hop', icon: Mic, desc: '808 sub bass, crisp trap beats & melodic hooks' },
];

const MOODS: SongMood[] = ['Energetic', 'Chill', 'Dark', 'Dreamy', 'Uplifting', 'Melancholic'];
const TEMPOS = [
  { label: 'Slow (80 BPM)', val: 80 },
  { label: 'Moderate (110 BPM)', val: 110 },
  { label: 'Fast (130 BPM)', val: 130 },
  { label: 'High-Energy (145 BPM)', val: 145 },
];
const DURATIONS = [
  { label: '15s Hook', val: 15 },
  { label: '30s Track', val: 30 },
  { label: '45s Extended', val: 45 },
];

export const SongWorkspace: React.FC<SongWorkspaceProps> = ({
  theme,
  selectedModelId,
  onSelectModel,
}) => {
  const isDark = theme === 'dark';
  const [songs, setSongs] = useState<GeneratedSong[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<SongGenre>('Synthwave');
  const [selectedMood, setSelectedMood] = useState<SongMood>('Energetic');
  const [selectedTempo, setSelectedTempo] = useState<number>(110);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [includeLyrics, setIncludeLyrics] = useState(true);
  const [customLyrics, setCustomLyrics] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  // Active Playback State
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(30);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeLyricsTab, setActiveLyricsTab] = useState(false);

  useEffect(() => {
    const loaded = musicService.getSongs();
    setSongs(loaded);
    if (loaded.length > 0 && !selectedSongId) {
      setSelectedSongId(loaded[0].id);
    }
    return () => {
      musicService.stopPlayback();
    };
  }, []);

  const handleGenerateSong = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim() || 'Midnight Cyberpunk Odyssey with driving synth leads and neon bass';

    setIsGenerating(true);
    setGenerationStep('Composing musical scales and harmonic structure...');
    await new Promise((r) => setTimeout(r, 600));

    setGenerationStep(`Arranging ${selectedGenre} instrumentation and beat groove...`);
    await new Promise((r) => setTimeout(r, 700));

    if (includeLyrics) {
      setGenerationStep('Synthesizing dynamic lyric vocal score...');
      await new Promise((r) => setTimeout(r, 600));
    }

    setGenerationStep('Mastering audio spectrum and rendering cover artwork...');
    await new Promise((r) => setTimeout(r, 800));

    try {
      const newSong = await musicService.generateSong({
        prompt: cleanPrompt,
        genre: selectedGenre,
        mood: selectedMood,
        tempoBpm: selectedTempo,
        durationSeconds: selectedDuration,
        modelId: selectedModelId,
        includeLyrics,
        customLyrics: customLyrics.trim() || undefined,
      });

      const updated = musicService.getSongs();
      setSongs(updated);
      setSelectedSongId(newSong.id);
      // Auto-play newly created song!
      handlePlaySong(newSong);
    } catch (err) {
      console.error('Song generation failed', err);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handlePlaySong = (song: GeneratedSong) => {
    setSelectedSongId(song.id);
    if (activeSongId === song.id) {
      // Toggle pause/stop
      musicService.stopPlayback();
      setActiveSongId(null);
      return;
    }

    setActiveSongId(song.id);
    setPlaybackTime(0);
    setPlaybackDuration(song.durationSeconds || 30);

    musicService.playSong(
      song,
      (current, total) => {
        setPlaybackTime(current);
        setPlaybackDuration(total);
      },
      () => {
        setActiveSongId(null);
        setPlaybackTime(0);
      }
    );
  };

  const handleSeekSong = (song: GeneratedSong, timeSeconds: number) => {
    setPlaybackTime(timeSeconds);
    setSelectedSongId(song.id);
    if (activeSongId === song.id) {
      musicService.playSong(
        song,
        (current, total) => {
          setPlaybackTime(current);
          setPlaybackDuration(total);
        },
        () => {
          setActiveSongId(null);
          setPlaybackTime(0);
        },
        timeSeconds
      );
    }
  };

  const handleVolumeChange = (vol: number) => {
    musicService.setVolume(vol);
  };

  const handleDownloadSong = async (song: GeneratedSong) => {
    try {
      const url = await musicService.exportSongWav(song);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.title.replace(/\s+/g, '_')}_ForgeX.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Export wav failed', e);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updated = musicService.toggleFavorite(id);
    setSongs(updated);
  };

  const handleDeleteSong = (id: string) => {
    if (activeSongId === id) {
      musicService.stopPlayback();
      setActiveSongId(null);
    }
    const updated = musicService.deleteSong(id);
    setSongs(updated);
  };

  const handleCopyLyrics = (song: GeneratedSong) => {
    if (song.lyrics) {
      navigator.clipboard.writeText(song.lyrics);
      setCopiedId(song.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8 pb-32">
        {/* Studio Header & Generator Card */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-colors ${
            isDark
              ? 'bg-neutral-900/90 border-neutral-800 shadow-black/40'
              : 'bg-white border-neutral-200 shadow-neutral-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight">AI Song Studio</h2>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Compose full procedural tracks, synthesizers, harmonic chords, and vocal lyrics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Engine:</span>
                <ModelSelector
                  selectedModelId={selectedModelId}
                  onSelectModel={onSelectModel}
                  theme={theme}
                />
              </div>

              {/* Quick Top Generate Button */}
              <button
                id="quick-generate-song-btn"
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerateSong()}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-neutral-950 transition-all ${
                  isGenerating
                    ? 'bg-amber-500/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 active:scale-95 shadow-md shadow-amber-500/25'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Synthesize Song</span>
                  </>
                )}
              </button>
            </div>
          </div>

        {/* Input Prompt */}
        <form onSubmit={handleGenerateSong} className="space-y-6">
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              Song Description or Theme
            </label>
            <div className="relative">
              <textarea
                id="song-prompt-textarea"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your track (e.g. 'Chill lo-fi study beats with warm vinyl crackle and gentle acoustic guitar melody' or 'Epic 80s synthwave night drive')..."
                className={`w-full p-4 rounded-2xl border text-sm leading-relaxed outline-none transition-all resize-none ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 focus:border-amber-500 text-white placeholder:text-neutral-500'
                    : 'bg-neutral-50 border-neutral-200 focus:border-amber-500 text-neutral-900 placeholder:text-neutral-400'
                }`}
              />
            </div>
          </div>

          {/* Genre Selection Grid */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              Select Music Genre
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {GENRES.map((g) => {
                const isSelected = selectedGenre === g.id;
                const GenreIcon = g.icon;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGenre(g.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 shadow-sm'
                        : isDark
                        ? 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2">
                      <GenreIcon className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold leading-tight">{g.label}</div>
                    <div className={`text-[10px] line-clamp-1 mt-0.5 leading-normal ${isSelected ? 'text-amber-400/80' : 'text-neutral-500'}`}>
                      {g.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood & Tempo & Duration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Mood */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Mood
              </label>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value as SongMood)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              >
                {MOODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Tempo */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Tempo (BPM)
              </label>
              <select
                value={selectedTempo}
                onChange={(e) => setSelectedTempo(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              >
                {TEMPOS.map((t) => (
                  <option key={t.val} value={t.val}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Duration
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              >
                {DURATIONS.map((d) => (
                  <option key={d.val} value={d.val}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lyrics toggle & optional editor */}
          <div className="pt-2 border-t border-neutral-800/60">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLyrics}
                  onChange={(e) => setIncludeLyrics(e.target.checked)}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500 bg-neutral-900"
                />
                <span className={`text-xs font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Generate AI Song Lyrics & Vocal Verses
                </span>
              </label>

              {includeLyrics && (
                <button
                  type="button"
                  onClick={() => setActiveLyricsTab(!activeLyricsTab)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  {activeLyricsTab ? 'Hide Custom Lyrics' : 'Write Custom Lyrics'}
                </button>
              )}
            </div>

            {includeLyrics && activeLyricsTab && (
              <textarea
                rows={4}
                value={customLyrics}
                onChange={(e) => setCustomLyrics(e.target.value)}
                placeholder="[Verse 1]&#10;Write your custom lyrics here...&#10;&#10;[Chorus]&#10;Add your chorus..."
                className={`w-full mt-3 p-3 rounded-xl border text-xs font-mono outline-none ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-200'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                }`}
              />
            )}
          </div>

          {/* Action Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-neutral-950 transition-all ${
                isGenerating
                  ? 'bg-amber-500/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/25'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
                  <span>{generationStep || 'Composing Song...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Synthesize AI Song</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Songs Library */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <h3 className="font-display font-bold text-lg">Your AI Track Library ({songs.length})</h3>
          </div>
          {songs.length > 0 && (
            <span className="text-xs text-neutral-400 font-mono hidden sm:inline-block">
              Selected: <strong className="text-amber-400">{(songs.find(s => s.id === (selectedSongId || activeSongId)) || songs[0])?.title}</strong>
            </span>
          )}
        </div>

        {songs.length === 0 ? (
          <div
            className={`p-12 text-center rounded-3xl border ${
              isDark ? 'bg-neutral-900/40 border-neutral-800/80 text-neutral-400' : 'bg-neutral-50 border-neutral-200 text-neutral-600'
            }`}
          >
            <Disc3 className="w-12 h-12 mx-auto mb-3 text-neutral-600 animate-spin-slow" />
            <p className="font-medium text-sm">No songs generated yet</p>
            <p className="text-xs text-neutral-500 mt-1">
              Select a genre, enter a description, and press "Synthesize AI Song" to compose your first musical track!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* MASTER AUDIO GENERATED UI: DUAL-PANEL WITH SECTIONS FOR LYRICS ON THE LEFT SIDE */}
            {(() => {
              const featuredSong = songs.find((s) => s.id === (selectedSongId || activeSongId)) || songs[0];
              if (!featuredSong) return null;

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      <span>Studio Audio Master & Lyrics Sections</span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400">
                      Dual-Panel Acoustic Workspace
                    </span>
                  </div>

                  <AudioTrackPlayer
                    song={featuredSong}
                    isPlaying={activeSongId === featuredSong.id}
                    playbackTime={activeSongId === featuredSong.id ? playbackTime : 0}
                    playbackDuration={activeSongId === featuredSong.id ? playbackDuration : featuredSong.durationSeconds}
                    isDark={isDark}
                    onPlayToggle={handlePlaySong}
                    onSeek={handleSeekSong}
                    onDownload={handleDownloadSong}
                    onToggleFavorite={handleToggleFavorite}
                    onDelete={handleDeleteSong}
                    onVolumeChange={handleVolumeChange}
                  />
                </div>
              );
            })()}

            {/* TRACK GALLERY LIST WITH LYRICS SECTIONS PREVIEWS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
                All Tracks in Library ({songs.length})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {songs.map((song) => {
                  const isPlaying = activeSongId === song.id;
                  const isSelected = (selectedSongId || activeSongId) === song.id;
                  const cardSections = parseLyricsSections(song.lyrics, song.durationSeconds);

                  return (
                    <div
                      key={song.id}
                      onClick={() => setSelectedSongId(song.id)}
                      className={`relative p-5 rounded-3xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500/70 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                          : isDark
                          ? 'bg-neutral-900/80 border-neutral-800/90 hover:border-neutral-700'
                          : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Vinyl / Cover Art */}
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 shadow-md bg-black">
                          <img
                            src={song.coverUrl}
                            alt={song.title}
                            className={`w-full h-full object-cover transition-transform duration-700 ${
                              isPlaying ? 'scale-105' : 'group-hover:scale-105'
                            }`}
                          />

                          {/* Play overlay */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySong(song);
                            }}
                            title={isPlaying ? 'Pause' : 'Play'}
                            className={`absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 text-white transition-opacity ${
                              isPlaying ? 'opacity-100' : 'hover:opacity-100 opacity-90'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shadow-lg shadow-amber-500/40">
                              {isPlaying ? (
                                <Pause className="w-5 h-5 fill-current" />
                              ) : (
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Metadata & Controls */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm sm:text-base line-clamp-1">{song.title}</h4>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  {song.genre}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'}`}>
                                  {song.mood}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-500">
                                  {song.tempoBpm} BPM
                                </span>
                                <span className="text-[10px] font-mono text-neutral-500">
                                  • {song.durationSeconds}s
                                </span>
                              </div>
                            </div>

                            {/* Top corner actions */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(song.id);
                                }}
                                title="Favorite"
                                className={`p-1.5 rounded-xl transition-colors ${
                                  song.isFavorite ? 'text-red-500' : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${song.isFavorite ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSong(song.id);
                                }}
                                title="Delete"
                                className="p-1.5 rounded-xl text-neutral-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Prompt description */}
                          <p className={`text-xs line-clamp-1 mt-1.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                            {song.prompt}
                          </p>

                          {/* Audio Progress / Visualizer when playing */}
                          {isPlaying && (
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                                <span>{formatSeconds(playbackTime)}</span>
                                <div className="flex items-end gap-1 h-3">
                                  <span className="w-1 bg-amber-400 rounded-full animate-bounce h-2" />
                                  <span className="w-1 bg-amber-400 rounded-full animate-bounce h-3 delay-75" />
                                  <span className="w-1 bg-amber-400 rounded-full animate-bounce h-1.5 delay-150" />
                                  <span className="w-1 bg-amber-400 rounded-full animate-bounce h-2.5 delay-100" />
                                </div>
                                <span>{formatSeconds(playbackDuration)}</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full transition-all duration-100"
                                  style={{ width: `${Math.min(100, (playbackTime / playbackDuration) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Card Footer Actions */}
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-neutral-800/40">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadSong(song);
                                }}
                                title="Export WAV Audio File"
                                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl font-medium transition-colors ${
                                  isDark
                                    ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200'
                                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                                }`}
                              >
                                <Download className="w-3 h-3 text-amber-400" />
                                <span>Export WAV</span>
                              </button>

                              {song.lyrics && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyLyrics(song);
                                  }}
                                  title="Copy Lyrics"
                                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl font-medium transition-colors ${
                                    isDark
                                      ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200'
                                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                                  }`}
                                >
                                  {copiedId === song.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="w-3 h-3 text-neutral-400" />
                                      <span>Lyrics</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            <span className="text-[10px] text-neutral-500 font-mono">
                              {new Date(song.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Song Sections preview at bottom of card */}
                      <div className="mt-3 pt-2 border-t border-neutral-800/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-neutral-500 font-mono">Sections:</span>
                          {cardSections.map((sec, sIdx) => (
                            <span
                              key={sIdx}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                                isDark ? 'bg-neutral-800/90 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              [{sec.tag}]
                            </span>
                          ))}
                        </div>

                        <span className="text-[10px] text-amber-400 font-medium hover:underline">
                          {isSelected ? 'Loaded in Master' : 'Inspect in Master →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
