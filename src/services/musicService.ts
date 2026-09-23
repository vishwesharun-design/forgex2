import { GeneratedSong, SongGenre, SongMood, SongVoiceProfile, SongVocalStyle, ForgeXModelId } from '../types';
import { authService } from './authService';
import { firestoreStorageService } from './firestoreStorageService';
import { storageService } from './storageService';

function getSongStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_generated_songs_${partition}`;
}

interface AudioPlaybackHandle {
  audioElement?: HTMLAudioElement;
  audioContext?: AudioContext;
  gainNode?: GainNode;
  beatGainNode?: GainNode;
  vocalGainNode?: GainNode;
  stop: () => void;
  setVolume: (vol: number) => void;
  setVocalVolume?: (vol: number) => void;
  setBeatVolume?: (vol: number) => void;
}

let activePlayback: AudioPlaybackHandle | null = null;
let currentVocalVolume = 0.85;
let currentBeatVolume = 0.85;

// Preset seeds and sample covers
const COVER_IMAGES: Record<SongGenre, string> = {
  Synthwave: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop',
  'Lo-Fi': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
  Cinematic: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
  EDM: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
  Rock: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=800&auto=format&fit=crop',
  Acoustic: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=800&auto=format&fit=crop',
  Ambient: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
  'Hip-Hop': 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop',
  Classical: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?q=80&w=800&auto=format&fit=crop',
};

export interface LyricsSection {
  id: string;
  tag: string;
  title: string;
  lines: string[];
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
  startTimeSec: number;
  endTimeSec: number;
}

export interface GenreChordData {
  progression: string[];
  chordsText: string;
  key: string;
  scale: string;
  instrumentStems: string[];
  description: string;
}

export function getGenreChordInfo(genre: SongGenre): GenreChordData {
  switch (genre) {
    case 'Synthwave':
      return {
        progression: ['Am', 'F', 'C', 'G'],
        chordsText: 'Am → F → C → G (i – VI – III – VII)',
        key: 'A Minor',
        scale: 'Aeolian',
        instrumentStems: ['Analog Lead Sawtooth', 'Sub-Bass Arp', 'Gated Reverb Drums', 'Tape Saturation'],
        description: 'Retro-futuristic 80s neon nostalgia with driving synthesizer arpeggios.',
      };
    case 'Lo-Fi':
      return {
        progression: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'],
        chordsText: 'Cmaj7 → Am7 → Fmaj7 → G7 (Imaj7 – vi7 – IVmaj7 – V7)',
        key: 'C Major',
        scale: 'Ionian Jazz',
        instrumentStems: ['Vinyl Crackle', 'Mellow Electric Piano', 'Acoustic Kick/Snare', 'Warm Lowpass Filter'],
        description: 'Warm relaxing study aesthetic with gentle jazz chord extensions.',
      };
    case 'Cinematic':
      return {
        progression: ['Am', 'C', 'Dm', 'F'],
        chordsText: 'Am → C → Dm → F (i – III – iv – VI)',
        key: 'A Minor',
        scale: 'Doric/Aeolian',
        instrumentStems: ['Sub Harmonic Drone', 'Deep Celli & Strings', 'Volumetric Reverb', 'Dynamic Timpani'],
        description: 'Epic sweeping orchestral soundscape with atmospheric spatial presence.',
      };
    case 'EDM':
      return {
        progression: ['A', 'F', 'C', 'G'],
        chordsText: 'A → F → C → G (I – bVI – bIII – bVII)',
        key: 'A Minor',
        scale: 'Aeolian Peak',
        instrumentStems: ['Supersaw Leads', 'Punchy 909 Kick', 'Sidechain Compressor', 'White Noise Sweeps'],
        description: 'High-energy mainstage festival sound with driving dynamic cadence.',
      };
    case 'Rock':
      return {
        progression: ['A5', 'D5', 'C5', 'G5'],
        chordsText: 'A5 → D5 → C5 → G5 (Power Chords)',
        key: 'A Pentatonic',
        scale: 'Blues Rock',
        instrumentStems: ['Overdrive Guitar Tone', 'Punchy Bass Guitar', 'Heavy Acoustic Drums', 'Plate Reverb'],
        description: 'Raw amplified rock overdrive with punchy groove dynamics.',
      };
    case 'Acoustic':
      return {
        progression: ['C', 'G', 'Am', 'F'],
        chordsText: 'C → G → Am → F (I – V – vi – IV Pop Axis)',
        key: 'C Major',
        scale: 'Diatonic Major',
        instrumentStems: ['Acoustic Guitar Plucks', 'Warm Felt Piano', 'Gentle Shaker Percussion', 'Wood Room Reverb'],
        description: 'Intimate organic timbre with harmonic clarity and gentle rhythm.',
      };
    case 'Ambient':
      return {
        progression: ['Fmaj7', 'C', 'Dm7', 'Am'],
        chordsText: 'Fmaj7 → C → Dm7 → Am (Floating)',
        key: 'F Lydian / C Major',
        scale: 'Lydian Modal',
        instrumentStems: ['Ethereal Shimmer Pad', 'Infinite Reverb Space', 'Granular Texture', 'Stereo Sine Waves'],
        description: 'Weightless floating sound bath with timeless meditative envelopes.',
      };
    case 'Hip-Hop':
      return {
        progression: ['Am', 'Bm7', 'C', 'G'],
        chordsText: 'Am → Bm7 → C → G (Boom-Bap Motif)',
        key: 'A Minor',
        scale: 'Minor Pentatonic',
        instrumentStems: ['Heavy 808 Sub-Bass', 'Crisp Sampled Snare', 'Layered Vocal Chops', 'Vinyl Warmth'],
        description: 'Urban rhythm pocket with heavy sub-bass foundation and soulful chops.',
      };
    case 'Classical':
    default:
      return {
        progression: ['C#m', 'A', 'F#m', 'G#'],
        chordsText: 'C#m → A → F#m → G# (i – VI – iv – V)',
        key: 'C# Minor',
        scale: 'Harmonic Minor',
        instrumentStems: ['Concert Grand Piano', 'Pedal Resonance', 'Lyrical Arpeggios', 'Dynamic Articulation'],
        description: 'Expressive classical acoustic piano masterwork with poetic dynamics.',
      };
  }
}

export function parseLyricsSections(lyrics?: string, totalDuration: number = 30): LyricsSection[] {
  if (!lyrics || !lyrics.trim()) {
    const secDur = totalDuration / 4;
    return [
      {
        id: 'sec_intro',
        tag: 'Intro',
        title: 'Atmospheric Synthesizer Intro',
        type: 'intro',
        lines: ['Analog pads swelling in harmony', 'Soft filter sweep building tempo', 'Establishing tonal root frequency'],
        startTimeSec: 0,
        endTimeSec: secDur,
      },
      {
        id: 'sec_verse_1',
        tag: 'Verse 1',
        title: 'Primary Harmonic Groove',
        type: 'verse',
        lines: ['Sub-bass arpeggio enters the mix', 'Lead synth carrying melodic motif', 'Crisp percussive rhythm cadence'],
        startTimeSec: secDur,
        endTimeSec: secDur * 2,
      },
      {
        id: 'sec_chorus',
        tag: 'Chorus / Drop',
        title: 'Peak Energy Crescendo',
        type: 'chorus',
        lines: ['Full four-part chord synthesis', 'Driving dynamic kick and snare impact', 'Maximum melodic resonance and warmth'],
        startTimeSec: secDur * 2,
        endTimeSec: secDur * 3,
      },
      {
        id: 'sec_outro',
        tag: 'Outro',
        title: 'Harmonic Decay & Resolution',
        type: 'outro',
        lines: ['Reverb decay across higher harmonics', 'Gentle melodic taper', 'Peaceful stereo fadeout'],
        startTimeSec: secDur * 3,
        endTimeSec: totalDuration,
      },
    ];
  }

  const rawSections = lyrics.split(/\n\s*\n/);
  const parsed: LyricsSection[] = [];

  rawSections.forEach((block, idx) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    let tag = `Verse ${idx + 1}`;
    let type: LyricsSection['type'] = 'verse';
    let lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);

    const tagMatch = lines[0]?.match(/^\[(.*?)\]$/);
    if (tagMatch) {
      tag = tagMatch[1];
      lines = lines.slice(1);
      const lower = tag.toLowerCase();
      if (lower.includes('chorus') || lower.includes('hook')) type = 'chorus';
      else if (lower.includes('intro')) type = 'intro';
      else if (lower.includes('outro')) type = 'outro';
      else if (lower.includes('bridge')) type = 'bridge';
      else type = 'verse';
    }

    if (lines.length > 0) {
      parsed.push({
        id: `section_${idx}_${tag.replace(/\s+/g, '_')}`,
        tag,
        title: tag,
        lines,
        type,
        startTimeSec: 0,
        endTimeSec: 0,
      });
    }
  });

  const count = Math.max(1, parsed.length);
  const secDuration = totalDuration / count;
  return parsed.map((sec, i) => ({
    ...sec,
    startTimeSec: Math.round(i * secDuration * 10) / 10,
    endTimeSec: Math.round((i + 1) * secDuration * 10) / 10,
  }));
}

export const musicService = {
  getSongs(): GeneratedSong[] {
    try {
      const key = getSongStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_generated_songs');
        if (legacy) {
          stored = legacy;
          localStorage.setItem(key, legacy);
        }
      }

      let list: GeneratedSong[] = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch {
          list = [];
        }
      }

      // Purge any pre-seeded real life hits / preset demo songs
      const cleaned = list.filter((s) => !s.isRealLifeHit && !s.isNoCopyright && !s.id.startsWith('real_'));
      if (cleaned.length !== list.length) {
        localStorage.setItem(key, JSON.stringify(cleaned));
      }

      return cleaned;
    } catch (e) {
      console.error('Failed to load songs', e);
      return [];
    }
  },

  getRealLifeSongs(): GeneratedSong[] {
    return [];
  },

  reloadRealLifeHits(): GeneratedSong[] {
    return this.getSongs();
  },

  clearAllSongs(): void {
    if (activePlayback) {
      this.stopPlayback();
    }
    const key = getSongStorageKey();
    const existing = this.getSongs();
    localStorage.removeItem(key);
    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      existing.forEach((s) => {
        firestoreStorageService.deleteUserSong(userId, s.id).catch(() => {});
      });
    }
  },

  async syncWithFirestore(): Promise<GeneratedSong[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        const cloudSongs = await firestoreStorageService.loadUserSongs(userId);
        // Purge any real songs from cloud
        const cleanCloudSongs = cloudSongs.filter((s) => !s.isRealLifeHit && !s.isNoCopyright && !s.id.startsWith('real_'));
        if (cleanCloudSongs.length > 0) {
          this.saveSongs(cleanCloudSongs);
          return cleanCloudSongs;
        } else {
          // Push existing local clean songs to cloud for this user
          const localSongs = this.getSongs();
          for (const s of localSongs) {
            await firestoreStorageService.saveUserSong(userId, s);
          }
        }
      }
    } catch (err) {
      console.warn('Song sync error:', err);
    }
    return this.getSongs();
  },

  saveSongs(songs: GeneratedSong[]): void {
    try {
      const key = getSongStorageKey();
      // Ensure only genuine user songs are stored
      const cleaned = songs.filter((s) => !s.isRealLifeHit && !s.isNoCopyright && !s.id.startsWith('real_'));
      localStorage.setItem(key, JSON.stringify(cleaned));
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        cleaned.slice(0, 15).forEach((s) => {
          firestoreStorageService.saveUserSong(userId, s).catch(() => {});
        });
      }
    } catch (e) {
      console.error('Failed to save songs', e);
    }
  },

  deleteSong(songId: string): GeneratedSong[] {
    if (activePlayback) {
      this.stopPlayback();
    }
    const songs = this.getSongs().filter((s) => s.id !== songId);
    this.saveSongs(songs);
    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      firestoreStorageService.deleteUserSong(userId, songId).catch(() => {});
    }
    return songs;
  },

  async generateSong(params: {
    prompt: string;
    genre: SongGenre;
    mood: SongMood;
    tempoBpm: number;
    durationSeconds: number;
    modelId: ForgeXModelId;
    includeLyrics?: boolean;
    customLyrics?: string;
    hasVoice?: boolean;
    voiceProfile?: SongVoiceProfile;
    vocalStyle?: SongVocalStyle;
  }): Promise<GeneratedSong> {
    const cleanPrompt = params.prompt.trim() || 'Cosmic Odyssey';
    const words = cleanPrompt.split(' ');
    const title = words.length > 4 ? words.slice(0, 4).join(' ') : cleanPrompt;
    const duration = Math.max(30, Math.min(210, params.durationSeconds || 180));
    const hasVoice = params.hasVoice !== undefined ? params.hasVoice : Boolean(params.includeLyrics || params.customLyrics);
    const voiceProfile = params.voiceProfile || 'Zephyr';
    const vocalStyle = params.vocalStyle || 'Melodic Singing';

    let lyrics = params.customLyrics;
    if ((params.includeLyrics || hasVoice) && !lyrics) {
      try {
        const resp = await fetch('/api/song-lyrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPrompt,
            genre: params.genre,
            mood: params.mood,
            durationSeconds: duration,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.lyrics) {
            lyrics = data.lyrics;
          }
        }
      } catch (err) {
        console.warn('AI lyrics fetch fallback:', err);
      }

      if (!lyrics) {
        lyrics = this.generateProceduralLyrics(cleanPrompt, params.genre, params.mood, duration);
      }
    }

    const seed = Math.floor(Math.random() * 999999);
    const cover = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt + ' album cover art, ' + params.genre + ' music style, graphic design, vinyl record art 8k')}` +
      `?width=600&height=600&seed=${seed}&nologo=true`;

    const newSong: GeneratedSong = {
      id: 'song_' + Date.now(),
      title: title.charAt(0).toUpperCase() + title.slice(1),
      prompt: cleanPrompt,
      genre: params.genre,
      mood: params.mood,
      tempoBpm: params.tempoBpm,
      durationSeconds: duration,
      lyrics,
      coverUrl: cover || COVER_IMAGES[params.genre],
      modelId: params.modelId,
      createdAt: Date.now(),
      isFavorite: false,
      audioSeed: seed,
      hasVoice,
      voiceProfile,
      vocalStyle,
    };

    const current = this.getSongs();
    const updated = [newSong, ...current];
    this.saveSongs(updated);
    return newSong;
  },

  generateProceduralLyrics(prompt: string, genre: SongGenre, mood: SongMood, durationSeconds: number = 180): string {
    const isLongTrack = durationSeconds >= 120;
    const isMaxTrack = durationSeconds >= 180;

    return `[Intro]
Analog pulses rising through the mist
Lost in a feeling that cannot resist
${genre} frequency taking control
Igniting the rhythm inside the soul

[Verse 1]
Neon shadows across the floor
Chasing the sound we were looking for
Echoes of light in a silent sky
Every new path is opening wide
Walking through streets that never sleep
Secrets the midnight whispers to keep

[Chorus]
And the rhythm moves in time
With the heartbeat on the line
Feel the electricity soar
We don't have to wait no more
Turn the dial, ignite the flame
Nothing here will stay the same!

[Verse 2]
Signals align through the midnight air
A melody floating everywhere
Lost in the frequencies of the night
Everything turning to golden light
Footsteps matching the sub-bass drive
This is the moment we feel alive
${isLongTrack ? `
[Chorus]
And the rhythm moves in time
With the heartbeat on the line
Feel the electricity soar
We don't have to wait no more
Turn the dial, ignite the flame
Nothing here will stay the same!

[Bridge]
Time slows down as the filters sweep
A promise that this frequency will keep
Let the harmonics wash through the mind
Leaving all the static far behind...
` : ''}${isMaxTrack ? `
[Chorus]
And the rhythm moves in time
With the heartbeat on the line
Feel the electricity soar
We don't have to wait no more!
Maximum sound, maximum light
We own the dawn, we own the night!
` : ''}
[Outro]
Fading into the pure sound
Rising above the solid ground
Echoes dissolving into the blue
Forever resonant and true...`;
  },

  toggleFavorite(songId: string): GeneratedSong[] {
    const updated = this.getSongs().map((s) =>
      s.id === songId ? { ...s, isFavorite: !s.isFavorite } : s
    );
    this.saveSongs(updated);
    return updated;
  },

  stopPlayback(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (activePlayback) {
      try {
        activePlayback.stop();
      } catch (e) {
        console.warn('Playback stop warning', e);
      }
      activePlayback = null;
    }
  },

  isPlaying(): boolean {
    return Boolean(activePlayback);
  },

  setVolume(vol: number): void {
    if (activePlayback) {
      activePlayback.setVolume(vol);
    }
  },

  setVocalVolume(vol: number): void {
    currentVocalVolume = Math.max(0, Math.min(1, vol));
    if (activePlayback?.setVocalVolume) {
      activePlayback.setVocalVolume(currentVocalVolume);
    }
  },

  getVocalVolume(): number {
    return currentVocalVolume;
  },

  setBeatVolume(vol: number): void {
    currentBeatVolume = Math.max(0, Math.min(1, vol));
    if (activePlayback?.setBeatVolume) {
      activePlayback.setBeatVolume(currentBeatVolume);
    }
  },

  getBeatVolume(): number {
    return currentBeatVolume;
  },

  /**
   * Plays a song track. If the song has an audioUrl (e.g. 3-minute public domain recording
   * or Firebase cloud-stored audio), plays via HTML5 Audio with full progress and volume tracking.
   * If audioUrl is absent or fails to load, gracefully falls back to the real-time Web Audio synthesizer!
   */
  playSong(
    song: GeneratedSong,
    onTick?: (currentTime: number, duration: number) => void,
    onEnded?: () => void,
    startOffset: number = 0,
    initialVolume: number = 0.5
  ): { stop: () => void; setVolume: (vol: number) => void } {
    this.stopPlayback();

    if (song.audioUrl) {
      try {
        const audio = new Audio();
        // Only set crossOrigin if it's an external URL to avoid unnecessary CORS restrictions on local routes
        if (song.audioUrl.startsWith('http')) {
          audio.crossOrigin = 'anonymous';
        }
        audio.preload = 'auto';
        audio.src = song.audioUrl;
        audio.volume = Math.max(0, Math.min(1, initialVolume));

        let isStopped = false;
        let didFallback = false;

        const stop = () => {
          if (isStopped) return;
          isStopped = true;
          try {
            audio.pause();
            audio.src = '';
          } catch {}
        };

        const setVolume = (vol: number) => {
          try {
            audio.volume = Math.max(0, Math.min(1, vol));
          } catch {}
        };

        const totalDuration = song.durationSeconds || 180;

        audio.onloadedmetadata = () => {
          if (startOffset > 0 && startOffset < (audio.duration || totalDuration)) {
            audio.currentTime = startOffset;
          }
        };

        audio.ontimeupdate = () => {
          if (!isStopped && onTick) {
            const current = audio.currentTime;
            const dur = audio.duration && !isNaN(audio.duration) && audio.duration > 0
              ? audio.duration
              : totalDuration;
            onTick(current, dur);
          }
        };

        audio.onended = () => {
          if (!isStopped) {
            stop();
            if (onEnded) onEnded();
          }
        };

        audio.onerror = (e) => {
          if (!isStopped && !didFallback) {
            didFallback = true;
            console.warn('Audio streaming failed for track:', song.title, e);
            stop();
            if (!song.isRealLifeHit) {
              this.playSynthesized(song, onTick, onEnded, startOffset, initialVolume);
            }
          }
        };

        audio.play().catch((playErr) => {
          if (!isStopped && !didFallback) {
            didFallback = true;
            console.warn('Audio play() failed:', playErr);
            stop();
            if (!song.isRealLifeHit) {
              this.playSynthesized(song, onTick, onEnded, startOffset, initialVolume);
            }
          }
        });

        activePlayback = {
          audioElement: audio,
          stop,
          setVolume,
        };

        return { stop, setVolume };
      } catch (err) {
        console.warn('Audio playback initialization failed, synthesizing instead:', err);
      }
    }

    return this.playSynthesized(song, onTick, onEnded, startOffset, initialVolume);
  },

  /**
   * Procedural Web Audio synthesizer capable of full 3:30-minute (210s) beat & voice synthesis
   */
  playSynthesized(
    song: GeneratedSong,
    onTick?: (currentTime: number, duration: number) => void,
    onEnded?: () => void,
    startOffset: number = 0,
    initialVolume: number = 0.5
  ): { stop: () => void; setVolume: (vol: number) => void; setVocalVolume: (vol: number) => void; setBeatVolume: (vol: number) => void } {
    this.stopPlayback();

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, initialVolume)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    const beatGain = ctx.createGain();
    beatGain.gain.setValueAtTime(currentBeatVolume, ctx.currentTime);
    beatGain.connect(masterGain);

    const vocalGain = ctx.createGain();
    vocalGain.gain.setValueAtTime(currentVocalVolume, ctx.currentTime);
    vocalGain.connect(masterGain);

    // Chords depending on genre (frequencies in Hz)
    const chordProgressions: Record<SongGenre, number[][]> = {
      Synthwave: [
        [220, 261.63, 329.63], // Am
        [174.61, 220, 261.63], // F
        [130.81, 164.81, 196], // C
        [196, 246.94, 293.66], // G
      ],
      'Lo-Fi': [
        [261.63, 329.63, 392, 493.88], // Cmaj7
        [220, 261.63, 329.63, 392],    // Am7
        [174.61, 220, 261.63, 329.63], // Fmaj7
        [196, 246.94, 293.66, 349.23], // G7
      ],
      Cinematic: [
        [110, 164.81, 220], // Low A
        [130.81, 196, 261.63], // Low C
        [146.83, 220, 293.66], // Low D
        [174.61, 261.63, 349.23], // Low F
      ],
      EDM: [
        [220, 277.18, 329.63], // A
        [174.61, 220, 261.63], // F
        [130.81, 164.81, 196], // C
        [196, 246.94, 293.66], // G
      ],
      Rock: [
        [110, 164.81], // A5
        [146.83, 220], // D5
        [130.81, 196], // C5
        [196, 293.66], // G5
      ],
      Acoustic: [
        [261.63, 329.63, 392], // C
        [196, 246.94, 293.66], // G
        [220, 261.63, 329.63], // Am
        [174.61, 220, 261.63], // F
      ],
      Ambient: [
        [174.61, 261.63, 329.63, 440],
        [130.81, 196, 261.63, 392],
        [146.83, 220, 293.66, 440],
        [110, 164.81, 220, 329.63],
      ],
      'Hip-Hop': [
        [110, 130.81, 164.81],
        [123.47, 146.83, 174.61],
        [130.81, 164.81, 196],
        [98, 123.47, 146.83],
      ],
      Classical: [
        [138.59, 164.81, 207.65, 277.18], // C#m
        [110, 138.59, 164.81, 220],       // A
        [92.5, 110, 138.59, 185],         // F#m
        [103.83, 130.81, 155.56, 207.65], // G#
      ],
    };

    const chords = chordProgressions[song.genre] || chordProgressions.Synthwave;
    const bpm = song.tempoBpm || 120;
    const beatDuration = 60 / bpm;
    const totalDuration = Math.min(210, song.durationSeconds || 180);

    let isStopped = false;
    const oscillators: OscillatorNode[] = [];
    const lyricsSections = song.lyrics ? parseLyricsSections(song.lyrics, totalDuration) : [];
    const triggeredSpeechSections = new Set<string>();

    // Schedule musical loops across duration with startOffset
    const safeOffset = Math.max(0, Math.min(totalDuration - 0.5, startOffset));
    const startTime = ctx.currentTime - safeOffset;

    const playChordBar = (barIndex: number) => {
      if (isStopped) return;
      const chord = chords[barIndex % chords.length];
      const barTime = startTime + barIndex * (beatDuration * 4);

      if (barTime >= startTime + totalDuration) {
        return;
      }
      if (barTime + beatDuration * 4 < ctx.currentTime) {
        return; // Bar already passed
      }

      const noteTrigger = Math.max(ctx.currentTime, barTime);

      // 1. Bassline (Beat)
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = song.genre === 'Synthwave' || song.genre === 'EDM' || song.genre === 'Hip-Hop' ? 'sawtooth' : 'triangle';
      bassOsc.frequency.setValueAtTime(chord[0] / 2, noteTrigger);
      bassGain.gain.setValueAtTime(0.24, noteTrigger);
      bassGain.gain.exponentialRampToValueAtTime(0.01, barTime + beatDuration * 3.8);

      bassOsc.connect(bassGain);
      bassGain.connect(beatGain);
      bassOsc.start(noteTrigger);
      bassOsc.stop(barTime + beatDuration * 4);
      oscillators.push(bassOsc);

      // 2. Chords & Harmonic Pads (Beat)
      chord.forEach((freq, noteIdx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = song.genre === 'Ambient' ? 'sine' : song.genre === 'Rock' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, noteTrigger);

        const scheduledStart = song.genre === 'Synthwave' || song.genre === 'EDM'
          ? barTime + noteIdx * (beatDuration / 2)
          : barTime;
        const actualStart = Math.max(ctx.currentTime, scheduledStart);
        
        noteGain.gain.setValueAtTime(0.001, actualStart);
        noteGain.gain.exponentialRampToValueAtTime(0.07, actualStart + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, barTime + beatDuration * 3.8);

        osc.connect(noteGain);
        noteGain.connect(beatGain);
        osc.start(actualStart);
        osc.stop(barTime + beatDuration * 4);
        oscillators.push(osc);
      });

      // 3. Drums: Kick, Snare & Hi-Hats (Beat)
      if (song.genre !== 'Ambient') {
        for (let beat = 0; beat < 4; beat++) {
          const beatTime = barTime + beat * beatDuration;
          if (beatTime >= startTime + totalDuration) break;
          if (beatTime < ctx.currentTime) continue;

          // Kick on beats 0 and 2
          if (beat === 0 || beat === 2) {
            const kickOsc = ctx.createOscillator();
            const kickG = ctx.createGain();
            kickOsc.frequency.setValueAtTime(160, beatTime);
            kickOsc.frequency.exponentialRampToValueAtTime(32, beatTime + 0.12);
            kickG.gain.setValueAtTime(0.38, beatTime);
            kickG.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.16);

            kickOsc.connect(kickG);
            kickG.connect(beatGain);
            kickOsc.start(beatTime);
            kickOsc.stop(beatTime + 0.2);
            oscillators.push(kickOsc);
          }

          // Snare on beats 1 and 3
          if (beat === 1 || beat === 3) {
            const snareNoise = ctx.createOscillator();
            const snareG = ctx.createGain();
            snareNoise.type = 'triangle';
            snareNoise.frequency.setValueAtTime(240, beatTime);
            snareNoise.frequency.exponentialRampToValueAtTime(65, beatTime + 0.1);
            snareG.gain.setValueAtTime(0.2, beatTime);
            snareG.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.12);

            snareNoise.connect(snareG);
            snareG.connect(beatGain);
            snareNoise.start(beatTime);
            snareNoise.stop(beatTime + 0.15);
            oscillators.push(snareNoise);
          }

          // Hi-Hats on 8th notes (driving groove)
          const hatTime = beatTime + beatDuration / 2;
          if (hatTime < startTime + totalDuration && hatTime >= ctx.currentTime) {
            const hatOsc = ctx.createOscillator();
            const hatG = ctx.createGain();
            hatOsc.type = 'highpass' as any; // or triangle frequency
            hatOsc.type = 'triangle';
            hatOsc.frequency.setValueAtTime(8000, hatTime);
            hatG.gain.setValueAtTime(0.06, hatTime);
            hatG.gain.exponentialRampToValueAtTime(0.001, hatTime + 0.04);
            hatOsc.connect(hatG);
            hatG.connect(beatGain);
            hatOsc.start(hatTime);
            hatOsc.stop(hatTime + 0.05);
            oscillators.push(hatOsc);
          }
        }
      }

      // 4. AI Vocal Formant Singing Synthesizer (True Melodic Singing, Not Spoken Reading)
      if (song.hasVoice !== false) {
        // Adjust vocal pitch register based on the chosen AI Voice Profile
        let pitchMultiplier = 1.5;
        let vocalBrightness = 1.0;
        if (song.voiceProfile === 'Aoede') {
          pitchMultiplier = 2.0; // Soprano
          vocalBrightness = 1.25;
        } else if (song.voiceProfile === 'Puck') {
          pitchMultiplier = 1.75; // Bright Tenor
          vocalBrightness = 1.15;
        } else if (song.voiceProfile === 'Kore') {
          pitchMultiplier = 1.4; // Soulful Alto
          vocalBrightness = 0.95;
        } else if (song.voiceProfile === 'Fenrir') {
          pitchMultiplier = 1.0; // Deep Resonant Baritone
          vocalBrightness = 0.85;
        } else if (song.voiceProfile === 'Charon') {
          pitchMultiplier = 0.85; // Low Bass
          vocalBrightness = 0.8;
        }

        // Melodic singing notes derived from the chord progression scale
        const scaleNotes = [
          chord[0] * pitchMultiplier,
          (chord[1] || chord[0] * 1.25) * pitchMultiplier,
          (chord[2] || chord[0] * 1.5) * pitchMultiplier,
          chord[0] * pitchMultiplier * 1.33,
        ];

        // Sing 2 distinct melodic phrases per bar with glissando, singer's formant, and vibrato
        for (let phraseIdx = 0; phraseIdx < 2; phraseIdx++) {
          const phraseStart = noteTrigger + phraseIdx * (beatDuration * 2);
          const phraseDuration = beatDuration * 1.85;
          const targetPitch = scaleNotes[(barIndex * 2 + phraseIdx) % scaleNotes.length];

          // Lead Singing Oscillator (Vocal Cord Vibration)
          const leadOsc = ctx.createOscillator();
          leadOsc.type = 'sawtooth';
          leadOsc.frequency.setValueAtTime(targetPitch * 0.98, phraseStart);
          // Glissando / Portamento pitch bend into the singing note
          leadOsc.frequency.exponentialRampToValueAtTime(targetPitch, phraseStart + 0.12);

          // Vocal Tract Formant Filter 1 (F1 Throat Vowel Resonance: cycles through Ah / Oh / Ee)
          const formant1 = ctx.createBiquadFilter();
          formant1.type = 'bandpass';
          const vowelFreq = (barIndex + phraseIdx) % 3 === 0 ? 800 : (barIndex + phraseIdx) % 3 === 1 ? 550 : 1100;
          formant1.frequency.setValueAtTime(vowelFreq * vocalBrightness, phraseStart);
          formant1.Q.setValueAtTime(4.5, phraseStart);

          // Vocal Tract Formant Filter 2 (F2 Singer's Ring Formant ~2600Hz)
          const formant2 = ctx.createBiquadFilter();
          formant2.type = 'peaking';
          formant2.frequency.setValueAtTime(2600 * vocalBrightness, phraseStart);
          formant2.gain.setValueAtTime(7.0, phraseStart);
          formant2.Q.setValueAtTime(3.2, phraseStart);

          // Singing Vibrato LFO (5.2 Hz with delayed human swell)
          const vibratoLfo = ctx.createOscillator();
          const vibratoGain = ctx.createGain();
          vibratoLfo.frequency.setValueAtTime(5.2, phraseStart);
          vibratoGain.gain.setValueAtTime(0, phraseStart);
          // Swell vibrato after attack
          vibratoGain.gain.linearRampToValueAtTime(targetPitch * 0.024, phraseStart + 0.35);
          vibratoLfo.connect(vibratoGain);
          vibratoGain.connect(leadOsc.frequency);

          // Vocal Amplitude Envelope (Smooth singing attack & natural release)
          const vocalAmp = ctx.createGain();
          vocalAmp.gain.setValueAtTime(0.0001, phraseStart);
          vocalAmp.gain.exponentialRampToValueAtTime(0.22, phraseStart + 0.09);
          vocalAmp.gain.exponentialRampToValueAtTime(0.16, phraseStart + phraseDuration * 0.7);
          vocalAmp.gain.exponentialRampToValueAtTime(0.0001, phraseStart + phraseDuration);

          // Routing
          leadOsc.connect(formant1);
          formant1.connect(formant2);
          formant2.connect(vocalAmp);
          vocalAmp.connect(vocalGain);

          leadOsc.start(phraseStart);
          vibratoLfo.start(phraseStart);
          leadOsc.stop(phraseStart + phraseDuration);
          vibratoLfo.stop(phraseStart + phraseDuration);
          oscillators.push(leadOsc, vibratoLfo);

          // 5. Harmonized Backing Vocalist Layer (at a musical third or fifth above)
          if (song.vocalStyle === 'Harmonized Vocals' || barIndex % 2 === 1) {
            const harmOsc = ctx.createOscillator();
            harmOsc.type = 'triangle';
            harmOsc.frequency.setValueAtTime(targetPitch * 1.25, phraseStart);
            harmOsc.frequency.exponentialRampToValueAtTime(targetPitch * 1.26, phraseStart + 0.12);
            const harmGain = ctx.createGain();
            harmGain.gain.setValueAtTime(0.0001, phraseStart);
            harmGain.gain.exponentialRampToValueAtTime(0.08, phraseStart + 0.14);
            harmGain.gain.exponentialRampToValueAtTime(0.0001, phraseStart + phraseDuration);

            harmOsc.connect(formant1);
            harmOsc.start(phraseStart);
            harmOsc.stop(phraseStart + phraseDuration);
            oscillators.push(harmOsc);
          }
        }
      }
    };

    const numBars = Math.ceil(totalDuration / (beatDuration * 4));
    for (let bar = 0; bar < numBars; bar++) {
      playChordBar(bar);
    }

    // Interval ticker for playback tracking without monotone robotic speech reading
    const interval = window.setInterval(() => {
      if (isStopped) {
        clearInterval(interval);
        return;
      }
      const elapsed = ctx.currentTime - startTime;

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        musicService.stopPlayback();
        if (onEnded) onEnded();
      } else {
        if (onTick) onTick(elapsed, totalDuration);
      }
    }, 100);

    const stop = () => {
      if (isStopped) return;
      isStopped = true;
      clearInterval(interval);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      try {
        masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        setTimeout(() => {
          oscillators.forEach((osc) => {
            try { osc.stop(); } catch {}
          });
          ctx.close();
        }, 120);
      } catch (e) {
        console.warn('Error stopping Web Audio playback', e);
      }
    };

    const setVolume = (vol: number) => {
      try {
        masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), ctx.currentTime);
      } catch {}
    };

    const setVocalVolume = (vol: number) => {
      try {
        vocalGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), ctx.currentTime);
      } catch {}
    };

    const setBeatVolume = (vol: number) => {
      try {
        beatGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), ctx.currentTime);
      } catch {}
    };

    activePlayback = {
      audioContext: ctx,
      gainNode: masterGain,
      beatGainNode: beatGain,
      vocalGainNode: vocalGain,
      stop,
      setVolume,
      setVocalVolume,
      setBeatVolume,
    };

    return { stop, setVolume, setVocalVolume, setBeatVolume };
  },

  /**
   * Export synthesized audio to a downloadable WAV Blob (supports up to 3:30 min = 210s)
   * Encodes both the procedural beat and the singing vocal formant melody tracks!
   */
  async exportSongWavBlob(song: GeneratedSong): Promise<Blob> {
    const sampleRate = 44100;
    const duration = Math.min(210, song.durationSeconds || 180);
    const OfflineCtxClass = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtxClass(2, Math.floor(sampleRate * duration), sampleRate);

    // Chords
    const chordProgressions: Record<SongGenre, number[][]> = {
      Synthwave: [[220, 261.63, 329.63], [174.61, 220, 261.63], [130.81, 164.81, 196], [196, 246.94, 293.66]],
      'Lo-Fi': [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]],
      Cinematic: [[110, 164.81, 220], [130.81, 196, 261.63], [146.83, 220, 293.66], [174.61, 261.63, 349.23]],
      EDM: [[220, 277.18, 329.63], [174.61, 220, 261.63], [130.81, 164.81, 196], [196, 246.94, 293.66]],
      Rock: [[110, 164.81], [146.83, 220], [130.81, 196], [196, 293.66]],
      Acoustic: [[261.63, 329.63, 392], [196, 246.94, 293.66], [220, 261.63, 329.63], [174.61, 220, 261.63]],
      Ambient: [[174.61, 261.63, 329.63, 440], [130.81, 196, 261.63, 392], [146.83, 220, 293.66, 440], [110, 164.81, 220, 329.63]],
      'Hip-Hop': [[110, 130.81, 164.81], [123.47, 146.83, 174.61], [130.81, 164.81, 196], [98, 123.47, 146.83]],
      Classical: [[138.59, 164.81, 207.65], [110, 138.59, 164.81], [92.5, 110, 138.59], [103.83, 130.81, 155.56]],
    };

    const chords = chordProgressions[song.genre] || chordProgressions.Synthwave;
    const bpm = song.tempoBpm || 120;
    const beatDuration = 60 / bpm;
    const numBars = Math.ceil(duration / (beatDuration * 4));

    for (let bar = 0; bar < numBars; bar++) {
      const barTime = bar * (beatDuration * 4);
      if (barTime >= duration) break;
      const chord = chords[bar % chords.length];

      // 1. Bass (Beat)
      const bass = offlineCtx.createOscillator();
      const bassGain = offlineCtx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(chord[0] / 2, barTime);
      bassGain.gain.setValueAtTime(0.22, barTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01, barTime + beatDuration * 3.5);
      bass.connect(bassGain);
      bassGain.connect(offlineCtx.destination);
      bass.start(barTime);
      bass.stop(barTime + beatDuration * 4);

      // 2. Chords (Beat)
      chord.forEach((freq) => {
        const osc = offlineCtx.createOscillator();
        const noteGain = offlineCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, barTime);
        noteGain.gain.setValueAtTime(0.06, barTime);
        noteGain.gain.exponentialRampToValueAtTime(0.001, barTime + beatDuration * 3.5);
        osc.connect(noteGain);
        noteGain.connect(offlineCtx.destination);
        osc.start(barTime);
        osc.stop(barTime + beatDuration * 4);
      });

      // 3. Drums: Kick & Snare (Beat)
      if (song.genre !== 'Ambient') {
        for (let b = 0; b < 4; b++) {
          const bt = barTime + b * beatDuration;
          if (bt >= duration) break;
          if (b === 0 || b === 2) {
            const k = offlineCtx.createOscillator();
            const kg = offlineCtx.createGain();
            k.frequency.setValueAtTime(150, bt);
            k.frequency.exponentialRampToValueAtTime(32, bt + 0.12);
            kg.gain.setValueAtTime(0.35, bt);
            kg.gain.exponentialRampToValueAtTime(0.001, bt + 0.15);
            k.connect(kg);
            kg.connect(offlineCtx.destination);
            k.start(bt);
            k.stop(bt + 0.18);
          }
          if (b === 1 || b === 3) {
            const sn = offlineCtx.createOscillator();
            const sng = offlineCtx.createGain();
            sn.type = 'triangle';
            sn.frequency.setValueAtTime(230, bt);
            sn.frequency.exponentialRampToValueAtTime(60, bt + 0.1);
            sng.gain.setValueAtTime(0.18, bt);
            sng.gain.exponentialRampToValueAtTime(0.001, bt + 0.12);
            sn.connect(sng);
            sng.connect(offlineCtx.destination);
            sn.start(bt);
            sn.stop(bt + 0.15);
          }
        }
      }

      // 4. Vocal Formant Singing Melody Track (AI Singing Voice in WAV Export)
      if (song.hasVoice !== false && song.lyrics) {
        const scaleNotes = [
          chord[0] * 1.5,
          (chord[1] || chord[0] * 1.25) * 1.5,
          (chord[2] || chord[0] * 1.5) * 1.5,
          chord[0] * 2.0,
        ];

        for (let phraseIdx = 0; phraseIdx < 2; phraseIdx++) {
          const phraseStart = barTime + phraseIdx * (beatDuration * 2);
          const phraseDuration = beatDuration * 1.85;
          const targetPitch = scaleNotes[(bar * 2 + phraseIdx) % scaleNotes.length];

          const voc = offlineCtx.createOscillator();
          const vocFilt1 = offlineCtx.createBiquadFilter();
          const vocFilt2 = offlineCtx.createBiquadFilter();
          const vocG = offlineCtx.createGain();

          vocFilt1.type = 'bandpass';
          vocFilt1.frequency.setValueAtTime((bar + phraseIdx) % 2 === 0 ? 800 : 1150, phraseStart);
          vocFilt1.Q.setValueAtTime(4.2, phraseStart);

          vocFilt2.type = 'peaking';
          vocFilt2.frequency.setValueAtTime(2400, phraseStart);
          vocFilt2.gain.setValueAtTime(6.0, phraseStart);
          vocFilt2.Q.setValueAtTime(3.0, phraseStart);

          voc.type = 'sawtooth';
          voc.frequency.setValueAtTime(targetPitch, phraseStart);
          voc.frequency.exponentialRampToValueAtTime(targetPitch * 1.01, phraseStart + 0.1);

          vocG.gain.setValueAtTime(0.0001, phraseStart);
          vocG.gain.exponentialRampToValueAtTime(0.16, phraseStart + 0.08);
          vocG.gain.exponentialRampToValueAtTime(0.12, phraseStart + phraseDuration * 0.7);
          vocG.gain.exponentialRampToValueAtTime(0.0001, phraseStart + phraseDuration);

          voc.connect(vocFilt1);
          vocFilt1.connect(vocFilt2);
          vocFilt2.connect(vocG);
          vocG.connect(offlineCtx.destination);

          voc.start(phraseStart);
          voc.stop(phraseStart + phraseDuration);

          // Vocal harmony layer
          if (song.vocalStyle === 'Harmonized Vocals' || bar % 2 === 1) {
            const harm = offlineCtx.createOscillator();
            const harmG = offlineCtx.createGain();
            harm.type = 'triangle';
            harm.frequency.setValueAtTime(targetPitch * 1.25, phraseStart);
            harmG.gain.setValueAtTime(0.0001, phraseStart);
            harmG.gain.exponentialRampToValueAtTime(0.05, phraseStart + 0.1);
            harmG.gain.exponentialRampToValueAtTime(0.0001, phraseStart + phraseDuration);
            harm.connect(vocFilt1);
            harm.start(phraseStart);
            harm.stop(phraseStart + phraseDuration);
          }
        }
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWav(renderedBuffer);
  },

  /**
   * Export synthesized audio to a downloadable WAV URL
   */
  async exportSongWav(song: GeneratedSong): Promise<string> {
    const blob = await this.exportSongWavBlob(song);
    return URL.createObjectURL(blob);
  },

  /**
   * Uploads the song to Firebase Storage and saves download URL to Firestore
   */
  async saveSongToCloud(song: GeneratedSong): Promise<{ success: boolean; cloudUrl: string }> {
    try {
      let blob: Blob;
      if (song.audioUrl && !song.audioUrl.startsWith('blob:')) {
        try {
          const resp = await fetch(song.audioUrl);
          blob = await resp.blob();
        } catch {
          blob = await this.exportSongWavBlob(song);
        }
      } else {
        blob = await this.exportSongWavBlob(song);
      }
      return await storageService.saveSongAudioToStorage(song, blob);
    } catch (err: any) {
      console.warn('saveSongToCloud failed:', err);
      const fallbackUrl = song.audioUrl || '';
      return { success: false, cloudUrl: fallbackUrl };
    }
  },
};

/**
 * Encodes an AudioBuffer into a WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
