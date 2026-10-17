import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HostPlayerPage } from '../../src/pages/HostPlayerPage';
import { GuestRoomPage } from '../../src/pages/GuestRoomPage';
import { useQueueStore } from '../../src/store/useQueueStore';
import { usePlaybackStore } from '../../src/store/usePlaybackStore';
import { useRoomStore } from '../../src/store/useRoomStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { queueApi } from '../../src/api/queueApi';
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
vi.mock('../../src/api/queueApi', () => ({
  queueApi: {
    getQueue: vi.fn(),
    moveQueueItem: vi.fn(() => Promise.resolve({ success: true })),
    removeFromQueue: vi.fn(() => Promise.resolve({ success: true })),
    addToQueue: vi.fn(),
  },
}));
vi.mock('../../src/api/roomApi', () => ({
  roomApi: new Proxy({}, { get: () => vi.fn(() => Promise.resolve({ success: true, data: null })) }),
}));

const GUEST_ID = 7;

const makeItem = (id: number, requestedBy = 5): KaraokeQueueItem =>
  ({
    id,
    roomId: 1,
    songId: id,
    requestedByMemberId: requestedBy,
    singerName: `Singer${id}`,
    position: id,
    status: 'queued',
    song: {
      id,
      externalVideoId: `vid${id}`,
      title: `Song ${id}`,
      artist: 'Artist',
      durationFormatted: '03:00',
      durationSeconds: 180,
      thumbnailUrl: '',
      sourceProvider: 'youtube',
    },
  }) as KaraokeQueueItem;

const nowPlaying = makeItem(99);
const queueIds = () => useQueueStore.getState().queue.map((q) => q.id);

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/host/:roomCode" element={<HostPlayerPage />} />
        <Route path="/room/:roomCode" element={<GuestRoomPage />} />
      </Routes>
    </MemoryRouter>
  );

// Characterization: pins how both room pages edit the queue and toggle playback (code review #3 refactor)
describe('room page queue and play/pause actions', () => {
  const desktopWidth = window.innerWidth;

  beforeEach(() => {
    // Phone layout renders the outside playback controls with a labelled Play / Pause button
    window.innerWidth = 390;
    vi.mocked(queueApi.moveQueueItem).mockReset().mockResolvedValue({ success: true } as any);
    vi.mocked(queueApi.removeFromQueue).mockReset().mockResolvedValue({ success: true } as any);
    vi.mocked(queueApi.getQueue).mockReset().mockResolvedValue({ success: true, data: [nowPlaying, makeItem(3), makeItem(1), makeItem(2)] } as any);
    vi.mocked(playbackApi.updatePlaybackState).mockReset().mockResolvedValue({ success: true } as any);
    useAuthStore.setState({ memberId: GUEST_ID, nickname: 'GuestUser' });
    useRoomStore.setState({
      currentRoom: { id: 1, code: 'ABC123', name: 'Room', status: 'active', settings: { allow_guest_reorder: true, allow_guest_playback_control: true } } as any,
      isConnected: true,
    });
    useQueueStore.setState({ currentPlaying: nowPlaying, queue: [makeItem(1, GUEST_ID), makeItem(2), makeItem(3)] });
    usePlaybackStore.setState({ state: 'playing', currentTimeSeconds: 0, currentTimeMeasuredAtMs: 0, syncAnchor: null });
  });

  afterEach(() => {
    cleanup();
    window.innerWidth = desktopWidth;
  });

  describe.each([
    ['host', '/host/ABC123'],
    ['guest', '/room/ABC123'],
  ])('%s page', (_role, path) => {
    beforeEach(() => {
      useAuthStore.setState({ role: _role as any });
    });

    it('moves an item optimistically and sends the direction', async () => {
      renderAt(path);
      fireEvent.click((await screen.findAllByTitle('Move up'))[0]);

      expect(queueIds()).toEqual([2, 1, 3]);
      await waitFor(() => expect(queueApi.moveQueueItem).toHaveBeenCalledWith('ABC123', 2, { direction: 'up' }));
      expect(queueApi.getQueue).not.toHaveBeenCalled();
    });

    it('re-reads the queue when a move fails, dropping the song on stage', async () => {
      vi.mocked(queueApi.moveQueueItem).mockRejectedValueOnce({ status: 403, message: 'HOST_ONLY' });
      renderAt(path);
      fireEvent.click((await screen.findAllByTitle('Move up'))[0]);

      await waitFor(() => expect(queueIds()).toEqual([3, 1, 2]));
      expect(queueApi.getQueue).toHaveBeenCalledWith('ABC123');
    });

    it('re-reads the queue when a confirmed remove fails', async () => {
      vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
      vi.mocked(queueApi.removeFromQueue).mockRejectedValueOnce({ status: 500, message: 'boom' });
      renderAt(path);
      fireEvent.click((await screen.findAllByTitle('Remove from queue'))[0]);

      await waitFor(() => expect(queueApi.removeFromQueue).toHaveBeenCalledWith('ABC123', 1));
      await waitFor(() => expect(queueIds()).toEqual([3, 1, 2]));
    });

    it('pauses optimistically and reports the paused position', async () => {
      renderAt(path);
      fireEvent.click((await screen.findAllByText('Pause'))[0]);

      expect(usePlaybackStore.getState().state).toBe('paused');
      expect(usePlaybackStore.getState().syncAnchor).toMatchObject({ queueItemId: 99, state: 'paused', positionSeconds: 0 });
      await waitFor(() => expect(playbackApi.updatePlaybackState).toHaveBeenCalledWith('ABC123', 'paused', 0, 99));
    });

    it('rolls play/pause back when the request fails', async () => {
      vi.mocked(playbackApi.updatePlaybackState).mockRejectedValueOnce({ status: 500, message: 'boom' });
      renderAt(path);
      fireEvent.click((await screen.findAllByText('Pause'))[0]);

      await waitFor(() => expect(usePlaybackStore.getState().state).toBe('playing'));
      expect(usePlaybackStore.getState().syncAnchor).toBeNull();
    });
  });

  it('gives a guest no move or play/pause controls when the room does not allow them', async () => {
    useRoomStore.setState({
      currentRoom: { id: 1, code: 'ABC123', name: 'Room', status: 'active', settings: { allow_guest_reorder: false, allow_guest_playback_control: false } } as any,
    });
    renderAt('/room/ABC123');

    expect(await screen.findAllByTitle('Remove from queue')).toHaveLength(1);
    expect(screen.queryByTitle('Move up')).toBeNull();
    expect(screen.queryByText('Pause')).toBeNull();
  });
});
