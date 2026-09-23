import { SpotifyTrack } from '../types';
import { authService } from './authService';

function getFavoritesStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_spotify_favorites_${partition}`;
}

class SpotifyPlayerService {
  private audioElement: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying = false;
  private currentTrack: SpotifyTrack | null = null;
  private currentTime = 0;
  private duration = 0;
  private volume = 0.85;
  private isMuted = false;
  private isShuffled = false;
  private isRepeating = false;
  private isLoading = false;
  private playbackError: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private initAudioElement() {
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';
      this.audioElement.volume = this.volume;

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
          this.duration = this.audioElement.duration || (this.currentTrack?.durationSeconds || 30);
          this.notify();
        }
      });

      this.audioElement.addEventListener('playing', () => {
        this.isPlaying = true;
        this.isLoading = false;
        this.playbackError = null;
        this.notify();
      });

      this.audioElement.addEventListener('pause', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audioElement.addEventListener('waiting', () => {
        this.isLoading = true;
        this.notify();
      });

      this.audioElement.addEventListener('ended', () => {
        if (this.isRepeating && this.audioElement) {
          this.audioElement.currentTime = 0;
          this.audioElement.play().catch(console.error);
        } else {
          this.isPlaying = false;
          // Automatically rewind to 0 on track completion so clicking Play starts fresh
          if (this.audioElement) {
            this.audioElement.currentTime = 0;
          }
          this.currentTime = 0;
          this.notify();
        }
      });

      this.audioElement.addEventListener('error', (e) => {
        console.warn('Audio playback notice:', e);
        this.isLoading = false;
        this.notify();
      });
    }
  }

  private attachWebAudioVisualizer() {
    // Avoid createMediaElementSource on cross-origin audio URLs
    // The browser's Web Audio specification strictly silences cross-origin media elements that do not provide CORS headers.
    // AudioElement outputs cleanly and directly to the user's speakers without interference.
  }

  public async playTrack(track: SpotifyTrack, startAtSeconds = 0) {
    this.initAudioElement();

    if (!this.audioElement) return;

    this.currentTrack = track;
    this.isLoading = true;
    this.playbackError = null;
    this.currentTime = startAtSeconds;
    this.notify();

    // Determine real audio URL
    let streamUrl = track.audioUrl;

    // Fallback: If not provided on track, resolve dynamically via iTunes API
    if (!streamUrl) {
      try {
        const query = `${track.creator} ${track.title}`;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`);
        if (res.ok) {
          const data = await res.json();
          streamUrl = data.results?.[0]?.previewUrl;
        }
      } catch (err) {
        console.warn('Dynamic audio fetch fallback note:', err);
      }
    }

    if (streamUrl) {
      this.audioElement.src = streamUrl;
      this.audioElement.currentTime = startAtSeconds;
      try {
        await this.audioElement.play();
        this.isPlaying = true;
        this.isLoading = false;
        this.notify();
      } catch (err) {
        console.warn('Playback error, user gesture may be required:', err);
        this.isPlaying = false;
        this.isLoading = false;
        this.notify();
      }
    } else {
      this.isLoading = false;
      this.notify();
    }
  }

  public pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
    this.notify();
  }

  public resume() {
    if (this.audioElement && this.audioElement.src) {
      // If audio is at the end or within 0.5s of the end, reset to 0 so clicking play always starts playback
      const isAtEnd =
        this.audioElement.ended ||
        (this.duration > 0 && this.audioElement.currentTime >= this.duration - 0.5) ||
        (this.audioElement.duration > 0 && this.audioElement.currentTime >= this.audioElement.duration - 0.5);

      if (isAtEnd) {
        this.audioElement.currentTime = 0;
        this.currentTime = 0;
      }

      this.attachWebAudioVisualizer();
      this.audioElement.play().catch(console.error);
      this.isPlaying = true;
      this.notify();
    } else if (this.currentTrack) {
      const isAtEnd = this.duration > 0 && this.currentTime >= this.duration - 0.5;
      this.playTrack(this.currentTrack, isAtEnd ? 0 : this.currentTime);
    }
  }

  public togglePlayPause(track?: SpotifyTrack) {
    if (track && (!this.currentTrack || track.id !== this.currentTrack.id)) {
      this.playTrack(track, 0);
      return;
    }

    if (this.isPlaying) {
      this.pause();
    } else {
      // If at or near the end, rewind to zero first
      if (this.audioElement) {
        const isAtEnd =
          this.audioElement.ended ||
          (this.duration > 0 && this.audioElement.currentTime >= this.duration - 0.5) ||
          (this.audioElement.duration > 0 && this.audioElement.currentTime >= this.audioElement.duration - 0.5);
        if (isAtEnd) {
          this.audioElement.currentTime = 0;
          this.currentTime = 0;
        }
      }
      this.resume();
    }
  }

  public seek(seconds: number) {
    if (this.audioElement) {
      this.audioElement.currentTime = seconds;
      this.currentTime = seconds;
      this.notify();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
      this.audioElement.muted = this.isMuted;
    }
    this.notify();
  }

  public toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    this.notify();
  }

  public toggleRepeat() {
    this.isRepeating = !this.isRepeating;
    this.notify();
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTrack: this.currentTrack,
      currentTime: this.currentTime,
      duration: this.duration || (this.currentTrack?.durationSeconds || 30),
      volume: this.volume,
      isMuted: this.isMuted,
      isShuffled: this.isShuffled,
      isRepeating: this.isRepeating,
      playbackError: this.playbackError,
    };
  }

  // Favorites management
  public getFavorites(): string[] {
    try {
      const key = getFavoritesStorageKey();
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  public toggleFavorite(trackId: string): boolean {
    const favs = this.getFavorites();
    const index = favs.indexOf(trackId);
    let isFav = false;
    if (index === -1) {
      favs.push(trackId);
      isFav = true;
    } else {
      favs.splice(index, 1);
      isFav = false;
    }
    try {
      const key = getFavoritesStorageKey();
      localStorage.setItem(key, JSON.stringify(favs));
    } catch (e) {
      console.error(e);
    }
    this.notify();
    return isFav;
  }
}

export const spotifyPlayerService = new SpotifyPlayerService();
