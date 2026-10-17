import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRoomStore } from '../../src/store/useRoomStore';
import { useQueueStore } from '../../src/store/useQueueStore';
import { usePlaybackStore, getLivePlaybackPosition } from '../../src/store/usePlaybackStore';
import { normalizeQueueItem, normalizeSong } from '../../src/utils/normalizer';
import { formatRoomCode, formatDuration } from '../../src/utils/formatting';
import { toServerTime, toLocalTime, setServerOffsetMsForTest } from '../../src/services/serverClock';

describe('End-to-End Room Flow and Integration State Machine', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useRoomStore.getState().leaveRoom();
    useQueueStore.getState().setQueue([]);
    useQueueStore.getState().setCurrentPlaying(null);
    usePlaybackStore.getState().resetPlayback();
  });

  it('Step 1: Host creates room and initializes state', () => {
    const mockRoom = {
      id: 1,
      code: 'QM2026',
      name: "Rockstar's Lounge",
      hostMemberId: 101,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      settings: {
        allowGuestReorder: true,
        allowGuestPlaybackControl: true,
        maxQueuePerUser: null,
      },
    };

    useAuthStore.getState().setAuth({
      token: 'jwt-host-token-xyz',
      memberId: 101,
      nickname: 'Rockstar',
      avatarColor: '#8B5CF6',
      role: 'host',
    });
    useRoomStore.getState().setCurrentRoom(mockRoom);

    const auth = useAuthStore.getState();
    const room = useRoomStore.getState().currentRoom;

    expect(auth.role).toBe('host');
    expect(auth.token).toBe('jwt-host-token-xyz');
    expect(room?.code).toBe('QM2026');
    expect(room?.settings?.allowGuestReorder).toBe(true);
  });

  it('Step 2: Guest joins room with sanitized code', () => {
    const rawInput = ' qm-2026 ';
    const cleanCode = formatRoomCode(rawInput);
    expect(cleanCode).toBe('QM2026');

    useAuthStore.getState().setAuth({
      token: 'jwt-guest-token-abc',
      memberId: 202,
      nickname: 'Singer Bob',
      avatarColor: '#06B6D4',
      role: 'guest',
    });

    const auth = useAuthStore.getState();
    expect(auth.role).toBe('guest');
    expect(auth.nickname).toBe('Singer Bob');
  });

  it('Step 3: Queuing songs, normalization, and automatic now-playing promotion', () => {
    const rawSong1 = {
      id: 501,
      external_video_id: 'vid-rick-1',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      duration_formatted: '03:32',
      duration_seconds: 212,
    };

    const rawSong2 = {
      id: 502,
      external_video_id: 'vid-queen-2',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      duration_formatted: '05:55',
      duration_seconds: 355,
    };

    const item1 = normalizeQueueItem({
      id: 1001,
      room_id: 1,
      song_id: 501,
      requested_by_member_id: 101,
      singer_name: 'Rockstar',
      position: 1,
      status: 'playing',
      song: rawSong1,
    });

    const item2 = normalizeQueueItem({
      id: 1002,
      room_id: 1,
      song_id: 502,
      requested_by_member_id: 202,
      singer_name: 'Singer Bob',
      position: 2,
      status: 'pending',
      song: rawSong2,
    });

    const queueStore = useQueueStore.getState();
    queueStore.addToQueue(item1);
    queueStore.addToQueue(item2);

    const updated = useQueueStore.getState();
    expect(updated.currentPlaying?.song.title).toBe('Never Gonna Give You Up');
    expect(updated.queue.length).toBe(1);
    expect(updated.queue[0].song.title).toBe('Bohemian Rhapsody');
  });

  it('Step 4: NTP server clock sync and live position interpolation', () => {
    setServerOffsetMsForTest(1000); // 1s server lead

    const localNow = Date.now();
    const serverStamp = toServerTime(localNow);
    expect(serverStamp).toBe(localNow + 1000);
    expect(toLocalTime(serverStamp)).toBe(localNow);

    usePlaybackStore.getState().setState('playing');
    usePlaybackStore.getState().setCurrentTime(45);

    const livePos = getLivePlaybackPosition();
    expect(livePos).toBeGreaterThanOrEqual(45);
    expect(formatDuration(45)).toBe('00:45');
  });

  it('Step 5: Song skipping moves next track to current playing', () => {
    const item1 = normalizeQueueItem({
      id: 1001,
      singer_name: 'Singer 1',
      position: 1,
      song: { id: 1, title: 'Track 1' },
    });
    const item2 = normalizeQueueItem({
      id: 1002,
      singer_name: 'Singer 2',
      position: 2,
      song: { id: 2, title: 'Track 2' },
    });

    const queueStore = useQueueStore.getState();
    queueStore.addToQueue(item1);
    queueStore.addToQueue(item2);

    expect(useQueueStore.getState().currentPlaying?.id).toBe(1001);

    useQueueStore.getState().skipSong();
    expect(useQueueStore.getState().currentPlaying?.id).toBe(1002);
    expect(useQueueStore.getState().queue.length).toBe(0);
  });
});
