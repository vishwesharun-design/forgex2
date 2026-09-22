import React, { useState } from 'react';
import {
  Play,
  Pause,
  Download,
  Trash2,
  Heart,
  Sparkles,
  Music,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  FileText,
  Check,
  Copy,
  Disc3,
  Layers,
  ListMusic,
  Sliders,
} from 'lucide-react';
import { GeneratedSong } from '../types';
import { parseLyricsSections, getGenreChordInfo, LyricsSection } from '../services/musicService';

interface AudioTrackPlayerProps {
  song: GeneratedSong;
  isPlaying: boolean;
  playbackTime: number;
  playbackDuration: number;
  isDark: boolean;
  onPlayToggle: (song: GeneratedSong) => void;
  onSeek?: (song: GeneratedSong, timeSeconds: number) => void;
  onDownload: (song: GeneratedSong) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onVolumeChange?: (vol: number) => void;
}

export const AudioTrackPlayer: React.FC<AudioTrackPlayerProps> = ({
  song,
  isPlaying,
  playbackTime,
  playbackDuration,
  isDark,
  onPlayToggle,
  onSeek,
  onDownload,
  onToggleFavorite,
  onDelete,
  onVolumeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'lyrics' | 'structure' | 'chords'>('lyrics');
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const duration = playbackDuration || song.durationSeconds || 30;
  const sections: LyricsSection[] = React.useMemo(() => {
    return parseLyricsSections(song.lyrics, duration);
  }, [song.lyrics, duration]);

  const chordData = React.useMemo(() => {
    return getGenreChordInfo(song.genre);
  }, [song.genre]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopySection = (section: LyricsSection) => {
    const text = `[${section.tag}]\n` + section.lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSectionId(section.id);
    setTimeout(() => setCopiedSectionId(null), 2000);
  };

  const handleCopyAllLyrics = () => {
    const fullText = song.lyrics || sections.map((s) => `[${s.tag}]\n` + s.lines.join('\n')).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (onSeek) {
      onSeek(song, newTime);
    }
  };

  const handleSkip = (offsetSeconds: number) => {
    const target = Math.max(0, Math.min(duration, playbackTime + offsetSeconds));
    if (onSeek) {
      onSeek(song, target);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (onVolumeChange) onVolumeChange(volume);
    } else {
      setIsMuted(true);
      if (onVolumeChange) onVolumeChange(0);
    }
  };

  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (onVolumeChange) {
      onVolumeChange(val);
    }
  };

  // Determine section tag styling
  const getSectionBadgeStyle = (type: LyricsSection['type'], isActive: boolean) => {
    if (isActive) {
      return 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md shadow-amber-500/30';
    }
    switch (type) {
      case 'chorus':
        return isDark
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
          : 'bg-amber-50 text-amber-700 border-amber-300';
      case 'intro':
        return isDark
          ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
          : 'bg-sky-50 text-sky-700 border-sky-300';
      case 'outro':
        return isDark
          ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
          : 'bg-purple-50 text-purple-700 border-purple-300';
      case 'bridge':
        return isDark
          ? 'bg-pink-500/15 text-pink-300 border-pink-500/40'
          : 'bg-pink-50 text-pink-700 border-pink-300';
      case 'verse':
      default:
        return isDark
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
          : 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
  };

  const progressPercent = Math.min(100, (playbackTime / duration) * 100);

  return (
    <div
      id={`audio-player-${song.id}`}
      className={`rounded-3xl border transition-all duration-300 shadow-2xl overflow-hidden ${
        isPlaying
          ? 'border-amber-500/70 ring-1 ring-amber-500/30 shadow-amber-500/10'
          : isDark
          ? 'bg-neutral-900/90 border-neutral-800'
          : 'bg-white border-neutral-200'
      } ${isDark ? 'bg-neutral-900/90' : 'bg-white'}`}
    >
      {/* Top Banner Header with Track Attributes */}
      <div
        className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-neutral-950/60 border-neutral-800/80' : 'bg-neutral-50 border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-semibold">
            <Music className="w-3.5 h-3.5" />
            <span>AI Studio Master</span>
          </div>

          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700">
            {song.genre}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800/80 text-neutral-300">
            {song.mood}
          </span>
          <span className="text-xs font-mono text-neutral-400">
            {song.tempoBpm} BPM
          </span>
          <span className="text-xs font-mono text-neutral-400">
            • {chordData.key}
          </span>
          <span className="text-xs font-mono text-neutral-500">
            • {duration}s
          </span>
        </div>

        {/* Quick actions top right */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(song.id)}
            title={song.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`p-2 rounded-xl transition-colors ${
              song.isFavorite
                ? 'text-red-500 bg-red-500/10'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Heart className={`w-4 h-4 ${song.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => onDownload(song)}
            title="Export High-Res WAV Master"
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export WAV</span>
          </button>
          <button
            onClick={() => onDelete(song.id)}
            title="Delete Track"
            className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Audio Layout: LEFT = Lyrics & Sections, RIGHT = Synth Stage & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800/70">
        
        {/* ========================================================= */}
        {/* LEFT SIDE: Song Sections & Lyrics Breakdown               */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 flex flex-col p-5 sm:p-6 bg-gradient-to-b from-transparent to-neutral-950/20">
          {/* Section Panel Header & Tab Switcher */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h4 className="font-display font-bold text-sm sm:text-base tracking-wide">
                Song Sections & Lyrics
              </h4>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                {sections.length} parts
              </span>
            </div>

            <button
              onClick={handleCopyAllLyrics}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                copiedAll
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                  : 'border-neutral-700/80 bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700/60'
              }`}
            >
              {copiedAll ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied All</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-neutral-400" />
                  <span>Copy Full Text</span>
                </>
              )}
            </button>
          </div>

          {/* Section View Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950/60 border border-neutral-800 mb-4">
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'lyrics'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Lyrics by Section</span>
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'structure'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Arrangement</span>
            </button>
            <button
              onClick={() => setActiveTab('chords')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'chords'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Chords & Stems</span>
            </button>
          </div>

          {/* TAB CONTENT 1: Structured Lyrics by Section */}
          {activeTab === 'lyrics' && (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar flex-1">
              {sections.map((section, idx) => {
                const isSectionActive =
                  isPlaying &&
                  playbackTime >= section.startTimeSec &&
                  playbackTime < section.endTimeSec;

                return (
                  <div
                    key={section.id || idx}
                    onClick={() => onSeek && onSeek(song, section.startTimeSec)}
                    className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSectionActive
                        ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                        : isDark
                        ? 'bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700'
                        : 'bg-neutral-50/70 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {/* Section Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border transition-all ${getSectionBadgeStyle(
                            section.type,
                            isSectionActive
                          )}`}
                        >
                          [{section.tag}]
                        </span>

                        <span className="text-[10px] font-mono text-neutral-500">
                          {formatTime(section.startTimeSec)} – {formatTime(section.endTimeSec)}
                        </span>

                        {isSectionActive && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Live Scene
                          </span>
                        )}
                      </div>

                      {/* Copy section */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySection(section);
                        }}
                        title="Copy this section"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-opacity"
                      >
                        {copiedSectionId === section.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Section Lyrics Lines */}
                    <div className="space-y-1 font-sans text-xs sm:text-sm leading-relaxed">
                      {section.lines.map((line, lIdx) => (
                        <p
                          key={lIdx}
                          className={`transition-colors ${
                            isSectionActive
                              ? 'text-amber-200 font-medium'
                              : isDark
                              ? 'text-neutral-300'
                              : 'text-neutral-700'
                          }`}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB CONTENT 2: Musical Arrangement Timeline */}
          {activeTab === 'structure' && (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 flex-1">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Arrangement Timeline ({duration}s)
                  </span>
                  <span className="font-mono text-[10px] text-amber-400">
                    Cursor: {formatTime(playbackTime)}
                  </span>
                </div>

                {/* Timeline visual bar */}
                <div className="relative h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex overflow-hidden">
                  {sections.map((sec, idx) => {
                    const isSecActive =
                      isPlaying &&
                      playbackTime >= sec.startTimeSec &&
                      playbackTime < sec.endTimeSec;

                    return (
                      <div
                        key={idx}
                        onClick={() => onSeek && onSeek(song, sec.startTimeSec)}
                        style={{ width: `${100 / sections.length}%` }}
                        className={`h-full border-r border-neutral-800 flex flex-col items-center justify-center text-[10px] font-mono cursor-pointer transition-colors ${
                          isSecActive
                            ? 'bg-amber-500/25 text-amber-300 font-bold'
                            : 'hover:bg-neutral-800/40 text-neutral-400'
                        }`}
                      >
                        <span className="truncate px-1">{sec.tag}</span>
                        <span className="text-[8px] text-neutral-500">{sec.lines.length} lines</span>
                      </div>
                    );
                  })}

                  {/* Playhead indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-md shadow-amber-500/50 pointer-events-none transition-all duration-100"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Arrangement breakdown list */}
              <div className="space-y-2">
                {sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                      isDark ? 'bg-neutral-950/20 border-neutral-800/70' : 'bg-neutral-50/50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center font-mono text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold">{sec.title}</span>
                        <p className="text-[10px] text-neutral-500">
                          {sec.lines.length} lyrical phrases • 4/4 timing
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-amber-400">
                      {formatTime(sec.startTimeSec)} – {formatTime(sec.endTimeSec)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: Chords & Stems Engine */}
          {activeTab === 'chords' && (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 flex-1">
              {/* Harmonic Progression Card */}
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Harmonic Progression
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">{chordData.key}</span>
                </div>
                <div className="font-mono text-sm font-bold text-amber-300 mb-2">
                  {chordData.chordsText}
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {chordData.description}
                </p>
              </div>

              {/* Stems Synthesis Matrix */}
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <span className="block font-semibold uppercase tracking-wider text-[10px] text-neutral-400 mb-3">
                  Synthesized Sound Stems
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {chordData.instrumentStems.map((stem, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
                        }`}
                      />
                      <span className="font-medium truncate text-neutral-200">{stem}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT SIDE: Audio Player, Vinyl Stage & Master Controls   */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 flex flex-col justify-between p-5 sm:p-6 space-y-5">
          {/* Top Section: Title & Prompt info */}
          <div>
            <h3 className="font-display font-extrabold text-lg sm:text-xl line-clamp-1">
              {song.title}
            </h3>
            <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              "{song.prompt}"
            </p>
          </div>

          {/* Visual Vinyl Record + Visualizer Display Stage */}
          <div className="relative flex items-center justify-center py-2">
            <div className="relative flex items-center">
              {/* Spinning Vinyl Record behind the cover */}
              <div
                className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-neutral-950 border-4 border-neutral-800 shadow-2xl flex items-center justify-center transition-all duration-700 ${
                  isPlaying ? 'rotate-180 translate-x-8 sm:translate-x-12 scale-100' : 'translate-x-0 scale-95 opacity-60'
                }`}
                style={{
                  backgroundImage:
                    'repeating-radial-gradient(circle, #171717 0, #171717 2px, #0a0a0a 3px, #0a0a0a 5px)',
                }}
              >
                {/* Vinyl Center label */}
                <div className="w-12 h-12 rounded-full bg-amber-500 border-2 border-amber-300 flex items-center justify-center shadow-inner">
                  <div className="w-3 h-3 rounded-full bg-neutral-950" />
                </div>
              </div>

              {/* Cover Art Card */}
              <div className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black shrink-0">
                <img
                  src={song.coverUrl}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />

                {/* Center play icon toggle overlay */}
                <button
                  onClick={() => onPlayToggle(song)}
                  className="absolute inset-0 bg-black/30 hover:bg-black/10 flex items-center justify-center transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shadow-xl shadow-amber-500/50 group-hover:scale-110 active:scale-95 transition-transform">
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Audio Visualizer Equalizer Bars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-amber-400">
              <span className="font-semibold">{formatTime(playbackTime)}</span>

              {/* 16-bar animated audio frequency spectrum */}
              <div className="flex items-end gap-1 h-5 px-3">
                {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65, 90, 45, 70, 85].map((height, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-gradient-to-t from-amber-500 to-amber-300 transition-all ${
                      isPlaying ? 'animate-pulse' : 'opacity-40'
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(15, (height * (Math.sin(playbackTime * 4 + i) + 1.2)) / 2.2)}%` : '20%',
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                ))}
              </div>

              <span className="text-neutral-400">{formatTime(duration)}</span>
            </div>

            {/* Seekable Audio Progress Scrubber */}
            <div className="relative flex items-center group">
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={playbackTime}
                onChange={handleScrubberChange}
                className="w-full h-2 rounded-full bg-neutral-800 appearance-none cursor-pointer accent-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Full Master Transport & Volume Controls */}
          <div className="flex items-center justify-between gap-4 pt-1">
            {/* Rewind 5s */}
            <button
              onClick={() => handleSkip(-5)}
              title="Skip back 5 seconds"
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Central Play/Pause Button */}
            <button
              onClick={() => onPlayToggle(song)}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-neutral-950 font-bold flex items-center gap-2 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Track</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Play Master</span>
                </>
              )}
            </button>

            {/* Forward 5s */}
            <button
              onClick={() => handleSkip(5)}
              title="Skip forward 5 seconds"
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              <button
                onClick={handleToggleMute}
                className="text-neutral-400 hover:text-neutral-200 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeSlider}
                className="w-16 h-1.5 rounded-full bg-neutral-800 appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
