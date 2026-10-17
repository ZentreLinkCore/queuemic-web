import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
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
  // How far behind the video its reported time runs, as in a hidden tab whose iframe updates are throttled
  readingLag = 0;
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
    return this.actualTime() - this.readingLag;
  }
  private actualTime() {
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
    this.position = this.actualTime();
    this.playingSince = Date.now();
    this.state = state;
    this.events.onStateChange({ data: state });
  }
  // The video cannot be played: 100 removed, 101/150 owner blocks embedding
  fail(code: number) {
    this.events.onError?.({ data: code });
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

describe('WebVideoPlayer guest mute choice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeYouTubePlayer.instances = [];
    (window as any).YT = { Player: FakeYouTubePlayer, PlayerState: YT_STATE };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).YT;
  });

  const renderGuest = async (muted: boolean, onToggleMute = vi.fn()) => {
    render(
      <WebVideoPlayer
        currentSong={syncSong}
        playbackState="playing"
        syncAnchor={anchorAt('playing', 0)}
        followHost
        muted={muted}
        onToggleMute={onToggleMute}
      />
    );
    await act(async () => {});
    const player = FakeYouTubePlayer.instances[0];
    act(() => player.ready());
    return player;
  };

  it('starts the next song with sound when the guest has unmuted', async () => {
    const player = await renderGuest(false);

    expect(player.unMute).toHaveBeenCalled();
    expect(player.mute).not.toHaveBeenCalled();
  });

  it('starts muted when the guest has not unmuted', async () => {
    const player = await renderGuest(true);

    expect(player.mute).toHaveBeenCalled();
  });

  it('shows a browser-muted autoplay as muted, and one tap brings the sound back', async () => {
    const onToggleMute = vi.fn();
    const player = await renderGuest(false, onToggleMute);

    // The browser refused to autoplay with sound: nothing started, so the player retries muted
    act(() => vi.advanceTimersByTime(1200));
    expect(player.mute).toHaveBeenCalled();
    expect(screen.getByText(/Audio Muted by Browser/i)).toBeDefined();

    fireEvent.click(screen.getByTitle('Unmute'));

    expect(player.unMute).toHaveBeenCalledTimes(2);
    expect(onToggleMute).not.toHaveBeenCalled();
    expect(screen.getByTitle('Mute')).toBeDefined();
    expect(screen.queryByText(/Audio Muted by Browser/i)).toBeNull();
  });
});

