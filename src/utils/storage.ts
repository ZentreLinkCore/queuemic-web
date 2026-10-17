import type { StateStorage } from 'zustand/middleware';

let hasWarnedStorageFailure = false;
const warnStorageFailure = (error: unknown) => {
  if (hasWarnedStorageFailure) return;
  hasWarnedStorageFailure = true;
  console.warn('⚠️ [Storage Error] Session will not survive a reload:', error);
};

export const appStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      return null;
    } catch (e) {
      warnStorageFailure(e);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
      }
    } catch (e) {
      warnStorageFailure(e);
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      }
    } catch (e) {
      warnStorageFailure(e);
    }
  },
};
