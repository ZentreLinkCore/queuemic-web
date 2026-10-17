import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { WebVideoPlayer, getExpectedPosition } from '../../src/components/player/WebVideoPlayer';
import { KaraokeQueueItem, PlaybackSyncAnchor } from '../../src/types';

describe('WebVideoPlayer and synchronization logic', () => {
  it('calculates expected position from sync anchor correctly when playing', () => {
    const receivedAtMs = Date.now() - 2500; // 2.5 seconds ago
    const anchor: PlaybackSyncAnchor = {
      queueItemId: 1,
      state: 'playing',
      positionSeconds: 30,
      receivedAtMs,
    };

    const expected = getExpectedPosition(anchor);
    // Should be approximately 30 + 2.5 = 32.5s
    expect(expected).toBeGreaterThanOrEqual(32.4);
    expect(expected).toBeLessThanOrEqual(32.7);
  });

  it('keeps static position from sync anchor when paused', () => {
    const receivedAtMs = Date.now() - 5000; // 5 seconds ago
    const anchor: PlaybackSyncAnchor = {
      queueItemId: 1,
      state: 'paused',
      positionSeconds: 45,
      receivedAtMs,
    };

    const expected = getExpectedPosition(anchor);
    expect(expected).toBe(45);
  });

  it('renders standby state when currentSong is null', () => {
    render(
      <WebVideoPlayer
        currentSong={null}
        playbackState="stopped"
      />
    );

    expect(screen.getByText(/STAGE IS READY/i)).toBeDefined();
    expect(screen.getByText(/Add songs to the QueueMic queue/i)).toBeDefined();
  });

  it('renders song info and controls when currentSong is active', () => {
    const mockSong: KaraokeQueueItem = {
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

    render(
      <WebVideoPlayer
        currentSong={mockSong}
        playbackState="playing"
        currentTimeSeconds={60}
        durationSeconds={355}
        onPlayPause={vi.fn()}
      />
    );

    expect(screen.getByText(/Bohemian Rhapsody/i)).toBeDefined();
    expect(screen.getByText(/Queen/i)).toBeDefined();
    expect(screen.getByText(/ALICE/i)).toBeDefined();
  });

  it('triggers onToggleFullscreen when double-clicking video on standby stage', () => {
    const onToggleFullscreen = vi.fn();
    render(
      <WebVideoPlayer
        currentSong={null}
        playbackState="stopped"
        onToggleFullscreen={onToggleFullscreen}
      />
    );

    const standbyWrapper = screen.getByText(/STAGE IS READY/i).closest('div');
    if (standbyWrapper) {
      standbyWrapper.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }

    expect(onToggleFullscreen).toHaveBeenCalled();
  });

  it('triggers onToggleFullscreen when double-clicking video frame during playback', () => {
    const onToggleFullscreen = vi.fn();
    const mockSong: KaraokeQueueItem = {
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

    render(
      <WebVideoPlayer
        currentSong={mockSong}
        playbackState="playing"
        currentTimeSeconds={60}
        durationSeconds={355}
        onToggleFullscreen={onToggleFullscreen}
      />
    );

    const videoSurface = screen.getByTitle(/click to pause • double-click for fullscreen/i);
    videoSurface.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(onToggleFullscreen).toHaveBeenCalled();
  });
});

// Stands in for the YouTube iframe: the test drives its state, and its clock runs on the (fake) Date.now()
const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 };

class FakeYouTubePlayer {
  static instances: FakeYouTubePlayer[] = [];
  state = -1;
  // How far behind its target a seek lands, as if the browser buffered for that long
  seekLandingLag = 0;
  private position: number;
  private playingSince = 0;
  private events: any;
  playVideo = vi.fn();
  pauseVideo = vi.fn();
  mute = vi.fn();
  unMute = vi.fn();
  setVolume = vi.fn();
  destroy = vi.fn();
  seekTo = vi.fn((seconds: number) => {
    this.position = seconds - this.seekLandingLag;
    this.playingSince = Date.now();
  });

  constructor(_target: HTMLElement, options: any) {
    this.events = options.events;
    this.position = options.playerVars?.start ?? 0;
    FakeYouTubePlayer.instances.push(this);
  }

  getCurrentTime() {
    return this.state === YT_STATE.PLAYING ? this.position + (Date.now() - this.playingSince) / 1000 : this.position;
  }
  getDuration() {
    return 355;
  }
  getPlayerState() {
    return this.state;
  }
  ready() {
    this.events.onReady({ target: this });
  }
  setPlayerState(state: number) {
    this.position = this.getCurrentTime();
    this.playingSince = Date.now();
    this.state = state;
    this.events.onStateChange({ data: state });
  }
}

const syncSong: KaraokeQueueItem = {
  id: 99,
  roomId: 1,
  songId: 10,
  requestedByMemberId: 5,
  singerName: 'Alice',
  position: 1,
  status: 'playing',
  song: {
    id: 10,
    externalVideoId: 'sync123',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    durationFormatted: '05:55',
    durationSeconds: 355,
    thumbnailUrl: 'https://example.com/thumb.jpg',
    sourceProvider: 'youtube',
  },
};

const anchorAt = (state: PlaybackSyncAnchor['state'], positionSeconds: number): PlaybackSyncAnchor => ({
  queueItemId: syncSong.id,
  state,
  positionSeconds,
  receivedAtMs: Date.now(),
});

describe('WebVideoPlayer following the host', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeYouTubePlayer.instances = [];
    (window as any).YT = { Player: FakeYouTubePlayer, PlayerState: YT_STATE };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).YT;
  });

  const renderGuest = async (playbackState: 'playing' | 'paused', syncAnchor: PlaybackSyncAnchor) => {
    const view = render(
      <WebVideoPlayer currentSong={syncSong} playbackState={playbackState} syncAnchor={syncAnchor} durationSeconds={355} followHost />
    );
    await act(async () => {});
    const player = FakeYouTubePlayer.instances[0];
    act(() => player.ready());
    const rerender = (state: 'playing' | 'paused', anchor: PlaybackSyncAnchor) =>
      view.rerender(
        <WebVideoPlayer currentSong={syncSong} playbackState={state} syncAnchor={anchor} durationSeconds={355} followHost />
      );
    return { player, rerender };
  };

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it('stays in step through a host pause and resume instead of chasing the anchor it mounted with', async () => {
    const { player, rerender } = await renderGuest('playing', anchorAt('playing', 10));
    act(() => player.setPlayerState(YT_STATE.PLAYING));
    advance(5000);

    // Host pauses at 15s and stays paused for 20s
    rerender('paused', anchorAt('paused', 15));
    act(() => player.setPlayerState(YT_STATE.PAUSED));
    advance(20000);

    // Host resumes from 15s
    rerender('playing', anchorAt('playing', 15));
    act(() => player.setPlayerState(YT_STATE.PLAYING));
    advance(5000);

    expect(player.seekTo).not.toHaveBeenCalled();
    expect(player.getCurrentTime()).toBeCloseTo(20, 1);
  });

  it('parks a paused guest on the position the host paused at', async () => {
    const { player, rerender } = await renderGuest('playing', anchorAt('playing', 10));
    act(() => player.setPlayerState(YT_STATE.PLAYING));
    advance(1000);

    // The host was a little further along when it paused
    rerender('paused', anchorAt('paused', 12));
    act(() => player.setPlayerState(YT_STATE.PAUSED));

    expect(player.seekTo).toHaveBeenCalledTimes(1);
    expect(player.seekTo).toHaveBeenCalledWith(12, true);
  });

  it('starts resyncing once the first live host report replaces the song-start anchor', async () => {
    const { player, rerender } = await renderGuest('playing', anchorAt('buffering', 0));
    act(() => player.setPlayerState(YT_STATE.PLAYING));
    advance(2000);
    expect(player.seekTo).not.toHaveBeenCalled();

    // The host's first report: it is 3s ahead of this guest
    rerender('playing', anchorAt('playing', 5));
    advance(250);

    expect(player.seekTo).toHaveBeenCalledTimes(1);
    expect(player.seekTo.mock.calls[0][0]).toBeGreaterThan(5);
  });

  it('learns to seek ahead of its buffering instead of landing behind the room on every resync', async () => {
    const { player, rerender } = await renderGuest('playing', anchorAt('buffering', 0));
    act(() => player.setPlayerState(YT_STATE.PLAYING));
    player.seekLandingLag = 0.8;
    advance(2000);

    rerender('playing', anchorAt('playing', 5));
    advance(10000);

    // One seek that lands short, one that leads the room by the measured lag (8.25s + 0.8s), then it holds
    expect(player.seekTo).toHaveBeenCalledTimes(2);
    expect(player.seekTo.mock.calls[1][0]).toBeCloseTo(9.05, 1);
  });

  it('pauses a guest video that starts playing while the room is paused', async () => {
    const { player } = await renderGuest('paused', anchorAt('paused', 30));
    act(() => player.setPlayerState(YT_STATE.PLAYING));

    expect(player.pauseVideo).toHaveBeenCalled();
  });
});
