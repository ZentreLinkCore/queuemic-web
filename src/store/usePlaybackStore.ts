import { create } from 'zustand';
import type { PlaybackState, PlaybackSyncAnchor } from '../types';

interface PlaybackStoreState {
  state: PlaybackState;
  currentTimeSeconds: number;
  /** Local Date.now() of the player report behind currentTimeSeconds */
  currentTimeMeasuredAtMs: number;
  durationSeconds: number;
  seekTarget: number | null;
  syncAnchor: PlaybackSyncAnchor | null;
  isFullscreen: boolean;
  volume: number;
  setState: (state: PlaybackState) => void;
  setCurrentTime: (currentTimeSeconds: number) => void;
  setSeekTarget: (seekTarget: number | null) => void;
  setSyncAnchor: (syncAnchor: PlaybackSyncAnchor | null) => void;
  setDuration: (durationSeconds: number) => void;
  resetPlayback: () => void;
  togglePlayPause: () => void;
  toggleFullscreen: () => void;
  setFullscreen: (isFullscreen: boolean) => void;
}

export const usePlaybackStore = create<PlaybackStoreState>((set) => ({
  state: 'paused',
  currentTimeSeconds: 0,
  currentTimeMeasuredAtMs: 0,
  durationSeconds: 0,
  seekTarget: null,
  syncAnchor: null,
  isFullscreen: false,
  volume: 1.0,
  setState: (state) => set({ state }),
  setCurrentTime: (currentTimeSeconds) => set({ currentTimeSeconds, currentTimeMeasuredAtMs: Date.now() }),
  setSeekTarget: (seekTarget) => set({ seekTarget }),
  setSyncAnchor: (syncAnchor) => set({ syncAnchor }),
  setDuration: (durationSeconds) => set({ durationSeconds }),
  resetPlayback: () => set({ currentTimeSeconds: 0, durationSeconds: 0, seekTarget: null }),
  togglePlayPause: () =>
    set((s) => ({ state: s.state === 'playing' ? 'paused' : 'playing' })),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
}));

/** This device's player position right now — timeupdates are up to 500ms old, so extrapolate while playing */
export const getLivePlaybackPosition = (): number => {
  const { state, currentTimeSeconds, currentTimeMeasuredAtMs } = usePlaybackStore.getState();
  if (state !== 'playing' || !currentTimeMeasuredAtMs) return currentTimeSeconds;
  return currentTimeSeconds + (Date.now() - currentTimeMeasuredAtMs) / 1000;
};
