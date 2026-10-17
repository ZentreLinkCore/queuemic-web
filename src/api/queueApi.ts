import { apiClient } from './client';
import type { KaraokeQueueItem, AddQueuePayload, MoveQueuePayload, ApiResponse } from '../types';
import { normalizeQueueItem } from '../utils/normalizer';

const ADD_KEY_REUSE_MS = 2 * 60 * 1000;
const unansweredAddKeys = new Map<string, { key: string; createdAt: number }>();

const newIdempotencyKey = (): string =>
  `add-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;

const idempotencyKeyFor = (addKey: string): string => {
  const unanswered = unansweredAddKeys.get(addKey);
  if (unanswered && Date.now() - unanswered.createdAt < ADD_KEY_REUSE_MS) return unanswered.key;
  const key = newIdempotencyKey();
  unansweredAddKeys.set(addKey, { key, createdAt: Date.now() });
  return key;
};

export const queueApi = {
  /**
   * GET /api/v1/rooms/{code}/queue
   */
  async getQueue(roomCode: string): Promise<ApiResponse<KaraokeQueueItem[]>> {
    const response = await apiClient.get<ApiResponse<any[]>>(`/rooms/${roomCode}/queue`);
    const rawList = response.data?.data || [];
    const normalizedList: KaraokeQueueItem[] = rawList.map(normalizeQueueItem);

    return {
      ...response.data,
      data: normalizedList,
    };
  },

  /**
   * POST /api/v1/rooms/{code}/queue
   */
  async addToQueue(roomCode: string, payload: AddQueuePayload): Promise<ApiResponse<KaraokeQueueItem>> {
    const addKey = `${roomCode}|${payload.songId}|${payload.singerName ?? ''}`;
    const idempotencyKey = idempotencyKeyFor(addKey);

    let response;
    try {
      response = await apiClient.post<ApiResponse<any>>(
        `/rooms/${roomCode}/queue`,
        {
          song_id: payload.songId,
          singer_name: payload.singerName,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
    } catch (err: any) {
      if (err?.status) unansweredAddKeys.delete(addKey);
      throw err;
    }
    unansweredAddKeys.delete(addKey);

    const normalizedItem = normalizeQueueItem(response.data?.data);

    return {
      ...response.data,
      data: normalizedItem,
    };
  },

  /**
   * POST /api/v1/rooms/{code}/queue/{queueId}/move
   */
  async moveQueueItem(roomCode: string, queueId: number, payload: MoveQueuePayload): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post<ApiResponse<{ success: boolean }>>(
      `/rooms/${roomCode}/queue/${queueId}/move`,
      {
        direction: payload.direction,
        target_position: payload.target_position,
      }
    );
    return response.data;
  },

  /**
   * DELETE /api/v1/rooms/{code}/queue/{queueId}
   */
  async removeFromQueue(roomCode: string, queueId: number): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(
      `/rooms/${roomCode}/queue/${queueId}`
    );
    return response.data;
  },
};
