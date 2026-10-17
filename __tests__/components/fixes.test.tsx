import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { WebQueueList } from '../../src/components/queue/WebQueueList';
import { WebSongSearchModal } from '../../src/components/search/WebSongSearchModal';
import { WebConnectionBanner } from '../../src/components/common/WebConnectionBanner';
import { WebToast } from '../../src/components/common/WebToast';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRoomStore } from '../../src/store/useRoomStore';
import { useQueueStore } from '../../src/store/useQueueStore';
import { songApi } from '../../src/api/songApi';
import { queueApi } from '../../src/api/queueApi';
import type { KaraokeQueueItem, Song } from '../../src/types';

vi.mock('../../src/api/songApi', () => ({ songApi: { searchSongs: vi.fn() } }));
vi.mock('../../src/api/queueApi', () => ({ queueApi: { addToQueue: vi.fn() } }));

const makeItem = (id: number): KaraokeQueueItem => ({
  id,
  roomId: 1,
  songId: id,
  requestedByMemberId: 5,
  singerName: `Singer${id}`,
  position: id + 1,
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
} as KaraokeQueueItem);

afterEach(() => cleanup());

describe('WebQueueList drag-and-drop + delete confirm (AC-12, AC-13)', () => {
  const queue = [makeItem(1), makeItem(2), makeItem(3)];

  it('dropping item #3 on position #1 requests target_position 1', () => {
    const onReorder = vi.fn();
    render(<WebQueueList queue={queue} canReorder isHost onReorder={onReorder} />);

    fireEvent.dragStart(screen.getByTestId('queue-row-3'));
    fireEvent.dragOver(screen.getByTestId('queue-row-1'));
    fireEvent.drop(screen.getByTestId('queue-row-1'));

    expect(onReorder).toHaveBeenCalledWith(3, 1);
  });

  it('does not allow dragging when reordering is not permitted', () => {
    const onReorder = vi.fn();
    render(<WebQueueList queue={queue} canReorder={false} onReorder={onReorder} />);
    fireEvent.dragStart(screen.getByTestId('queue-row-3'));
    fireEvent.drop(screen.getByTestId('queue-row-1'));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('removes an item only after the delete is confirmed', () => {
    const onRemove = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<WebQueueList queue={queue} isHost onRemoveItem={onRemove} />);

    confirmSpy.mockReturnValueOnce(false);
    fireEvent.click(screen.getAllByTitle('Remove from queue')[1]);
    expect(onRemove).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getAllByTitle('Remove from queue')[1]);
    expect(onRemove).toHaveBeenCalledWith(2);
  });
});

describe('WebSongSearchModal singer name (AC-10)', () => {
  const song: Song = {
    id: 5,
    externalVideoId: 'abc',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    durationFormatted: '05:55',
    durationSeconds: 355,
    thumbnailUrl: '',
    sourceProvider: 'youtube',
  } as Song;

  beforeEach(() => {
    useAuthStore.setState({ nickname: 'GuestUser' });
    vi.mocked(songApi.searchSongs).mockResolvedValue({ success: true, data: [song] } as any);
    vi.mocked(queueApi.addToQueue).mockResolvedValue({ success: true, data: makeItem(5) } as any);
  });

  it('defaults the singer name to the nickname and submits an edited value', async () => {
    render(<WebSongSearchModal visible roomCode="ABC123" onClose={() => {}} />);

    fireEvent.click(await screen.findByTitle('Queue this song'));

    const input = (await screen.findByLabelText('Singer Name')) as HTMLInputElement;
    expect(input.value).toBe('GuestUser');

    fireEvent.change(input, { target: { value: 'Duet Pair' } });
    fireEvent.click(screen.getByText(/Confirm & Add/));

    await waitFor(() =>
      expect(queueApi.addToQueue).toHaveBeenCalledWith('ABC123', { songId: 5, singerName: 'Duet Pair' })
    );
  });
});

describe('WebConnectionBanner (EC-04)', () => {
  it('shows an offline indicator only while disconnected', () => {
    useRoomStore.setState({ isConnected: false });
    const { rerender } = render(<WebConnectionBanner />);
    expect(screen.getByTestId('offline-indicator')).toBeTruthy();

    useRoomStore.setState({ isConnected: true });
    rerender(<WebConnectionBanner />);
    expect(screen.queryByTestId('offline-indicator')).toBeNull();
  });
});

