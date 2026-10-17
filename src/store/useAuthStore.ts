import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MemberRole } from '../types';
import { appStorage } from '../utils/storage';

interface AuthState {
  token: string | null;
  memberId: number | null;
  nickname: string;
  avatarColor: string;
  role: MemberRole;
  deviceUuid: string;
  setAuth: (payload: {
    token: string;
    memberId: number;
    nickname: string;
    avatarColor: string;
    role: MemberRole;
  }) => void;
  setNickname: (nickname: string, avatarColor?: string) => void;
  setAvatarColor: (avatarColor: string) => void;
  setRole: (role: MemberRole) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      memberId: null,
      nickname: '',
      avatarColor: '#8B5CF6',
      role: 'guest',
      deviceUuid: `device-web-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 12)}`,
      setAuth: (payload) => set((state) => ({ ...state, ...payload })),
      setNickname: (nickname, avatarColor) =>
        set((state) => ({
          ...state,
          nickname: nickname.trim(),
          ...(avatarColor ? { avatarColor } : {}),
        })),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      setRole: (role) => set({ role }),
      clearAuth: () =>
        set({
          token: null,
          memberId: null,
          nickname: '',
          role: 'guest',
        }),
    }),
    {
      name: 'queuemic_auth_store',
      storage: createJSONStorage(() => appStorage),
    }
  )
);
