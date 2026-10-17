import { create } from 'zustand';
import type { KaraokeQueueItem } from '../types';

interface QueueState {
  currentPlaying: KaraokeQueueItem | null;
  queue: KaraokeQueueItem[];
  setQueue: (queue: KaraokeQueueItem[]) => void;
  setCurrentPlaying: (item: KaraokeQueueItem | null) => void;
  addToQueue: (item: KaraokeQueueItem) => void;
  removeFromQueue: (queueItemId: number) => void;
  moveItem: (queueItemId: number, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  skipSong: () => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  currentPlaying: null,
  queue: [],
  setQueue: (queue) => set({ queue }),
  setCurrentPlaying: (currentPlaying) => set({ currentPlaying }),
  addToQueue: (item) =>
    set((state) => {
      if (state.currentPlaying?.id === item.id || state.queue.some((q) => q.id === item.id)) {
        return state;
      }
      if (!state.currentPlaying) {
        return {
          currentPlaying: { ...item, status: 'playing' },
          queue: state.queue,
        };
      }
      return {
        queue: [...state.queue, item],
      };
    }),
  removeFromQueue: (queueItemId) =>
    set((state) => ({
      queue: state.queue.filter((q) => q.id !== queueItemId),
    })),
  moveItem: (queueItemId, direction) =>
    set((state) => {
      const index = state.queue.findIndex((item) => item.id === queueItemId);
      if (index === -1) return state;
      let targetIndex = index;
      if (direction === 'up') targetIndex = index - 1;
      else if (direction === 'down') targetIndex = index + 1;
      else if (direction === 'top') targetIndex = 0;
      else if (direction === 'bottom') targetIndex = state.queue.length - 1;

      if (targetIndex < 0 || targetIndex >= state.queue.length || targetIndex === index) return state;

      const newQueue = [...state.queue];
      const [movedItem] = newQueue.splice(index, 1);
      newQueue.splice(targetIndex, 0, movedItem);

      return {
        queue: newQueue.map((item, idx) => ({ ...item, position: idx + 2 })),
      };
    }),
  reorderQueue: (fromIndex, toIndex) =>
    set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.queue.length ||
        toIndex < 0 ||
        toIndex >= state.queue.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const newQueue = [...state.queue];
      const [movedItem] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedItem);

      return {
        queue: newQueue.map((item, idx) => ({ ...item, position: idx + 2 })),
      };
    }),
  skipSong: () =>
    set((state) => {
      if (state.queue.length === 0) {
        return { currentPlaying: null };
      }
      const [nextSong, ...remaining] = state.queue;
      return {
        currentPlaying: { ...nextSong, status: 'playing', playedAt: new Date().toISOString() },
        queue: remaining.map((item, idx) => ({ ...item, position: idx + 2 })),
      };
    }),
}));
