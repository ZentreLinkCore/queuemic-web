import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { KaraokeQueueItem } from '../../types';
import { WebQueueItemCard } from './WebQueueItemCard';
import { WebNextUpCard } from '../player/WebNextUpCard';
import { GlassCard } from '../common/GlassCard';

export interface WebQueueListProps {
  queue: KaraokeQueueItem[];
  canReorder?: boolean;
  memberId?: number | null;
  isHost?: boolean;
  title?: string;
  subtitle?: string;
  onMoveItem?: (queueId: number, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  /** Drag-and-drop reorder: `targetPosition` is the 1-based position in the queue (backend `target_position`). */
  onReorder?: (queueId: number, targetPosition: number) => void;
  onRemoveItem?: (queueId: number) => void;
  onOpenSearch?: () => void;
  nextSong?: KaraokeQueueItem | null;
  onSkipNext?: () => void;
  className?: string;
}

export const WebQueueList: React.FC<WebQueueListProps> = ({
  queue,
  canReorder = false,
  memberId,
  isHost = false,
  title,
  subtitle,
  onMoveItem,
  onReorder,
  onRemoveItem,
  onOpenSearch,
  nextSong,
  onSkipNext,
  className = '',
}) => {
  const isScrollable = className.includes('h-full') || className.includes('flex-1') || className.includes('h-');
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const canDrag = canReorder && Boolean(onReorder);

  const handleDrop = (targetIndex: number) => {
    if (draggingId !== null && onReorder) {
      const fromIndex = queue.findIndex((q) => q.id === draggingId);
      if (fromIndex !== -1 && fromIndex !== targetIndex) onReorder(draggingId, targetIndex + 1);
    }
    setDraggingId(null);
    setDragOverIndex(null);
  };

  const handleRemove = (item: KaraokeQueueItem) => {
    if (!window.confirm(`Remove "${item.song?.title || 'this song'}" from the queue?`)) return;
    onRemoveItem?.(item.id);
  };

  return (
    <GlassCard
      variant="surface"
      className={`w-full flex flex-col p-4 sm:p-5 border-white/[0.08] ${
        isScrollable ? 'h-full min-h-0 flex-1' : 'h-auto'
      } ${className}`}
    >
      {/* Optional Next Up Card on top of list if provided */}
      {nextSong && (
        <div className="mb-3.5 shrink-0">
          <WebNextUpCard nextSong={nextSong} onSkip={onSkipNext} onOpenSearch={onOpenSearch} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3 shrink-0">
        <div>
          <h3 className="text-base font-bold text-white font-['Outfit'] tracking-normal">
            {title || (isHost ? 'Host Queue Manager' : 'Up Next in Queue')}
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            {subtitle || (isHost ? 'Reorder, skip, or remove songs in queue' : `${queue.length} songs waiting`)}
          </p>
        </div>

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-105 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Song</span>
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        /* Empty Queue State matching mobapp EmptyQueueState */
        <div
          className={`flex flex-col items-center justify-center py-7 px-4 text-center border border-dashed border-white/10 rounded-2xl bg-[rgba(26,29,44,0.72)] my-1 ${
            isScrollable ? 'flex-1' : ''
          }`}
        >
          <div className="w-[68px] h-[68px] rounded-full bg-[#1C1F30] border-[1.5px] border-[#8B5CF6]/40 flex items-center justify-center mb-2.5">
            <span className="text-3xl select-none leading-none">🎙️</span>
          </div>
          <h4 className="text-base font-bold text-white mb-1 font-['Outfit']">Queue is empty.</h4>
          <p className="text-xs text-[#94A3B8] max-w-xs leading-relaxed">Search songs to get the party started!</p>
        </div>
      ) : (
        /* List of tracks - Scrollable with custom styled scrollbar */
        <div
          className={`space-y-2 pr-1.5 ${
            isScrollable ? 'overflow-y-auto flex-1 min-h-0 overscroll-contain' : 'overflow-y-auto max-h-[60vh]'
          }`}
        >
          {queue.map((item, index) => {
            const isMySong = memberId && item.requestedByMemberId === memberId;
            const canRemove = isHost || isMySong;

            const isDropTarget = canDrag && dragOverIndex === index && draggingId !== item.id;

            return (
              <div
                key={item.id}
                data-testid={`queue-row-${item.id}`}
                draggable={canDrag}
                onDragStart={canDrag ? () => setDraggingId(item.id) : undefined}
                onDragOver={canDrag ? (e) => { e.preventDefault(); setDragOverIndex(index); } : undefined}
                onDragLeave={canDrag ? () => setDragOverIndex(null) : undefined}
                onDrop={canDrag ? (e) => { e.preventDefault(); setDragOverIndex(null); handleDrop(index); } : undefined}
                onDragEnd={canDrag ? () => { setDraggingId(null); setDragOverIndex(null); } : undefined}
                className={`rounded-2xl transition-all ${
                  draggingId === item.id
                    ? 'opacity-50'
                    : isDropTarget
                    ? 'border-t-2 border-[#06B6D4]'
                    : ''
                }`}
              >
                <WebQueueItemCard
                  item={item}
                  canReorder={canReorder}
                  canMoveUp={index > 0}
                  canMoveDown={index < queue.length - 1}
                  onMoveTop={() => onMoveItem?.(item.id, 'top')}
                  onMoveUp={() => onMoveItem?.(item.id, 'up')}
                  onMoveDown={() => onMoveItem?.(item.id, 'down')}
                  onRemove={canRemove ? () => handleRemove(item) : undefined}
                />
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
