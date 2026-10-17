import React from 'react';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import type { KaraokeQueueItem } from '../../types';
import { GlassCard } from '../common/GlassCard';

export interface WebQueueItemCardProps {
  item: KaraokeQueueItem;
  canReorder?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveTop?: () => void;
  onRemove?: () => void;
}

export const WebQueueItemCard: React.FC<WebQueueItemCardProps> = ({
  item,
  canReorder = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onMoveTop,
  onRemove,
}) => {
  return (
    <GlassCard variant="light" className="p-3 mb-2.5 transition-all hover:border-white/20">
      <div className="flex items-center gap-3">
        {/* Position Badge */}
        <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#C084FC]">#{item.position}</span>
        </div>

        {/* Thumbnail */}
        {item.song?.thumbnailUrl ? (
          <img
            src={item.song.thumbnailUrl}
            alt={item.song.title}
            className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-slate-400 text-xs">
            🎵
          </div>
        )}

        {/* Song Info */}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-white truncate">{item.song?.title || 'Unknown Title'}</h4>
          <p className="text-xs text-slate-400 truncate">{item.song?.artist || 'YouTube'}</p>
        </div>

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Remove from queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] my-2" />

      {/* Bottom Bar: Singer & Duration + Reorder actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#06B6D4]/15 text-[#22D3EE] border border-[#06B6D4]/30">
            🎤 {item.singerName}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            ⏱ {item.song?.durationFormatted}
          </span>
        </div>

        {/* Reorder Buttons */}
        {canReorder && (
          <div className="flex items-center gap-1.5">
            {canMoveUp && onMoveTop && (
              <button
                type="button"
                onClick={onMoveTop}
                className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider text-[#06B6D4] bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 border border-[#06B6D4]/30 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Move to top (Play next)"
              >
                ⚡ TOP
              </button>
            )}

            {canMoveUp && onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
                title="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}

            {canMoveDown && onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
                title="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
