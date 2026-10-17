import { useQueueStore } from '../store/useQueueStore';
import { queueApi } from '../api/queueApi';
import { runOptimistic } from '../utils/optimistic';

export interface UseRoomQueueActionsOptions {
  /** Guests may move songs only when the room allows it; the host always can */
  canReorder?: boolean;
}

/**
 * Queue edits shared by the Host and Guest room pages: applied to the store at once, and undone by re-reading
 * the queue from the server when the request fails (spec §8 rollback).
 */
export function useRoomQueueActions(roomCode: string, { canReorder = true }: UseRoomQueueActionsOptions = {}) {
  const { queue, moveItem, removeFromQueue, setQueue, reorderQueue } = useQueueStore();

  const restoreQueue = async () => {
    try {
      const res = await queueApi.getQueue(roomCode);
      if (res.success && Array.isArray(res.data)) {
        const currentId = useQueueStore.getState().currentPlaying?.id;
        setQueue(res.data.filter((item) => item.id !== currentId));
      }
    } catch (err) {
      console.warn('Queue resync error:', err);
    }
  };

  const handleMoveItem = async (queueId: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (!canReorder) return;
    await runOptimistic(
      () => moveItem(queueId, direction),
      restoreQueue,
      () => queueApi.moveQueueItem(roomCode, queueId, { direction })
    );
  };

  const handleReorderItem = async (queueId: number, targetPosition: number) => {
    if (!canReorder) return;
    const fromIndex = queue.findIndex((q) => q.id === queueId);
    await runOptimistic(
      () => reorderQueue(fromIndex, targetPosition - 1),
      restoreQueue,
      () => queueApi.moveQueueItem(roomCode, queueId, { target_position: targetPosition })
    );
  };

  const handleRemoveItem = async (queueId: number) => {
    await runOptimistic(
      () => removeFromQueue(queueId),
      restoreQueue,
      () => queueApi.removeFromQueue(roomCode, queueId)
    );
  };

  return { handleMoveItem, handleReorderItem, handleRemoveItem };
}
