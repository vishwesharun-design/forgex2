import { GeneratedSong, SongGenre, SongMood, ForgeXModelId } from '../types';

const STORAGE_KEY_SONGS = 'forgex_generated_songs';

interface SynthesizedAudioPlayback {
  audioContext: AudioContext;
  gainNode: GainNode;
  stop: () => void;
}

let activePlayback: SynthesizedAudioPlayback | null = null;

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
    default:
      return {
        progression: ['Am', 'Bm7', 'C', 'G'],
        chordsText: 'Am → Bm7 → C → G (Boom-Bap Motif)',
        key: 'A Minor',
        scale: 'Minor Pentatonic',
        instrumentStems: ['Heavy 808 Sub-Bass', 'Crisp Sampled Snare', 'Layered Vocal Chops', 'Vinyl Warmth'],
        description: 'Urban rhythm pocket with heavy sub-bass foundation and soulful chops.',
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
      const stored = localStorage.getItem(STORAGE_KEY_SONGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load songs', e);
    }
    return [];
  },

  saveSongs(songs: GeneratedSong[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_SONGS, JSON.stringify(songs));
    } catch (e) {
      console.error('Failed to save songs', e);
    }
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
  }): Promise<GeneratedSong> {
    // Generate intelligent title and lyrics
    const cleanPrompt = params.prompt.trim() || 'Cosmic Odyssey';
    const words = cleanPrompt.split(' ');
    const title = words.length > 4 ? words.slice(0, 4).join(' ') : cleanPrompt;

    let lyrics = params.customLyrics;
    if (params.includeLyrics && !lyrics) {
      lyrics = this.generateProceduralLyrics(cleanPrompt, params.genre, params.mood);
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
      durationSeconds: params.durationSeconds,
      lyrics,
      coverUrl: cover || COVER_IMAGES[params.genre],
      modelId: params.modelId,
      createdAt: Date.now(),
      isFavorite: false,
      audioSeed: seed,
    };

    const current = this.getSongs();
    const updated = [newSong, ...current];
    this.saveSongs(updated);
    return newSong;
  },

  generateProceduralLyrics(prompt: string, genre: SongGenre, mood: SongMood): string {
    return `[Verse 1]
Neon shadows across the floor
Chasing the sound we were looking for
Echoes of light in a silent sky
Every new path is opening wide

[Chorus]
And the rhythm moves in time
With the heartbeat on the line
Feel the electricity soar
We don't have to wait no more

[Verse 2]
Signals align through the midnight air
A melody floating everywhere
Lost in the frequencies of the night
Everything turning to golden light

[Outro]
Fading into the sound
Rising above the ground...`;
  },

  toggleFavorite(songId: string): GeneratedSong[] {
    const updated = this.getSongs().map((s) =>
      s.id === songId ? { ...s, isFavorite: !s.isFavorite } : s
    );
    this.saveSongs(updated);
    return updated;
  },

  deleteSong(songId: string): GeneratedSong[] {
    if (activePlayback) {
      this.stopPlayback();
    }
    const updated = this.getSongs().filter((s) => s.id !== songId);
    this.saveSongs(updated);
    return updated;
  },

  stopPlayback(): void {
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
      try {
        activePlayback.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), activePlayback.audioContext.currentTime);
      } catch (e) {
        console.warn('Volume set failed', e);
      }
    }
  },

  /**
   * Synthesizes audio in real-time through Web Audio API
   */
  playSong(
    song: GeneratedSong,
    onTick?: (currentTime: number, duration: number) => void,
    onEnded?: () => void,
    startOffset: number = 0,
    initialVolume: number = 0.3
  ): { stop: () => void; setVolume: (vol: number) => void } {
    this.stopPlayback();

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, initialVolume)), ctx.currentTime);
    masterGain.connect(ctx.destination);

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
    };

    const chords = chordProgressions[song.genre] || chordProgressions.Synthwave;
    const bpm = song.tempoBpm || 120;
    const beatDuration = 60 / bpm;
    const totalDuration = song.durationSeconds || 30;

    let isStopped = false;
    const oscillators: OscillatorNode[] = [];

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

      // 1. Bass note
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = song.genre === 'Synthwave' || song.genre === 'EDM' ? 'sawtooth' : 'triangle';
      bassOsc.frequency.setValueAtTime(chord[0] / 2, noteTrigger);
      bassGain.gain.setValueAtTime(0.2, noteTrigger);
      bassGain.gain.exponentialRampToValueAtTime(0.01, barTime + beatDuration * 3.8);

      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start(noteTrigger);
      bassOsc.stop(barTime + beatDuration * 4);
      oscillators.push(bassOsc);

      // 2. Chords / Pad voices
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
        noteGain.gain.exponentialRampToValueAtTime(0.08, actualStart + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, barTime + beatDuration * 3.8);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(actualStart);
        osc.stop(barTime + beatDuration * 4);
        oscillators.push(osc);
      });

      // 3. Rhythmic Kick & Snare Percussion
      if (song.genre !== 'Ambient') {
        for (let beat = 0; beat < 4; beat++) {
          const beatTime = barTime + beat * beatDuration;
          if (beatTime >= startTime + totalDuration) break;
          if (beatTime < ctx.currentTime) continue;

          // Kick on beats 0 and 2
          if (beat === 0 || beat === 2) {
            const kickOsc = ctx.createOscillator();
            const kickGain = ctx.createGain();
            kickOsc.frequency.setValueAtTime(150, beatTime);
            kickOsc.frequency.exponentialRampToValueAtTime(30, beatTime + 0.12);
            kickGain.gain.setValueAtTime(0.35, beatTime);
            kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);

            kickOsc.connect(kickGain);
            kickGain.connect(masterGain);
            kickOsc.start(beatTime);
            kickOsc.stop(beatTime + 0.2);
            oscillators.push(kickOsc);
          }

          // Snare on beat 2 (or 1 and 3)
          if (beat === 1 || beat === 3) {
            const snareNoise = ctx.createOscillator();
            const snareGain = ctx.createGain();
            snareNoise.type = 'triangle';
            snareNoise.frequency.setValueAtTime(220, beatTime);
            snareNoise.frequency.exponentialRampToValueAtTime(60, beatTime + 0.1);
            snareGain.gain.setValueAtTime(0.18, beatTime);
            snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.12);

            snareNoise.connect(snareGain);
            snareGain.connect(masterGain);
            snareNoise.start(beatTime);
            snareNoise.stop(beatTime + 0.15);
            oscillators.push(snareNoise);
          }
        }
      }
    };

    const numBars = Math.ceil(totalDuration / (beatDuration * 4));
    for (let bar = 0; bar < numBars; bar++) {
      playChordBar(bar);
    }

    // Interval ticker for progress bar
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

    activePlayback = {
      audioContext: ctx,
      gainNode: masterGain,
      stop,
    };

    return { stop, setVolume };
  },

  /**
   * Export synthesized audio to a downloadable WAV file
   */
  async exportSongWav(song: GeneratedSong): Promise<string> {
    const sampleRate = 44100;
    const duration = song.durationSeconds || 30;
    const OfflineCtxClass = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtxClass(2, sampleRate * duration, sampleRate);

    // Chords
    const chords = [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [130.81, 164.81, 196],
      [196, 246.94, 293.66],
    ];
    const bpm = song.tempoBpm || 120;
    const beatDuration = 60 / bpm;
    const numBars = Math.ceil(duration / (beatDuration * 4));

    for (let bar = 0; bar < numBars; bar++) {
      const barTime = bar * (beatDuration * 4);
      if (barTime >= duration) break;
      const chord = chords[bar % chords.length];

      // Bass
      const bass = offlineCtx.createOscillator();
      const bassGain = offlineCtx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(chord[0] / 2, barTime);
      bassGain.gain.setValueAtTime(0.2, barTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01, barTime + beatDuration * 3.5);
      bass.connect(bassGain);
      bassGain.connect(offlineCtx.destination);
      bass.start(barTime);
      bass.stop(barTime + beatDuration * 4);

      // Chords
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
    }

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWav(renderedBuffer);
    return URL.createObjectURL(wavBlob);
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
