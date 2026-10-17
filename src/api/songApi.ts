import { apiClient } from './client';
import type { Song, ApiResponse } from '../types';
import { normalizeSong } from '../utils/normalizer';

export const songApi = {
  /**
   * GET /api/v1/songs/search?q=...&room_code=...
   */
  async searchSongs(query: string, roomCode: string): Promise<ApiResponse<Song[]>> {
    const response = await apiClient.get<ApiResponse<any[]>>('/songs/search', {
      params: { q: query, room_code: roomCode },
    });

    const rawList = response.data?.data || [];
    const normalizedSongs: Song[] = rawList.map(normalizeSong);

    return {
      ...response.data,
      data: normalizedSongs,
    };
  },
};
