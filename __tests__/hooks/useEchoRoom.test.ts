import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEchoRoom } from '../../src/hooks/useEchoRoom';
import { roomApi } from '../../src/api/roomApi';
import { playbackApi } from '../../src/api/playbackApi';
import { usePlaybackStore } from '../../src/store/usePlaybackStore';
import { useQueueStore } from '../../src/store/useQueueStore';

const channel: any = {};
channel.here = () => channel;
channel.joining = () => channel;
channel.leaving = () => channel;
channel.error = () => channel;
channel.listen = () => channel;

vi.mock('../../src/services/echo', () => ({
  getEcho: () => ({
    join: () => channel,
    leave: () => {},
    connector: { pusher: { connection: { state: 'connected', bind: () => {}, unbind: () => {} } } },
  }),
  onEchoReset: () => () => {},
}));
vi.mock('../../src/services/serverClock', () => ({
  syncServerClock: () => Promise.resolve(),
  toLocalTime: (ms: number) => ms,
}));
vi.mock('../../src/api/queueApi', () => ({
  queueApi: { getQueue: vi.fn(() => Promise.resolve({ success: true, data: [] })) },
}));
vi.mock('../../src/api/playbackApi', () => ({
  playbackApi: {
    getPlaybackState: vi.fn(() => Promise.resolve({ success: true, data: null })),
    updatePlaybackState: vi.fn(() => Promise.resolve({ success: true })),
    nextSong: vi.fn(() => Promise.resolve({ success: true })),
  },
}));
vi.mock('../../src/api/roomApi', () => ({
  roomApi: {
    getRoomDetails: vi.fn(() => Promise.resolve({ success: false })),
    getRoomMembers: vi.fn(() => Promise.resolve({ success: false })),
    heartbeat: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('useEchoRoom presence heartbeat (AC-14, code review #4)', () => {
  let visibility: DocumentVisibilityState = 'visible';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(roomApi.heartbeat).mockClear();
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (document as any).visibilityState;
  });

  it('keeps a guest in a hidden tab connected with a heartbeat every 60 s', async () => {
    visibility = 'hidden';
    const { unmount } = renderHook(() => useEchoRoom('ABC123', false));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_000);
    });
    expect(roomApi.heartbeat).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(roomApi.heartbeat).toHaveBeenCalledTimes(1);
    expect(roomApi.heartbeat).toHaveBeenCalledWith('ABC123');

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(roomApi.heartbeat).toHaveBeenCalledTimes(1);
  });
});

describe('useEchoRoom guest re-sync from the server', () => {
  // The host's own report, received 5s ago at 40s: the room is at 45s now
  const hostAnchor = () => ({ queueItemId: 99, state: 'playing' as const, positionSeconds: 40, receivedAtMs: Date.now() - 5000 });
  const serverSays = (currentTimeSeconds: number, positionAgeMs: number) =>
    vi.mocked(playbackApi.getPlaybackState).mockResolvedValueOnce({
      success: true,
      data: {
        id: 99,
        status: 'playing',
        playback_state: 'playing',
        current_time_seconds: currentTimeSeconds,
        position_age_ms: positionAgeMs,
        song: { id: 10, external_video_id: 'xyz123', title: 'Song', duration_seconds: 355 },
      },
    } as any);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    useQueueStore.getState().setCurrentPlaying(null);
    usePlaybackStore.getState().setSyncAnchor(null);
    usePlaybackStore.getState().setState('paused');
  });

  it("keeps the host's own report when the server's whole-second copy agrees with it", async () => {
    const anchor = hostAnchor();
    usePlaybackStore.getState().setSyncAnchor(anchor);
    serverSays(44, 1800);

    const { unmount } = renderHook(() => useEchoRoom('ABC123', false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(usePlaybackStore.getState().syncAnchor).toBe(anchor);
    unmount();
  });

  it("takes the server's position when it disagrees, as after a missed host seek", async () => {
    usePlaybackStore.getState().setSyncAnchor(hostAnchor());
    serverSays(90, 1000);

    const { unmount } = renderHook(() => useEchoRoom('ABC123', false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(usePlaybackStore.getState().syncAnchor?.positionSeconds).toBeCloseTo(91, 3);
    unmount();
  });
});
