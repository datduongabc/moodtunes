import {
  createAudioPlaylist,
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioPlaylist,
} from 'expo-audio';
import type { Song } from '@/domain/types';
import { CLIP_SECONDS } from '@/domain/game';

export type PlayerEvents = {
  onStatus: (s: {
    isPlaying: boolean;
    isBuffering: boolean;
    positionSec: number;
    durationSec: number;
    error: string | null;
  }) => void;
  onIndex: (index: number) => void;
};

const meta = (s: Song) => ({
  title: s.title,
  artist: s.artistName,
  albumTitle: s.albumName ?? undefined,
  artworkUrl: s.imageUrl ?? undefined,
});

/**
 * PlayerService (CMP-APP-03). Wraps an expo-audio playlist: background playback, lock-screen
 * controls with next and previous, and exclusive audio focus so calls pause playback (AC-03.2.*).
 */
class PlayerServiceImpl {
  private playlist: AudioPlaylist | null = null;
  private clip: AudioPlayer | null = null;
  private clipTimer: ReturnType<typeof setTimeout> | null = null;
  private songs: Song[] = [];
  private pendingRestore: { songs: Song[]; index: number; positionSec: number } | null = null;
  private events: PlayerEvents | null = null;
  private ready: Promise<void> | null = null;

  init(events: PlayerEvents): Promise<void> {
    this.events = events;
    if (!this.ready) {
      this.ready = (async () => {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
        this.playlist = createAudioPlaylist({ loop: 'none', updateInterval: 1000 });
        this.playlist.addListener('playlistStatusUpdate', (st) => {
          this.events?.onStatus({
            isPlaying: st.playing,
            isBuffering: st.isBuffering,
            positionSec: st.currentTime,
            durationSec: st.duration,
            error: null,
          });
        });
        this.playlist.addListener('trackChanged', ({ currentIndex }) => {
          this.events?.onIndex(currentIndex);
          const song = this.songs[currentIndex];
          if (song) this.playlist?.updateLockScreenMetadata(meta(song));
        });
      })();
    }
    return this.ready;
  }

  /** Stores a persisted queue to be loaded lazily on first playback interaction after cold start. */
  setRestored(songs: Song[], index: number, positionSec: number) {
    if (songs.length === 0) {
      this.pendingRestore = null;
      return;
    }
    const clampedIndex = Math.max(0, Math.min(index, songs.length - 1));
    this.pendingRestore = { songs, index: clampedIndex, positionSec: Math.max(0, positionSec) };
  }

  private async ensureRestored(): Promise<void> {
    if (!this.pendingRestore) return;
    const { songs, index, positionSec } = this.pendingRestore;
    this.pendingRestore = null;
    await this.ready;
    const p = this.playlist;
    if (!p || songs.length === 0) return;
    this.songs = songs;
    p.clear();
    for (const s of songs) p.add({ uri: s.audioUrl, name: s.title });
    p.skipTo(index);
    if (positionSec > 0) p.seekTo(positionSec);
    p.setActiveForLockScreen(true, meta(songs[index]), { showNextTrack: true, showPreviousTrack: true });
    this.events?.onIndex(index);
  }

  /** Starts a list; the following songs form the queue (AC-03.3.1). */
  async playList(songs: Song[], startIndex: number): Promise<void> {
    this.pendingRestore = null;
    await this.ready;
    const p = this.playlist;
    if (!p || songs.length === 0) return;
    this.stopClip();
    this.songs = songs;
    p.clear();
    for (const s of songs) p.add({ uri: s.audioUrl, name: s.title });
    p.skipTo(startIndex);
    p.setActiveForLockScreen(true, meta(songs[startIndex]), { showNextTrack: true, showPreviousTrack: true });
    p.play();
    this.events?.onIndex(startIndex);
  }

  async play() {
    this.stopClip();
    if (this.pendingRestore) await this.ensureRestored();
    this.playlist?.play();
  }
  pause() {
    this.playlist?.pause();
  }
  async next() {
    if (this.pendingRestore) await this.ensureRestored();
    this.playlist?.next();
  }
  async previous() {
    if (this.pendingRestore) await this.ensureRestored();
    const p = this.playlist;
    if (!p) return;
    if (p.currentTime > 3) p.seekTo(0);
    else p.previous();
  }
  async seekTo(sec: number) {
    if (this.pendingRestore) await this.ensureRestored();
    this.playlist?.seekTo(sec);
  }

  removeAt(index: number) {
    if (this.pendingRestore) {
      this.pendingRestore.songs.splice(index, 1);
      if (this.pendingRestore.songs.length === 0) {
        this.pendingRestore = null;
      } else if (index < this.pendingRestore.index) {
        this.pendingRestore.index--;
      } else if (this.pendingRestore.index >= this.pendingRestore.songs.length) {
        this.pendingRestore.index = this.pendingRestore.songs.length - 1;
      }
      return;
    }
    this.songs.splice(index, 1);
    this.playlist?.remove(index);
  }

  /** Game clip: 15 seconds of one song, with the main playlist paused (AC-11.1.1). */
  playClip(song: Song, startSec: number) {
    this.playlist?.pause();
    this.stopClip();
    this.clip = createAudioPlayer({ uri: song.audioUrl });
    this.clip.seekTo(startSec);
    this.clip.play();
    this.clipTimer = setTimeout(() => this.stopClip(), CLIP_SECONDS * 1000);
  }

  stopClip() {
    if (this.clipTimer) clearTimeout(this.clipTimer);
    this.clipTimer = null;
    this.clip?.remove();
    this.clip = null;
  }

  reset() {
    this.pendingRestore = null;
    this.stopClip();
    this.songs = [];
    this.playlist?.clear();
    this.playlist?.clearLockScreenControls();
  }
}

export const PlayerService = new PlayerServiceImpl();
