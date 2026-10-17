import { useQueueStore } from '../store/useQueueStore';
import { usePlaybackStore, getLivePlaybackPosition } from '../store/usePlaybackStore';
import { playbackApi } from '../api/playbackApi';
import { runOptimistic } from '../utils/optimistic';

export interface UseRoomPlayPauseOptions {
  /** Guests may toggle playback only when the room allows it; the host always can */
  canControl?: boolean;
}

/**
 * Play / pause shared by the Host and Guest room pages: the store and sync anchor flip at once and roll back to
 * the previous state when the request fails (spec §8 "Optimistic … Rollback state on failure").
 */
export function useRoomPlayPause(roomCode: string, { canControl = true }: UseRoomPlayPauseOptions = {}) {
  const { currentPlaying } = useQueueStore();
  const {
    state: playbackState,
    currentTimeSeconds,
    syncAnchor,
    setState: setPlaybackState,
    setCurrentTime,
    setSyncAnchor,
  } = usePlaybackStore();

  return async () => {
    if (!canControl) return;
    const nextState = playbackState === 'playing' ? 'paused' : 'playing';
    const position = Math.max(0, Math.round(getLivePlaybackPosition() * 100) / 100);
    const prev = { state: playbackState, time: currentTimeSeconds, anchor: syncAnchor };
    await runOptimistic(
      () => {
        setPlaybackState(nextState);
        setCurrentTime(position);
        setSyncAnchor({
          queueItemId: currentPlaying?.id ?? null,
          state: nextState,
          positionSeconds: position,
          receivedAtMs: Date.now(),
        });
      },
      () => {
        setPlaybackState(prev.state);
        setCurrentTime(prev.time);
        setSyncAnchor(prev.anchor);
      },
      () => playbackApi.updatePlaybackState(roomCode, nextState, position, currentPlaying?.id)
    );
  };
}
