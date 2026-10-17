import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoomQueueActions } from '../../src/hooks/useRoomQueueActions';
import { useRoomPlayPause } from '../../src/hooks/useRoomPlayPause';
import { useQueueStore } from '../../src/store/useQueueStore';
import { usePlaybackStore } from '../../src/store/usePlaybackStore';
import { queueApi } from '../../src/api/queueApi';
import { playbackApi } from '../../src/api/playbackApi';

vi.mock('../../src/api/queueApi', () => ({
  queueApi: { getQueue: vi.fn(), moveQueueItem: vi.fn(() => Promise.resolve({ success: true })), removeFromQueue: vi.fn() },
}));
vi.mock('../../src/api/playbackApi', () => ({
  playbackApi: { updatePlaybackState: vi.fn(() => Promise.resolve({ success: true })) },
}));

// Guests reach these only when the room setting allows it; the guards must survive the move out of the pages
describe('room action hooks permission guards', () => {
  beforeEach(() => {
    vi.mocked(queueApi.moveQueueItem).mockClear();
    vi.mocked(playbackApi.updatePlaybackState).mockClear();
    useQueueStore.setState({ currentPlaying: null, queue: [{ id: 1 } as any, { id: 2 } as any] });
    usePlaybackStore.setState({ state: 'playing' });
  });

  it('ignores move and reorder when the guest may not reorder', async () => {
    const { result } = renderHook(() => useRoomQueueActions('ABC123', { canReorder: false }));
    await act(async () => {
      await result.current.handleMoveItem(2, 'up');
      await result.current.handleReorderItem(2, 1);
    });

    expect(queueApi.moveQueueItem).not.toHaveBeenCalled();
    expect(useQueueStore.getState().queue.map((q) => q.id)).toEqual([1, 2]);
  });

  it('lets the host reorder by default', async () => {
    const { result } = renderHook(() => useRoomQueueActions('ABC123'));
    await act(async () => {
      await result.current.handleReorderItem(2, 1);
    });

    expect(queueApi.moveQueueItem).toHaveBeenCalledWith('ABC123', 2, { target_position: 1 });
    expect(useQueueStore.getState().queue.map((q) => q.id)).toEqual([2, 1]);
  });

  it('ignores play/pause when the guest may not control playback', async () => {
    const { result } = renderHook(() => useRoomPlayPause('ABC123', { canControl: false }));
    await act(async () => {
      await result.current();
    });

    expect(playbackApi.updatePlaybackState).not.toHaveBeenCalled();
    expect(usePlaybackStore.getState().state).toBe('playing');
  });
});