describe('WebSongSearchModal after a successful add (Flow 2 step 4)', () => {
  const song: Song = {
    id: 5,
    externalVideoId: 'abc',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    durationFormatted: '05:55',
    durationSeconds: 355,
    thumbnailUrl: '',
    sourceProvider: 'youtube',
  } as Song;

  beforeEach(() => {
    // An earlier test's add leaves song 5 in the shared queue store, which hides its queue button
    useQueueStore.setState({ queue: [], currentPlaying: null });
    useAuthStore.setState({ nickname: 'GuestUser' });
    vi.mocked(songApi.searchSongs).mockResolvedValue({ success: true, data: [song] } as any);
    vi.mocked(queueApi.addToQueue).mockResolvedValue({ success: true, data: makeItem(5) } as any);
  });

  it('closes the modal and reports the queued song', async () => {
    const onClose = vi.fn();
    const onQueued = vi.fn();
    render(<WebSongSearchModal visible roomCode="ABC123" onClose={onClose} onQueued={onQueued} />);

    fireEvent.click(await screen.findByTitle('Queue this song'));
    fireEvent.click(screen.getByText(/Confirm & Add/));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onQueued).toHaveBeenCalledWith('Bohemian Rhapsody', 'GuestUser');
  });

  it('stays open and shows the error when the add fails', async () => {
    vi.mocked(queueApi.addToQueue).mockRejectedValueOnce({ message: 'You have reached the maximum allowed songs in queue.' });
    const onClose = vi.fn();
    render(<WebSongSearchModal visible roomCode="ABC123" onClose={onClose} />);

    fireEvent.click(await screen.findByTitle('Queue this song'));
    fireEvent.click(screen.getByText(/Confirm & Add/));

    expect(await screen.findByText(/maximum allowed songs/i)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('WebToast', () => {
  it('shows its message and hides itself after a few seconds', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<WebToast message='Added "Bohemian Rhapsody" for GuestUser' onDone={onDone} />);

    expect(screen.getByRole('status').textContent).toContain('Bohemian Rhapsody');
    act(() => vi.advanceTimersByTime(3000));
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('WebQueueList empty state (EC-02)', () => {
  it('tells the room the queue is empty and how to fill it', () => {
    render(<WebQueueList queue={[]} />);

    expect(screen.getByText('Queue is empty.')).toBeTruthy();
    expect(screen.getByText('Search songs to get the party started!')).toBeTruthy();
  });
});

describe('WebSongSearchModal Enter shortcut (code review #1)', () => {
  beforeEach(() => {
    useQueueStore.setState({ queue: [], currentPlaying: null });
    useAuthStore.setState({ nickname: 'GuestUser' });
    vi.mocked(songApi.searchSongs).mockResolvedValue({ success: true, data: [{ id: 5, externalVideoId: 'abc', title: 'Bohemian Rhapsody', artist: 'Queen', durationFormatted: '05:55', durationSeconds: 355, thumbnailUrl: '', sourceProvider: 'youtube' }] } as any);
    vi.mocked(queueApi.addToQueue).mockReset();
    vi.mocked(queueApi.addToQueue).mockResolvedValue({ success: true, data: makeItem(5) } as any);
  });

  it('submits the Singer Name as edited, not the default it opened with', async () => {
    render(<WebSongSearchModal visible roomCode="ABC123" onClose={() => {}} />);

    fireEvent.click(await screen.findByTitle('Queue this song'));
    fireEvent.change(await screen.findByLabelText('Singer Name'), { target: { value: 'Duet Pair' } });
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() =>
      expect(queueApi.addToQueue).toHaveBeenCalledWith('ABC123', { songId: 5, singerName: 'Duet Pair' })
    );
  });
});

describe('WebSongSearchModal after closing with a song selected (verify v4 #13)', () => {
  beforeEach(() => {
    useQueueStore.setState({ queue: [], currentPlaying: null });
    useAuthStore.setState({ nickname: 'GuestUser' });
    vi.mocked(songApi.searchSongs).mockResolvedValue({ success: true, data: [{ id: 5, externalVideoId: 'abc', title: 'Bohemian Rhapsody', artist: 'Queen', durationFormatted: '05:55', durationSeconds: 355, thumbnailUrl: '', sourceProvider: 'youtube' }] } as any);
    vi.mocked(queueApi.addToQueue).mockReset();
    vi.mocked(queueApi.addToQueue).mockResolvedValue({ success: true, data: makeItem(5) } as any);
  });

  it('does not queue the song when Enter is pressed after the modal closed', async () => {
    const { rerender } = render(<WebSongSearchModal visible roomCode="ABC123" onClose={() => {}} />);
    fireEvent.click(await screen.findByTitle('Queue this song'));

    rerender(<WebSongSearchModal visible={false} roomCode="ABC123" onClose={() => {}} />);
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });

    expect(queueApi.addToQueue).not.toHaveBeenCalled();
  });

  it('reopens with no song selected', async () => {
    const { rerender } = render(<WebSongSearchModal visible roomCode="ABC123" onClose={() => {}} />);
    fireEvent.click(await screen.findByTitle('Queue this song'));
    rerender(<WebSongSearchModal visible={false} roomCode="ABC123" onClose={() => {}} />);
    rerender(<WebSongSearchModal visible roomCode="ABC123" onClose={() => {}} />);

    expect(await screen.findByTitle('Queue this song')).toBeTruthy();
    expect(screen.queryByLabelText('Singer Name')).toBeNull();
  });
});
