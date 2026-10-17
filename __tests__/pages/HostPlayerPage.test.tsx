import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HostPlayerPage } from '../../src/pages/HostPlayerPage';
import { useQueueStore } from '../../src/store/useQueueStore';
import { usePlaybackStore } from '../../src/store/usePlaybackStore';
import { playbackApi } from '../../src/api/playbackApi';
import type { KaraokeQueueItem } from '../../src/types';

vi.mock('../../src/hooks/useEchoRoom', () => ({ useEchoRoom: vi.fn() }));
vi.mock('../../src/api/playbackApi', () => ({
  playbackApi: {
    updatePlaybackState: vi.fn(() => Promise.resolve({ success: true })),
    getPlaybackState: vi.fn(() => Promise.resolve({ success: true, data: null })),
    nextSong: vi.fn(() => Promise.resolve({ success: true })),
    skipSong: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

const song: KaraokeQueueItem = {
  id: 99,
  roomId: 1,
  songId: 10,
  requestedByMemberId: 5,
  singerName: 'Alice',
  position: 1,
  status: 'playing',
  song: {
    id: 10,
    externalVideoId: 'xyz123',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    durationFormatted: '05:55',
    durationSeconds: 355,
    thumbnailUrl: 'https://example.com/thumb.jpg',
    sourceProvider: 'youtube',
  },
};

describe('HostPlayerPage position reports', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(playbackApi.updatePlaybackState).mockClear();
    useQueueStore.getState().setQueue([]);
    useQueueStore.getState().setCurrentPlaying(song);
    usePlaybackStore.getState().setState('playing');
    usePlaybackStore.getState().setCurrentTime(12);
  });

  afterEach(() => {
    vi.useRealTimers();
    useQueueStore.getState().setCurrentPlaying(null);
    usePlaybackStore.getState().setState('paused');
    usePlaybackStore.getState().resetPlayback();
  });

  const renderHost = () =>
    render(
      <MemoryRouter initialEntries={['/host/ABC123']}>
        <Routes>
          <Route path="/host/:roomCode" element={<HostPlayerPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('reports the live position right after playback starts, then every 30s', () => {
    renderHost();

    // Guests anchor a new song as 'buffering' and wait for this first report before they resync
    act(() => vi.advanceTimersByTime(600));
    expect(playbackApi.updatePlaybackState).toHaveBeenCalledTimes(1);
    expect(playbackApi.updatePlaybackState).toHaveBeenCalledWith('ABC123', 'playing', expect.any(Number), 99);
    expect(vi.mocked(playbackApi.updatePlaybackState).mock.calls[0][2]).toBeGreaterThanOrEqual(12);

    act(() => vi.advanceTimersByTime(20000));
    expect(playbackApi.updatePlaybackState).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(10000));
    expect(playbackApi.updatePlaybackState).toHaveBeenCalledTimes(2);
  });

  it('reports again right after a resume, so guests follow the host rather than whoever pressed play', () => {
    usePlaybackStore.getState().setState('paused');
    renderHost();
    act(() => vi.advanceTimersByTime(5000));
    expect(playbackApi.updatePlaybackState).not.toHaveBeenCalled();

    // A guest with playback control resumes the room; the host only receives the new state
    act(() => usePlaybackStore.getState().setState('playing'));
    act(() => vi.advanceTimersByTime(600));
    expect(playbackApi.updatePlaybackState).toHaveBeenCalledTimes(1);
  });

  it('stays quiet while the player has no position yet', () => {
    usePlaybackStore.getState().setCurrentTime(0);
    renderHost();
    act(() => vi.advanceTimersByTime(5000));
    expect(playbackApi.updatePlaybackState).not.toHaveBeenCalled();
  });
});
