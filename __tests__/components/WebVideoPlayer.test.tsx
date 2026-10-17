import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
