import { describe, it, expect } from 'vitest';
import { normalizeSong, normalizeQueueItem } from '../../src/utils/normalizer';
import { formatDuration, formatRoomCode, getInitials } from '../../src/utils/formatting';

describe('normalizer utils', () => {
  it('normalizes null/undefined raw song with fallbacks', () => {
    const song = normalizeSong(null);
    expect(song.id).toBe(0);
    expect(song.title).toBe('Unknown Title');
    expect(song.sourceProvider).toBe('youtube');
  });

  it('normalizes backend snake_case song payload into camelCase', () => {
    const raw = {
      id: 42,
      external_video_id: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      duration_formatted: '03:32',
      duration_seconds: 212,
      thumbnail_url: 'https://example.com/thumb.jpg',
      source_provider: 'youtube',
    };

    const song = normalizeSong(raw);
    expect(song.id).toBe(42);
    expect(song.externalVideoId).toBe('dQw4w9WgXcQ');
    expect(song.title).toBe('Never Gonna Give You Up');
    expect(song.artist).toBe('Rick Astley');
    expect(song.durationFormatted).toBe('03:32');
    expect(song.durationSeconds).toBe(212);
    expect(song.thumbnailUrl).toBe('https://example.com/thumb.jpg');
  });

  it('generates youtube thumbnail fallback if thumbnail_url is missing', () => {
    const raw = {
      external_video_id: 'abc123xyz',
      title: 'Karaoke Track',
    };
    const song = normalizeSong(raw);
    expect(song.thumbnailUrl).toBe('https://img.youtube.com/vi/abc123xyz/hqdefault.jpg');
  });

  it('normalizes queue item payload', () => {
    const rawQueue = {
      id: 101,
      room_id: 5,
      song_id: 42,
      requested_by_member_id: 7,
      singer_name: 'John Doe',
      position: 1,
      status: 'pending',
      song: {
        id: 42,
        external_video_id: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
      },
    };

    const item = normalizeQueueItem(rawQueue);
    expect(item.id).toBe(101);
    expect(item.roomId).toBe(5);
    expect(item.songId).toBe(42);
    expect(item.requestedByMemberId).toBe(7);
    expect(item.singerName).toBe('John Doe');
    expect(item.status).toBe('pending');
    expect(item.song.title).toBe('Never Gonna Give You Up');
  });
});

describe('formatting utils', () => {
  it('formats seconds into mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(212)).toBe('03:32');
  });

  it('formats and sanitizes room code to uppercase alphanumeric', () => {
    expect(formatRoomCode('qm-99')).toBe('QM99');
    expect(formatRoomCode(' abc 123 ')).toBe('ABC123');
  });

  it('computes initials correctly', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Single')).toBe('SI');
    expect(getInitials('')).toBe('?');
  });
});
