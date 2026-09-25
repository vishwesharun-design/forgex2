type StopHandler = () => void;

class PlaybackManager {
  private stopHandlers = new Map<string, StopHandler>();

  /**
   * Register a player's stop/pause handler.
   * Returns an unregister function.
   */
  public register(id: string, onStop: StopHandler): () => void {
    this.stopHandlers.set(id, onStop);
    return () => {
      this.stopHandlers.delete(id);
    };
  }

  /**
   * Notify that a particular audio source has started playing.
   * Immediately stops all other active audio playback across the entire app.
   */
  public notifyPlaying(activeId: string): void {
    this.stopHandlers.forEach((stopFn, id) => {
      if (id !== activeId) {
        try {
          stopFn();
        } catch (e) {
          console.warn(`[PlaybackManager] Notice stopping playback for ${id}:`, e);
        }
      }
    });
  }

  /**
   * Stop all playback across the app.
   */
  public stopAll(): void {
    this.stopHandlers.forEach((stopFn, id) => {
      try {
        stopFn();
      } catch (e) {
        console.warn(`[PlaybackManager] Notice stopping playback for ${id}:`, e);
      }
    });
  }
}

export const playbackManager = new PlaybackManager();
