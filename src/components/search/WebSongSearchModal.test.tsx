import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WebSongSearchModal } from './WebSongSearchModal';
import { songApi } from '../../api/songApi';
import { queueApi } from '../../api/queueApi';

vi.mock('../../api/songApi', () => ({
  songApi: {
    searchSongs: vi.fn(),
  },
}));

vi.mock('../../api/queueApi', () => ({
  queueApi: {
    addToQueue: vi.fn(),
  },
}));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    () => ({ nickname: 'Tester', role: 'guest' }),
    { getState: () => ({ nickname: 'Tester', role: 'guest' }) }
  ),
}));

vi.mock('../../store/useQueueStore', () => ({
  useQueueStore: () => ({
    queue: [],
    currentPlaying: null,
    addToQueue: vi.fn(),
  }),
}));

const mockSong = (id: number, title: string) => ({
  id,
  externalVideoId: `vid_${id}`,
  title,
  artist: 'Karaoke Channel',
  durationFormatted: '04:00',
  durationSeconds: 240,
  thumbnailUrl: 'https://img.youtube.com/vi/abc/hqdefault.jpg',
  sourceProvider: 'youtube' as const,
});

describe('WebSongSearchModal quota-saving search behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(songApi.searchSongs).mockResolvedValue({
      success: true,
      data: [mockSong(1, 'Bohemian Rhapsody Karaoke')],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire live search requests while typing and only searches on explicit submit', async () => {
    vi.useFakeTimers();

    render(
      <WebSongSearchModal
        visible={true}
        roomCode="ABC123"
        onClose={vi.fn()}
      />
    );

    // Initial load of All Hits on first open
    await act(async () => {
      await Promise.resolve();
    });
    expect(songApi.searchSongs).toHaveBeenCalledTimes(1);
    expect(songApi.searchSongs).toHaveBeenLastCalledWith('', 'ABC123');

    const input = screen.getByPlaceholderText(/search by song name or artist/i);

    // Simulate user typing with >300ms pauses between chunks
    fireEvent.change(input, { target: { value: 'bo' } });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    fireEvent.change(input, { target: { value: 'bohemian' } });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    fireEvent.change(input, { target: { value: 'bohemian rhapsody' } });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // Zero extra API calls fired while typing
    expect(songApi.searchSongs).toHaveBeenCalledTimes(1);

    // Explicit form submit fires exactly one search request
    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await act(async () => {
      await Promise.resolve();
    });

    expect(songApi.searchSongs).toHaveBeenCalledTimes(2);
    expect(songApi.searchSongs).toHaveBeenLastCalledWith('bohemian rhapsody', 'ABC123');
  });

  it('reuses session cache when switching back to a previously fetched category chip', async () => {
    render(
      <WebSongSearchModal
        visible={true}
        roomCode="ABC123"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(songApi.searchSongs).toHaveBeenCalledTimes(1);
    });

    // Click Pop category chip -> 2nd API call
    fireEvent.click(screen.getByRole('button', { name: /Pop & Billboard/i }));
    await waitFor(() => {
      expect(songApi.searchSongs).toHaveBeenCalledTimes(2);
      expect(songApi.searchSongs).toHaveBeenLastCalledWith('Pop', 'ABC123');
    });

    // Switch back to All Hits -> served from in-memory cache (still 2 calls)
    fireEvent.click(screen.getByRole('button', { name: /All Hits/i }));
    await waitFor(() => {
      expect(songApi.searchSongs).toHaveBeenCalledTimes(2);
    });

    // Switch back to Pop -> served from in-memory cache (still 2 calls)
    fireEvent.click(screen.getByRole('button', { name: /Pop & Billboard/i }));
    await waitFor(() => {
      expect(songApi.searchSongs).toHaveBeenCalledTimes(2);
    });
  });

  it('does not queue the previously selected song when pressing Enter inside the search input', async () => {
    render(
      <WebSongSearchModal
        visible={true}
        roomCode="ABC123"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bohemian Rhapsody Karaoke')).toBeTruthy();
    });

    // Select a song first
    fireEvent.click(screen.getByRole('button', { name: /Queue/i }));
    expect(screen.getByRole('button', { name: /Confirm & Add/i })).toBeTruthy();

    // Focus search input, type a new query, and press Enter + submit form
    const input = screen.getByPlaceholderText(/search by song name or artist/i);
    fireEvent.change(input, { target: { value: 'hotel california' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(songApi.searchSongs).toHaveBeenLastCalledWith('hotel california', 'ABC123');
    });

    // Must not have queued the previously selected song
    expect(queueApi.addToQueue).not.toHaveBeenCalled();
  });
});
