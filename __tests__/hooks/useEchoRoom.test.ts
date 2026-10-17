import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEchoRoom } from '../../src/hooks/useEchoRoom';
import { roomApi } from '../../src/api/roomApi';

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
