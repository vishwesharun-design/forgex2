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
Every horizon is passing by

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

  /**
   * Synthesizes audio in real-time through Web Audio API
   */
  playSong(
    song: GeneratedSong,
    onTick?: (currentTime: number, duration: number) => void,
    onEnded?: () => void
  ): { stop: () => void } {
    this.stopPlayback();

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
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

    // Schedule musical loops across duration
    const startTime = ctx.currentTime;

    const playChordBar = (barIndex: number) => {
      if (isStopped) return;
      const chord = chords[barIndex % chords.length];
      const barTime = startTime + barIndex * (beatDuration * 4);

      if (barTime >= startTime + totalDuration) {
        return;
      }

      // 1. Bass note
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = song.genre === 'Synthwave' || song.genre === 'EDM' ? 'sawtooth' : 'triangle';
      bassOsc.frequency.setValueAtTime(chord[0] / 2, barTime);
      bassGain.gain.setValueAtTime(0.2, barTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01, barTime + beatDuration * 3.8);

      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start(barTime);
      bassOsc.stop(barTime + beatDuration * 4);
      oscillators.push(bassOsc);

      // 2. Chords / Pad voices
      chord.forEach((freq, noteIdx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = song.genre === 'Ambient' ? 'sine' : song.genre === 'Rock' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, barTime);

        // Arpeggiated or smooth pad
        const noteStart = song.genre === 'Synthwave' || song.genre === 'EDM'
          ? barTime + noteIdx * (beatDuration / 2)
          : barTime;
        
        noteGain.gain.setValueAtTime(0.001, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, barTime + beatDuration * 3.8);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(noteStart);
        osc.stop(barTime + beatDuration * 4);
        oscillators.push(osc);
      });

      // 3. Rhythmic Kick & Snare Percussion
      if (song.genre !== 'Ambient') {
        for (let beat = 0; beat < 4; beat++) {
          const beatTime = barTime + beat * beatDuration;
          if (beatTime >= startTime + totalDuration) break;

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

    activePlayback = {
      audioContext: ctx,
      gainNode: masterGain,
      stop,
    };

    return { stop };
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
