import { useEffect, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePlaybackStore, getLivePlaybackPosition } from '../store/usePlaybackStore';
import { getEcho, onEchoReset } from '../services/echo';
import { syncServerClock, toLocalTime } from '../services/serverClock';
import { normalizeQueueItem } from '../utils/normalizer';
import type { RoomMember, KaraokeQueueItem } from '../types';
import { queueApi } from '../api/queueApi';
import { roomApi } from '../api/roomApi';
import { playbackApi } from '../api/playbackApi';
import { bindConnectionState } from '../services/connectionState';
import { getExpectedPosition } from '../components/player/WebVideoPlayer';

const PRESENCE_HEARTBEAT_MS = 60_000;
// The server stores whole seconds stamped with a 1s-precision updated_at, so its position can be this far off the host's
const SERVER_POSITION_PRECISION_SECONDS = 2;

export interface UseEchoRoomOptions {
  onRoomClosed?: (reason?: string) => void;
  onRoleChanged?: (newRole: 'host' | 'guest') => void;
}

/**
 * Real-time room WebSocket listener hook (Laravel Reverb / Echo)
 * Subscribes to presence-room.{roomCode} and syncs queue, current song, and member list.
 */
export function useEchoRoom(
  roomCode: string | undefined,
  isHost: boolean = false,
  options?: UseEchoRoomOptions
) {
  const { setConnected, addMember, removeMember, setMembers, setCurrentRoom, updateRoomSettings } = useRoomStore();
  const { setQueue, setCurrentPlaying } = useQueueStore();

  const [echoGeneration, setEchoGeneration] = useState(0);
  useEffect(() => onEchoReset(() => setEchoGeneration((g) => g + 1)), []);

  useEffect(() => {
    if (!roomCode) return;

    const normalizedCode = roomCode.toUpperCase().trim();
    const echo = getEcho();
    syncServerClock().catch(() => {});

    // Host only: re-broadcast live position when newcomer joins
    const pushHostPosition = () => {
      const current = useQueueStore.getState().currentPlaying;
      const { state, currentTimeSeconds } = usePlaybackStore.getState();
      if (!current || currentTimeSeconds <= 0) return;
      playbackApi.updatePlaybackState(normalizedCode, state, getLivePlaybackPosition(), current.id).catch(() => {});
    };

    const channel = echo.join(`room.${normalizedCode}`);

    // Presence listeners
    channel
      .here((members: any[]) => {
        setConnected(true);
        if (Array.isArray(members)) {
          setMembers(
            members.map((m) => ({
              id: m.id,
              roomId: 0,
              nickname: m.nickname,
              avatarColor: m.avatar_color || '#8B5CF6',
              role: m.role || 'guest',
              isConnected: true,
              lastSeenAt: new Date().toISOString(),
            }))
          );
        }
      })
      .joining((member: any) => {
        addMember({
          id: member.id,
          roomId: 0,
          nickname: member.nickname,
          avatarColor: member.avatar_color || '#8B5CF6',
          role: member.role || 'guest',
          isConnected: true,
          lastSeenAt: new Date().toISOString(),
        });
        if (isHost) pushHostPosition();
      })
      .leaving((member: any) => {
        removeMember(member.id);
      })
      .error((error: any) => {
        console.warn('⚠️ [Echo Channel Error]:', error);
        setConnected(false);
      });

    // Real-time Event Listeners
    channel.listen('.queue.updated', (event: any) => {
      if (Array.isArray(event.queue)) {
        const current = useQueueStore.getState().currentPlaying;
        const normalized: KaraokeQueueItem[] = event.queue.map(normalizeQueueItem);
        setQueue(normalized.filter((item) => item.id !== current?.id));
      }
    });

    channel.listen('.playback.state_changed', (event: any) => {
      if (!event.state) return;

      const playback = usePlaybackStore.getState();

      if (isHost) {
        if (playback.state !== event.state) {
          playback.setState(event.state);
        }
        return;
      }

      const current = useQueueStore.getState().currentPlaying;
      if (event.queue_item_id && event.queue_item_id !== current?.id) {
        syncNowPlaying().catch(() => {});
        return;
      }

      const positionAtLocalMs =
        typeof event.position_at_ms === 'number' ? toLocalTime(event.position_at_ms) : Date.now();

      playback.setState(event.state);
      const pos = Number(event.current_time_seconds) || 0;
      playback.setCurrentTime(pos);
      if (current?.song?.durationSeconds) {
        playback.setDuration(current.song.durationSeconds);
      }
      playback.setSyncAnchor({
        queueItemId: current?.id ?? null,
        state: event.state,
        positionSeconds: pos,
        receivedAtMs: Math.min(positionAtLocalMs, Date.now()),
      });
    });

    channel.listen('.song.started', (event: any) => {
      const playback = usePlaybackStore.getState();
      if (event.current_playing) {
        const item = normalizeQueueItem(event.current_playing);
        setCurrentPlaying(item);
        playback.resetPlayback();
        playback.setState('playing');
        playback.setCurrentTime(0);
        if (item.song?.durationSeconds) {
          playback.setDuration(item.song.durationSeconds);
        }
        playback.setSyncAnchor({ queueItemId: item.id, state: 'buffering', positionSeconds: 0, receivedAtMs: Date.now() });
      } else {
        setCurrentPlaying(null);
        playback.setState('paused');
        playback.setSyncAnchor(null);
      }
    });

    const syncNowPlaying = async (queue: KaraokeQueueItem[] = useQueueStore.getState().queue) => {
      try {
        const requestedAtMs = Date.now();
        const res = await playbackApi.getPlaybackState(normalizedCode);
        const data: any = res.success ? res.data : null;
        const playback = usePlaybackStore.getState();

        if (!data) {
          setCurrentPlaying(null);
          playback.setSyncAnchor(null);
          if (isHost && queue.length > 0) {
            playbackApi.nextSong(normalizedCode).catch(() => {});
          }
          return;
        }

        const item = normalizeQueueItem(data);
        const state = data.playback_state || 'playing';
        const ageSeconds = state === 'playing' ? (Number(data.position_age_ms) || 0) / 1000 : 0;

        if (useQueueStore.getState().currentPlaying?.id !== item.id) {
          setCurrentPlaying(item);
        }
        setQueue(useQueueStore.getState().queue.filter((q) => q.id !== item.id));
        playback.setState(state);

        const anchor = playback.syncAnchor;
        if (anchor?.queueItemId === item.id && anchor.receivedAtMs >= requestedAtMs) return;

        const positionSeconds = (Number(data.current_time_seconds) || 0) + ageSeconds;
        // A guest back on a visible tab still holds the host's own report: keep it while the server agrees, since
        // the server's coarser copy would land the guest up to 1.5s off the host until the next report
        if (
          anchor?.queueItemId === item.id &&
          anchor.state === state &&
          Math.abs(getExpectedPosition(anchor) - positionSeconds) <= SERVER_POSITION_PRECISION_SECONDS
        ) {
          return;
        }

        playback.setSyncAnchor({
          queueItemId: item.id,
          state,
          positionSeconds,
          receivedAtMs: Date.now(),
        });
      } catch (err: any) {
        if (err?.code === 'ROOM_NOT_FOUND' || err?.status === 404 || err?.message?.includes('not found') || err?.message?.includes('closed')) {
          console.warn(`🚪 [Auto-Exit] Room ${normalizedCode} no longer exists.`);
          options?.onRoomClosed?.('This karaoke room no longer exists or has ended.');
        }
      }
    };

    const fetchInitialSync = async () => {
      try {
        const queueRes = await queueApi.getQueue(normalizedCode);
        const queue = queueRes.success && Array.isArray(queueRes.data) ? queueRes.data : [];
        setQueue(queue);

        await syncNowPlaying(queue);

        const roomRes = await roomApi.getRoomDetails(normalizedCode);
        if (roomRes.success && roomRes.data) {
          setCurrentRoom(roomRes.data);
          if (roomRes.data.settings) {
            updateRoomSettings(roomRes.data.settings);
          }
        }

        const membersRes = await roomApi.getRoomMembers(normalizedCode);
        if (membersRes.success && Array.isArray(membersRes.data)) {
          setMembers(membersRes.data);

          const me = membersRes.data.find((m) => m.id === useAuthStore.getState().memberId);
          if (me?.role === 'host' || me?.role === 'guest') {
            useAuthStore.getState().setRole(me.role);
            options?.onRoleChanged?.(me.role);
          }
        }
      } catch (e: any) {
        if (e?.code === 'ROOM_NOT_FOUND' || e?.status === 404 || e?.message?.includes('not found') || e?.message?.includes('closed')) {
          console.warn(`🚪 [Auto-Exit] Room ${normalizedCode} no longer exists.`);
          options?.onRoomClosed?.('This karaoke room no longer exists or has ended.');
        }
      }
    };

    fetchInitialSync();

    const connection = echo.connector?.pusher?.connection;
    let hasBeenConnected = connection?.state === 'connected';
    const resyncOnReconnect = ({ current }: { current: string }) => {
      if (current !== 'connected') return;
      if (hasBeenConnected) fetchInitialSync();
      hasBeenConnected = true;
    };
    connection?.bind('state_change', resyncOnReconnect);
    const unbindConnectionState = bindConnectionState(connection, setConnected);

    // Heartbeat
    const presenceTimer = setInterval(() => {
      roomApi.heartbeat(normalizedCode).catch((err: any) => {
        if (err?.code === 'ROOM_NOT_FOUND') {
          options?.onRoomClosed?.(err?.message || 'This karaoke room no longer exists or has ended.');
        }
      });
    }, PRESENCE_HEARTBEAT_MS);

    // Re-sync when tab becomes visible
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !isHost) {
        setTimeout(fetchInitialSync, Math.random() * 500);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    channel.listen('.member.joined', (event: any) => {
      addMember({
        id: event.id,
        roomId: 0,
        nickname: event.nickname,
        avatarColor: event.avatar_color || '#8B5CF6',
        role: event.role || 'guest',
        isConnected: true,
        lastSeenAt: new Date().toISOString(),
      });
    });

    channel.listen('.member.left', (event: any) => {
      removeMember(event.id);
    });

    channel.listen('.host.transferred', (event: any) => {
      const newHostId = Number(event.new_host_id);
      if (!newHostId) return;

      setMembers(
        useRoomStore
          .getState()
          .members.map((m): RoomMember => ({ ...m, role: m.id === newHostId ? 'host' : 'guest' }))
      );

      const isMeNewHost = useAuthStore.getState().memberId === newHostId;
      useAuthStore.getState().setRole(isMeNewHost ? 'host' : 'guest');
      options?.onRoleChanged?.(isMeNewHost ? 'host' : 'guest');
    });

    channel.listen('.room.closed', (event: any) => {
      console.log(`🛑 [Room Closed] Room ${normalizedCode} ended.`);
      options?.onRoomClosed?.(event?.message || 'The host has ended this party session.');
    });

    channel.listen('.room.settings_updated', (event: any) => {
      if (event.settings) {
        updateRoomSettings(event.settings);
      }
    });

    return () => {
      clearInterval(presenceTimer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      connection?.unbind('state_change', resyncOnReconnect);
      unbindConnectionState();
      echo.leave(`room.${normalizedCode}`);
    };
  }, [roomCode, isHost, echoGeneration, setConnected, addMember, removeMember, setMembers, setQueue, setCurrentPlaying, updateRoomSettings]);
}
