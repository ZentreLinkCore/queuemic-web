import { apiClient } from './client';
import type { Room, RoomMember, CreateRoomPayload, JoinRoomPayload, ApiResponse } from '../types';

export const roomApi = {
  /**
   * POST /api/v1/rooms
   */
  async createRoom(payload: CreateRoomPayload): Promise<ApiResponse<{ room: Room; token: string; member: RoomMember }>> {
    const response = await apiClient.post<ApiResponse<{ room: Room; token: string; member: RoomMember }>>(
      '/rooms',
      {
        room_name: payload.roomName,
        nickname: payload.nickname,
        device_uuid: payload.deviceUuid,
      }
    );
    return response.data;
  },

  /**
   * POST /api/v1/rooms/join
   */
  async joinRoom(payload: JoinRoomPayload): Promise<ApiResponse<{ room: Room; token: string; member: RoomMember }>> {
    const response = await apiClient.post<ApiResponse<{ room: Room; token: string; member: RoomMember }>>(
      '/rooms/join',
      {
        room_code: payload.roomCode,
        nickname: payload.nickname,
        device_uuid: payload.deviceUuid,
      }
    );
    return response.data;
  },

  /**
   * GET /api/v1/rooms/{code}
   */
  async getRoomDetails(code: string): Promise<ApiResponse<Room>> {
    const response = await apiClient.get<ApiResponse<Room>>(`/rooms/${code}`);
    return response.data;
  },

  /**
   * GET /api/v1/rooms/{code}/members
   */
  async getRoomMembers(code: string): Promise<ApiResponse<RoomMember[]>> {
    const response = await apiClient.get<ApiResponse<RoomMember[]>>(`/rooms/${code}/members`);
    return response.data;
  },

  /**
   * POST /api/v1/rooms/{code}/transfer-host
   */
  async transferHost(code: string, newHostMemberId: number): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post<ApiResponse<{ success: boolean }>>(
      `/rooms/${code}/transfer-host`,
      {
        new_host_member_id: newHostMemberId,
      }
    );
    return response.data;
  },

  /**
   * POST /api/v1/rooms/{code}/leave
   */
  async leaveRoom(code: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.post<ApiResponse<{ success: boolean }>>(`/rooms/${code}/leave`);
    return response.data;
  },

  /**
   * POST /api/v1/rooms/{code}/heartbeat
   */
  async heartbeat(code: string): Promise<ApiResponse<{ last_seen_at: string }>> {
    const response = await apiClient.post<ApiResponse<{ last_seen_at: string }>>(`/rooms/${code}/heartbeat`);
    return response.data;
  },

  /**
   * PATCH /api/v1/rooms/{code}/settings
   */
  async updateSettings(code: string, settings: Record<string, any>): Promise<ApiResponse<{ room: Room }>> {
    const response = await apiClient.patch<ApiResponse<{ room: Room }>>(`/rooms/${code}/settings`, settings);
    return response.data;
  },

  /**
   * DELETE /api/v1/rooms/{code}
   */
  async closeRoom(code: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/rooms/${code}`);
    return response.data;
  },
};
