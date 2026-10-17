import { apiClient } from './client';
import type { PlaybackSession, PlaybackState, ApiResponse } from '../types';
import { toServerTime } from '../services/serverClock';
import { getEcho } from '../services/echo';

export const playbackApi = {
  /**
   * GET /api/v1/rooms/{code}/playback
   */
  async getPlaybackState(roomCode: string): Promise<ApiResponse<PlaybackSession>> {
    const response = await apiClient.get<ApiResponse<PlaybackSession>>(`/rooms/${roomCode}/playback`);
    return response.data;
  },

  /**
   * POST /api/v1/rooms/{code}/playback/state
   */
  async updatePlaybackState(
    roomCode: string,
    state: PlaybackState,
    currentTimeSeconds: number = 0,
    queueItemId?: number
  ): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post<ApiResponse<{ success: boolean }>>(
      `/rooms/${roomCode}/playback/state`,
      {
        state,
        current_time_seconds: currentTimeSeconds,
        queue_item_id: queueItemId,
        position_at_ms: toServerTime(Date.now()),
      },
      { headers: { 'X-Socket-ID': getEcho().socketId?.() } }
    );
    return response.data;
  },

  /**
   * POST /api/v1/rooms/{code}/playback/next
   */
  async nextSong(roomCode: string): Promise<ApiResponse<{ success: boolean; data: any }>> {
    const response = await apiClient.post<ApiResponse<{ success: boolean; data: any }>>(
      `/rooms/${roomCode}/playback/next`
    );
    return response.data;
  },

  /**
   * POST /api/v1/rooms/{code}/playback/skip
   */
  async skipSong(roomCode: string): Promise<ApiResponse<{ success: boolean; data: any }>> {
    const response = await apiClient.post<ApiResponse<{ success: boolean; data: any }>>(
      `/rooms/${roomCode}/playback/skip`
    );
    return response.data;
  },
};