describe('WebVideoPlayer when a video cannot play or start (Flow 1 step 3, EC-06)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeYouTubePlayer.instances = [];
    (window as any).YT = { Player: FakeYouTubePlayer, PlayerState: YT_STATE };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).YT;
  });

  const renderPlayer = async (props: Partial<React.ComponentProps<typeof WebVideoPlayer>> = {}) => {
    render(<WebVideoPlayer currentSong={syncSong} playbackState="playing" {...props} />);
    await act(async () => {});
    const player = FakeYouTubePlayer.instances[0];
    act(() => player.ready());
    return player;
  };

  it('shows an error banner with a skip option when YouTube cannot play the video', async () => {
    const onSkip = vi.fn();
    const player = await renderPlayer({ onSkip });

    act(() => player.fail(150));
    // The autoplay check that follows must not cover the error with its tap prompt
    act(() => vi.advanceTimersByTime(1200));

    expect(screen.getByText(/can't be played here/i)).toBeDefined();
    expect(screen.queryByText(/Loading karaoke track/i)).toBeNull();
    expect(screen.queryByText(/Click to Start/i)).toBeNull();

    fireEvent.click(screen.getByText('Skip to next song'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows the error without a skip button to a guest who cannot control playback', async () => {
    const player = await renderPlayer({ followHost: true, syncAnchor: anchorAt('playing', 0) });

    act(() => player.fail(101));

    expect(screen.getByText(/can't be played here/i)).toBeDefined();
    expect(screen.queryByText('Skip to next song')).toBeNull();
  });

  it('asks the host to click to start playback when the browser blocks autoplay', async () => {
    await renderPlayer();

    // Nothing started within the check window
    act(() => vi.advanceTimersByTime(1200));

    expect(screen.getByText('Click to Start Playback')).toBeDefined();
  });
});

describe('WebVideoPlayer guest returning to a hidden tab (EC-07)', () => {
  let visibility: DocumentVisibilityState = 'visible';

  beforeEach(() => {
    vi.useFakeTimers();
    FakeYouTubePlayer.instances = [];
    (window as any).YT = { Player: FakeYouTubePlayer, PlayerState: YT_STATE };
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).YT;
    delete (document as any).visibilityState;
  });

  const renderGuest = async (playbackState: 'playing' | 'paused') => {
    render(
      <WebVideoPlayer currentSong={syncSong} playbackState={playbackState} syncAnchor={anchorAt(playbackState, 10)} followHost />
    );
    await act(async () => {});
    const player = FakeYouTubePlayer.instances[0];
    act(() => player.ready());
    act(() => player.setPlayerState(YT_STATE.PLAYING));
    return player;
  };

  const hideThenShow = (player: FakeYouTubePlayer) => {
    // The browser pauses the video while the tab is hidden
    visibility = 'hidden';
    act(() => player.setPlayerState(YT_STATE.PAUSED));
    player.playVideo.mockClear();
    visibility = 'visible';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };

  it('resumes the video when the tab is visible again and the room is still playing', async () => {
    const player = await renderGuest('playing');
    hideThenShow(player);

    expect(player.playVideo).toHaveBeenCalledTimes(1);
  });

  it('stays paused when the room is paused', async () => {
    const player = await renderGuest('paused');
    hideThenShow(player);

    expect(player.playVideo).not.toHaveBeenCalled();
  });

  it("resumes the host's own video too, which the room still shows as playing", async () => {
    render(<WebVideoPlayer currentSong={syncSong} playbackState="playing" />);
    await act(async () => {});
    const player = FakeYouTubePlayer.instances[0];
    act(() => player.ready());
    act(() => player.setPlayerState(YT_STATE.PLAYING));
    hideThenShow(player);

    expect(player.playVideo).toHaveBeenCalledTimes(1);
  });

  it('ignores the late readings of a hidden tab, then catches up with the room a second after it is shown', async () => {
    const startedAt = Date.now();
    const player = await renderGuest('playing');
    const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

    // A resync just before the tab is hidden, whose result is still to be measured
    player.readingLag = 2;
    advance(250);
    expect(player.seekTo).toHaveBeenCalledTimes(1);
    player.readingLag = 0;

    // Hidden: the iframe's reports run 20s late, and the video really stalls for 5s
    visibility = 'hidden';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    player.readingLag = 20;
    advance(5000);
    act(() => player.setPlayerState(YT_STATE.BUFFERING));
    advance(5000);
    act(() => player.setPlayerState(YT_STATE.PLAYING));
    expect(player.seekTo).toHaveBeenCalledTimes(1);

    player.readingLag = 0;
    visibility = 'visible';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const shownAt = Date.now();
    advance(1250);

    // One seek to where the room is, led by the usual 0.3s rather than a lead learned from the hidden stall
    expect(player.seekTo).toHaveBeenCalledTimes(2);
    const roomAtSeek = 10 + (shownAt + 1000 - startedAt) / 1000;
    expect(player.seekTo.mock.calls[1][0]).toBeCloseTo(roomAtSeek + 0.3, 1);
  });
});

describe('WebVideoPlayer guest mute toggle on a phone-width screen (FR-08, Finding #12)', () => {
  const desktopWidth = window.innerWidth;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeYouTubePlayer.instances = [];
    (window as any).YT = { Player: FakeYouTubePlayer, PlayerState: YT_STATE };
    // Phone layout: the banner and bottom bar overlays are hidden below 1024 px
    window.innerWidth = 390;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).YT;
    window.innerWidth = desktopWidth;
  });

  const renderGuest = async (muted: boolean, onToggleMute = vi.fn()) => {
    render(
      <WebVideoPlayer
        currentSong={syncSong}
        playbackState="playing"
        syncAnchor={anchorAt('playing', 0)}
        followHost
        muted={muted}
        onToggleMute={onToggleMute}
      />
    );
    await act(async () => {});
    const player = FakeYouTubePlayer.instances[0];
    act(() => player.ready());
    return player;
  };

  it('lets a muted guest unmute without going fullscreen', async () => {
    const onToggleMute = vi.fn();
    await renderGuest(true, onToggleMute);

    fireEvent.click(screen.getByTitle('Unmute'));

    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('shows a browser-muted autoplay as muted, and one tap brings the sound back', async () => {
    const onToggleMute = vi.fn();
    const player = await renderGuest(false, onToggleMute);

    // The browser refused to autoplay with sound: nothing started, so the player retries muted
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByText(/Audio Muted by Browser/i)).toBeDefined();

    fireEvent.click(screen.getByTitle('Unmute'));

    expect(player.unMute).toHaveBeenCalledTimes(2);
    expect(onToggleMute).not.toHaveBeenCalled();
    expect(screen.getByTitle('Mute')).toBeDefined();
    expect(screen.queryByText(/Audio Muted by Browser/i)).toBeNull();
  });
});
