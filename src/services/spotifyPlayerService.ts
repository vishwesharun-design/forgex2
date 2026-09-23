import { SpotifyTrack } from '../types';

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
      this.audioElement.crossOrigin = 'anonymous';
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
    try {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.8;

        if (this.audioElement && !this.sourceNode) {
          try {
            this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
          } catch (e) {
            // If already connected or cross-origin restricted, direct audio element handles sound
          }
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('Web Audio Visualizer initialization skipped:', e);
    }
  }

  public async playTrack(track: SpotifyTrack, startAtSeconds = 0) {
    this.initAudioElement();
    this.attachWebAudioVisualizer();

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
      this.attachWebAudioVisualizer();
      this.audioElement.play().catch(console.error);
      this.isPlaying = true;
      this.notify();
    } else if (this.currentTrack) {
      this.playTrack(this.currentTrack, this.currentTime);
    }
  }

  public togglePlayPause(track?: SpotifyTrack) {
    if (track && (!this.currentTrack || track.id !== this.currentTrack.id)) {
      this.playTrack(track);
      return;
    }

    if (this.isPlaying) {
      this.pause();
    } else {
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
      const saved = localStorage.getItem('forgex_spotify_favorites');
      return saved ? JSON.parse(saved) : ['feat-1', 'feat-2'];
    } catch {
      return ['feat-1', 'feat-2'];
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
      localStorage.setItem('forgex_spotify_favorites', JSON.stringify(favs));
    } catch (e) {
      console.error(e);
    }
    this.notify();
    return isFav;
  }
}

export const spotifyPlayerService = new SpotifyPlayerService();
