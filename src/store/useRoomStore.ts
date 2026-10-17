import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Room, RoomMember, RoomSettings } from '../types';
import { appStorage } from '../utils/storage';

export interface LastJoinedRoom {
  code: string;
  name: string;
  nickname: string;
}

interface RoomState {
  currentRoom: Room | null;
  lastRoom: LastJoinedRoom | null;
  members: RoomMember[];
  isConnected: boolean;
  isQrModalVisible: boolean;
  isMemberListVisible: boolean;
  setCurrentRoom: (room: Room | null) => void;
  setLastRoom: (lastRoom: LastJoinedRoom | null) => void;
  setMembers: (members: RoomMember[]) => void;
  addMember: (member: RoomMember) => void;
  removeMember: (memberId: number) => void;
  setConnected: (connected: boolean) => void;
  setQrModalVisible: (visible: boolean) => void;
  setMemberListVisible: (visible: boolean) => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
  leaveRoom: () => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      currentRoom: null,
      lastRoom: null,
      members: [],
      isConnected: false,
      isQrModalVisible: false,
      isMemberListVisible: false,
      setCurrentRoom: (currentRoom) => set({ currentRoom }),
      setLastRoom: (lastRoom) => set({ lastRoom }),
      setMembers: (members) => set({ members }),
      addMember: (member) =>
        set((state) => ({
          members: [...state.members.filter((m) => m.id !== member.id), member],
        })),
      removeMember: (memberId) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
        })),
      setConnected: (isConnected) => set({ isConnected }),
      setQrModalVisible: (isQrModalVisible) => set({ isQrModalVisible }),
      setMemberListVisible: (isMemberListVisible) => set({ isMemberListVisible }),
      updateRoomSettings: (newSettings) =>
        set((state) => ({
          currentRoom: state.currentRoom
            ? {
                ...state.currentRoom,
                settings: {
                  ...state.currentRoom.settings,
                  ...newSettings,
                },
              }
            : null,
        })),
      leaveRoom: () => set({ currentRoom: null, members: [] }),
    }),
    {
      name: 'queuemic_room_store',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ currentRoom: state.currentRoom, lastRoom: state.lastRoom }),
    }
  )
);
