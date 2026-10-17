export type MemberRole = 'host' | 'guest';

export type QueueStatus = 'pending' | 'playing' | 'completed' | 'skipped' | 'removed';

export type PlaybackState = 'playing' | 'paused' | 'buffering' | 'stopped';

export interface RoomMember {
  id: number;
  roomId: number;
  nickname: string;
  avatarColor: string;
  role: MemberRole;
  isConnected: boolean;
  lastSeenAt: string;
}

export interface Song {
  id: number;
  externalVideoId: string;
  title: string;
  artist: string;
  durationFormatted: string;
  durationSeconds: number;
  thumbnailUrl: string;
  sourceProvider: 'youtube' | 'custom';
}

export interface KaraokeQueueItem {
  id: number;
  roomId: number;
  songId: number;
  requestedByMemberId: number;
  singerName: string;
  position: number;
  status: QueueStatus;
  playedAt?: string | null;
  finishedAt?: string | null;
  song: Song;
}

export interface RoomSettings {
  allowGuestReorder?: boolean;
  /** Songs each guest may have waiting; null = no limit */
  maxQueuePerUser?: number | null;
  allowGuestPlaybackControl?: boolean;
  allow_guest_reorder?: boolean;
  max_queue_per_user?: number | null;
  allow_guest_playback_control?: boolean;
}

export interface Room {
  id: number;
  code: string;
  name: string;
  hostMemberId: number;
  status: 'active' | 'closed';
  settings?: RoomSettings;
  createdAt: string;
  currentPlayback?: PlaybackSession;
}

export interface PlaybackSession {
  id: number;
  roomId: number;
  queueItemId?: number | null;
  songId?: number | null;
  state: PlaybackState;
  currentTimeSeconds: number;
  durationSeconds: number;
  currentSong?: Song | null;
  currentSinger?: string | null;
}

/** Last known room position: the video was at positionSeconds at local time receivedAtMs. */
export interface PlaybackSyncAnchor {
  queueItemId: number | null;
  state: PlaybackState;
  positionSeconds: number;
  receivedAtMs: number;
}

export interface CreateRoomPayload {
  roomName: string;
  nickname: string;
  deviceUuid: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  nickname: string;
  deviceUuid: string;
}

export interface AddQueuePayload {
  songId: number;
  singerName: string;
}

export interface MoveQueuePayload {
  direction?: 'up' | 'down' | 'top' | 'bottom';
  target_position?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export interface BroadcasterConfig {
  default: 'reverb' | 'pusher' | 'log' | 'null';
  connections: {
    pusher?: {
      key: string;
      cluster?: string;
      wsHost?: string;
      wsPort?: number;
      wssPort?: number;
      forceTLS?: boolean;
      authEndpoint?: string;
    };
    reverb?: {
      key: string;
      host: string;
      port: number;
      scheme: string;
      useTLS: boolean;
      authEndpoint?: string;
    };
  };
}

// WebSocket Event Types
export interface QueueUpdatedEventPayload {
  room_id: number;
  queue: KaraokeQueueItem[];
}

export interface PlaybackStateChangedEventPayload {
  room_id: number;
  state: PlaybackState;
  current_time_seconds: number;
  duration_seconds: number;
  queue_item_id?: number | null;
  song?: Song | null;
  singer_name?: string | null;
  server_timestamp_ms?: number;
}

export interface SongStartedEventPayload {
  room_id: number;
  queue_item_id: number;
  song: Song;
  singer_name: string;
  server_timestamp_ms?: number;
}

export interface RoomSettingsUpdatedEventPayload {
  room_id: number;
  settings: RoomSettings;
}

export interface HostTransferredEventPayload {
  room_id: number;
  new_host_member_id: number;
}

export interface RoomClosedEventPayload {
  room_id: number;
  reason?: string;
}
