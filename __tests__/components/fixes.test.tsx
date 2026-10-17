import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { WebQueueList } from '../../src/components/queue/WebQueueList';
import { WebSongSearchModal } from '../../src/components/search/WebSongSearchModal';
import { WebConnectionBanner } from '../../src/components/common/WebConnectionBanner';
import { WebToast } from '../../src/components/common/WebToast';
import { WebPlaybackControls } from '../../src/components/player/WebPlaybackControls';
import { WebSongDetailsModal } from '../../src/components/player/WebSongDetailsModal';
import { WebQueueItemCard } from '../../src/components/queue/WebQueueItemCard';
import { WebNextUpCard } from '../../src/components/player/WebNextUpCard';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRoomStore } from '../../src/store/useRoomStore';
import { useQueueStore } from '../../src/store/useQueueStore';
import { songApi } from '../../src/api/songApi';
import { queueApi } from '../../src/api/queueApi';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { JoinRoomPage } from '../../src/pages/JoinRoomPage';
import { GuestRoomPage } from '../../src/pages/GuestRoomPage';
import { HostPlayerPage } from '../../src/pages/HostPlayerPage';
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

  it('queues the song directly with the user nickname without an editable singer name input', async () => {
    render(<WebSongSearchModal visible roomCode="ABC123" onClose={() => {}} />);

    fireEvent.click(await screen.findByTitle('Queue this song'));

    expect(screen.queryByLabelText('Singer Name')).toBeNull();
    fireEvent.click(screen.getByText(/Confirm & Add/));

    await waitFor(() =>
      expect(queueApi.addToQueue).toHaveBeenCalledWith('ABC123', { songId: 5, singerName: 'GuestUser' })
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

  it('submits the song with user nickname on Enter key', async () => {
    render(<WebSongSearchModal visible roomCode="ABC123" onClose={() => {}} />);

    fireEvent.click(await screen.findByTitle('Queue this song'));
    expect(screen.queryByLabelText('Singer Name')).toBeNull();
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() =>
      expect(queueApi.addToQueue).toHaveBeenCalledWith('ABC123', { songId: 5, singerName: 'GuestUser' })
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

describe('WebPlaybackControls text contrast (design review v1 #1)', () => {
  it('uses accessible text-[#94A3B8] contrast for idle status and waiting text', () => {
    const { getByText } = render(
      <WebPlaybackControls
        currentSong={null}
        playbackState="idle"
      />
    );

    const liveBadge = getByText('QueueMic Live');
    expect(liveBadge.className).toContain('text-[#94A3B8]');
    expect(liveBadge.className).not.toContain('text-[#64748B]');

    const waitingText = getByText('Waiting for the next song to start...');
    expect(waitingText.className).toContain('text-[#94A3B8]');
    expect(waitingText.className).not.toContain('text-[#64748B]');
  });

  it('renders animated equalizer wave bars when song is playing (Modern Idea #1)', () => {
    const { container } = render(
      <WebPlaybackControls
        currentSong={makeItem(1)}
        playbackState="playing"
      />
    );

    expect(container.querySelector('.animate-equalizer-1')).toBeTruthy();
    expect(container.querySelector('.animate-equalizer-2')).toBeTruthy();
    expect(container.querySelector('.animate-equalizer-3')).toBeTruthy();
  });
});

describe('WebQueueList drop target visual indicator (design review v1 #3 & Modern Idea #3)', () => {
  it('highlights the hovered row with a drop insertion line while dragging', () => {
    const queue = [makeItem(1), makeItem(2)];
    const onReorder = vi.fn();
    const { getByTestId } = render(
      <WebQueueList
        queue={queue}
        canReorder={true}
        onReorder={onReorder}
      />
    );

    const row1 = getByTestId('queue-row-1');
    const row2 = getByTestId('queue-row-2');

    // Start drag on row 1
    fireEvent.dragStart(row1);
    expect(row1.className).toContain('opacity-50');

    // Drag over row 2
    fireEvent.dragOver(row2);
    expect(row2.className).toContain('border-t-2');
    expect(row2.className).toContain('border-[#06B6D4]');

    // Drag leave row 2
    fireEvent.dragLeave(row2);
    expect(row2.className).not.toContain('border-t-2');

    // Drag end resets everything
    fireEvent.dragEnd(row1);
    expect(row1.className).not.toContain('opacity-50');
  });
});

describe('WebSongDetailsModal & Song click-to-view details feature', () => {
  const item = makeItem(1);

  it('renders all song details (thumbnail, title, artist, singer, duration, source) and handles close', () => {
    const onClose = vi.fn();
    const { getByText } = render(
      <WebSongDetailsModal
        visible={true}
        songItem={item}
        onClose={onClose}
        badgeLabel="NOW PLAYING 🔴"
        badgeColor="success"
      />
    );

    expect(getByText('NOW PLAYING 🔴')).toBeTruthy();
    expect(getByText('Song 1')).toBeTruthy();
    expect(getByText('Artist')).toBeTruthy();
    expect(getByText('Singer1')).toBeTruthy();
    expect(getByText('⏱ 03:00')).toBeTruthy();
    expect(getByText('YouTube Karaoke')).toBeTruthy();

    const closeBtn = getByText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking a queue card opens WebSongDetailsModal with queue position', () => {
    const { getByText, queryByText } = render(
      <WebQueueItemCard item={item} />
    );

    expect(queryByText('Singer on Stage')).toBeNull();

    // Click on the song item card
    fireEvent.click(getByText('Song 1'));

    expect(getByText('QUEUE #2')).toBeTruthy();
    expect(getByText('Singer on Stage')).toBeTruthy();
    expect(getByText('Singer1')).toBeTruthy();

    // Close the modal
    fireEvent.click(getByText('Close'));
    expect(queryByText('Singer on Stage')).toBeNull();
  });

  it('clicking current song in WebPlaybackControls opens WebSongDetailsModal', () => {
    const { getByText, queryByText } = render(
      <WebPlaybackControls
        currentSong={item}
        playbackState="playing"
        isHost={true}
        showOutsideControls={true}
      />
    );

    expect(queryByText('Singer on Stage')).toBeNull();

    // Click on the song title
    fireEvent.click(getByText('Song 1'));

    expect(getByText('NOW PLAYING 🔴')).toBeTruthy();
    expect(getByText('Singer on Stage')).toBeTruthy();

    // Close
    fireEvent.click(getByText('Close'));
    expect(queryByText('Singer on Stage')).toBeNull();
  });

  it('clicking next up song in WebNextUpCard opens WebSongDetailsModal', () => {
    const { getByText, queryByText } = render(
      <WebNextUpCard nextSong={item} />
    );

    expect(queryByText('Singer on Stage')).toBeNull();

    // Click on the song title
    fireEvent.click(getByText('Song 1'));

    expect(getByText('UP NEXT ⚡')).toBeTruthy();
    expect(getByText('Singer on Stage')).toBeTruthy();

    // Close
    fireEvent.click(getByText('Close'));
    expect(queryByText('Singer on Stage')).toBeNull();
  });
});

describe('JoinRoomPage QR Scanner card', () => {
  it('renders "Or Scan TV QR Code" card and opens the WebQRScannerModal', () => {
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <JoinRoomPage />
      </MemoryRouter>
    );

    expect(getByText('Or Scan TV QR Code')).toBeTruthy();
    expect(getByText('⚡️ Open QR Camera Scanner')).toBeTruthy();
    expect(queryByText('Scan Host TV QR')).toBeNull();

    // Verify it is hidden on desktop/web view (lg:hidden) and only shown in mobile view
    const scannerContainer = getByText('Or Scan TV QR Code').closest('.lg\\:hidden');
    expect(scannerContainer).toBeTruthy();

    // Click scanner button
    fireEvent.click(getByText('⚡️ Open QR Camera Scanner'));

    expect(getByText('Scan Host TV QR')).toBeTruthy();
    expect(getByText('Point camera at TV screen')).toBeTruthy();

    // Click Cancel
    fireEvent.click(getByText('Cancel'));
    expect(queryByText('Scan Host TV QR')).toBeNull();
  });
});

describe('GuestRoomPage direct URL validation', () => {
  afterEach(() => {
    useAuthStore.setState({ memberId: null, token: null });
    useRoomStore.setState({ currentRoom: null });
  });

  it('redirects to home (/) if a user types /room/DXCHJJ directly without being an official member', () => {
    useAuthStore.setState({ memberId: null, token: null });
    useRoomStore.setState({ currentRoom: null });

    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={['/room/DXCHJJ']}>
        <Routes>
          <Route path="/" element={<div>Home Page Redirected</div>} />
          <Route path="/room/:roomCode" element={<GuestRoomPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to Home
    expect(getByText('Home Page Redirected')).toBeTruthy();
    expect(queryByText('Up Next in Queue')).toBeNull();
  });

  it('redirects to home (/) if a member of ABC123 tries to enter /room/DXCHJJ', () => {
    useAuthStore.setState({ memberId: 99, token: 'some-token' });
    useRoomStore.setState({
      currentRoom: { id: 1, code: 'ABC123', name: 'Other Room', status: 'active', settings: {} } as any,
    });

    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={['/room/DXCHJJ']}>
        <Routes>
          <Route path="/" element={<div>Home Page Redirected</div>} />
          <Route path="/room/:roomCode" element={<GuestRoomPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('Home Page Redirected')).toBeTruthy();
    expect(queryByText('Up Next in Queue')).toBeNull();
  });

  it('allows access if user officially joined DXCHJJ (has memberId and currentRoom.code matching DXCHJJ)', () => {
    useAuthStore.setState({ memberId: 10, token: 'token-dxchjj', nickname: 'Singer10' });
    useRoomStore.setState({
      currentRoom: { id: 2, code: 'DXCHJJ', name: 'Party Room', status: 'active', settings: {} } as any,
    });
    useQueueStore.setState({ queue: [], currentPlaying: null });

    const { getByText, getAllByText, queryByText } = render(
      <MemoryRouter initialEntries={['/room/DXCHJJ']}>
        <Routes>
          <Route path="/" element={<div>Home Page Redirected</div>} />
          <Route path="/room/:roomCode" element={<GuestRoomPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(queryByText('Home Page Redirected')).toBeNull();
    expect(getByText('Party Room')).toBeTruthy();
    expect(getAllByText('DXCHJJ').length).toBeGreaterThan(0);
  });
});

describe('HostPlayerPage direct URL validation (code review v3 Finding #5)', () => {
  afterEach(() => {
    useAuthStore.setState({ memberId: null, token: null, role: null });
    useRoomStore.setState({ currentRoom: null });
  });

  it('redirects to home (/) if a user types /host/DXCHJJ directly without an official host session', () => {
    useAuthStore.setState({ memberId: null, token: null, role: null });
    useRoomStore.setState({ currentRoom: null });

    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={['/host/DXCHJJ']}>
        <Routes>
          <Route path="/" element={<div>Home Page Redirected</div>} />
          <Route path="/host/:roomCode" element={<HostPlayerPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('Home Page Redirected')).toBeTruthy();
    expect(queryByText('Host Room')).toBeNull();
  });

  it('redirects to home (/) if a guest tries to access /host/DXCHJJ', () => {
    useAuthStore.setState({ memberId: 10, token: 'token-guest', role: 'guest' });
    useRoomStore.setState({
      currentRoom: { id: 2, code: 'DXCHJJ', name: 'Party Room', status: 'active', settings: {} } as any,
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/host/DXCHJJ']}>
        <Routes>
          <Route path="/" element={<div>Home Page Redirected</div>} />
          <Route path="/host/:roomCode" element={<HostPlayerPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('Home Page Redirected')).toBeTruthy();
  });
});

describe('WebSongSearchModal fallback singer nickname (code review v3 Finding #6)', () => {
  beforeEach(() => {
    useQueueStore.setState({ queue: [], currentPlaying: null });
    vi.mocked(songApi.searchSongs).mockResolvedValue({
      success: true,
      data: [{ id: 5, externalVideoId: 'abc', title: 'Bohemian Rhapsody', artist: 'Queen', durationFormatted: '05:55', durationSeconds: 355, thumbnailUrl: '', sourceProvider: 'youtube' }],
    } as any);
    vi.mocked(queueApi.addToQueue).mockReset();
    vi.mocked(queueApi.addToQueue).mockResolvedValue({ success: true, data: makeItem(5) } as any);
  });

  it('submits with fallback "Singer" when guest has empty nickname', async () => {
    useAuthStore.setState({ nickname: '', role: 'guest' });

    render(<WebSongSearchModal visible roomCode="ABC123" onClose={() => {}} />);
    fireEvent.click(await screen.findByTitle('Queue this song'));
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() =>
      expect(queueApi.addToQueue).toHaveBeenCalledWith('ABC123', { songId: 5, singerName: 'Singer' })
    );
  });
});
