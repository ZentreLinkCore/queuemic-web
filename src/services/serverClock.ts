import { apiClient } from '../api/client';

/**
 * Shared server timeline for playback sync. The host stamps each position report with server time,
 * and guests convert that stamp back to their own clock, so network delay no longer leaves them behind.
 */

// Add to Date.now() to get server time; 0 until synced
let serverOffsetMs = 0;
let syncInFlight: Promise<void> | null = null;

/** NTP-style estimate: keep the offset from the round trip with the lowest latency. */
export function syncServerClock(samples: number = 5): Promise<void> {
  if (!syncInFlight) {
    syncInFlight = (async () => {
      let bestRoundTripMs = Infinity;
      for (let i = 0; i < samples; i++) {
        try {
          const sentAt = Date.now();
          const res = await apiClient.get('/time');
          const receivedAt = Date.now();
          const serverTimeMs = Number(res.data?.data?.server_time_ms);
          const roundTripMs = receivedAt - sentAt;
          if (serverTimeMs > 0 && roundTripMs < bestRoundTripMs) {
            bestRoundTripMs = roundTripMs;
            serverOffsetMs = serverTimeMs - (sentAt + roundTripMs / 2);
          }
        } catch (e) {}
      }
    })().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

export const toServerTime = (localMs: number): number => Math.round(localMs + serverOffsetMs);

export const toLocalTime = (serverMs: number): number => serverMs - serverOffsetMs;

export const getServerOffsetMs = (): number => serverOffsetMs;

export const setServerOffsetMsForTest = (offset: number) => {
  serverOffsetMs = offset;
};
