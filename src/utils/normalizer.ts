import type { KaraokeQueueItem, Song } from '../types';

export function normalizeSong(raw: any): Song {
  if (!raw) {
    return {
      id: 0,
      externalVideoId: '',
      title: 'Unknown Title',
      artist: 'Unknown Artist',
      durationFormatted: '03:45',
      durationSeconds: 225,
      thumbnailUrl: '',
      sourceProvider: 'youtube',
    };
  }

  const id = raw.id || 0;
  const externalVideoId = raw.external_video_id || raw.externalVideoId || raw.videoId || '';
  const title = raw.title || 'Unknown Title';
  const artist = raw.artist || 'YouTube';
  const durationFormatted = raw.duration_formatted || raw.durationFormatted || '03:45';
  const durationSeconds = raw.duration_seconds || raw.durationSeconds || 225;
  const thumbnailUrl =
    raw.thumbnail_url ||
    raw.thumbnailUrl ||
    (externalVideoId ? `https://img.youtube.com/vi/${externalVideoId}/hqdefault.jpg` : '');
  const sourceProvider = raw.source_provider || raw.sourceProvider || 'youtube';

  return {
    id,
    externalVideoId,
    title,
    artist,
    durationFormatted,
    durationSeconds,
    thumbnailUrl,
    sourceProvider,
  };
}

export function normalizeQueueItem(raw: any): KaraokeQueueItem {
  if (!raw) {
    return {
      id: 0,
      roomId: 0,
      songId: 0,
      requestedByMemberId: 0,
      singerName: 'Singer',
      position: 1,
      status: 'pending',
      song: normalizeSong(null),
    };
  }

  const id = raw.id || Date.now();
  const roomId = raw.room_id || raw.roomId || 0;
  const songId = raw.song_id || raw.songId || 0;
  const requestedByMemberId = raw.requested_by_member_id || raw.requestedByMemberId || 0;
  const singerName = raw.singer_name || raw.singerName || 'Singer';
  const position = raw.position || 1;
  const status = raw.status || 'pending';
  const playedAt = raw.played_at || raw.playedAt || null;
  const finishedAt = raw.finished_at || raw.finishedAt || null;
  const song = normalizeSong(raw.song);

  return {
    id,
    roomId,
    songId,
    requestedByMemberId,
    singerName,
    position,
    status,
    playedAt,
    finishedAt,
    song,
  };
}
