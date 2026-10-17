import React, { useEffect } from 'react';
import { X, Music, Clock, Mic, PlaySquare, Hash } from 'lucide-react';
import type { KaraokeQueueItem } from '../../types';
import { GlassCard } from '../common/GlassCard';
import { NeonButton } from '../common/NeonButton';

export interface WebSongDetailsModalProps {
  visible: boolean;
  songItem: KaraokeQueueItem | null;
  onClose: () => void;
  badgeLabel?: string;
  badgeColor?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger';
}

export const WebSongDetailsModal: React.FC<WebSongDetailsModalProps> = ({
  visible,
  songItem,
  onClose,
  badgeLabel = 'NOW PLAYING',
  badgeColor = 'accent',
}) => {
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible || !songItem) return null;

  const song = songItem.song;
  const title = song?.title || (songItem as any)?.title || 'Karaoke Song';
  const artist = song?.artist || (songItem as any)?.artist || 'YouTube Karaoke';
  const singer = songItem.singerName || (songItem as any)?.singer_name || 'Singer';
  const duration =
    song?.durationFormatted ||
    (song as any)?.duration_formatted ||
    (song?.durationSeconds
      ? `${Math.floor(song.durationSeconds / 60)}:${String(song.durationSeconds % 60).padStart(2, '0')}`
      : null);
  const thumbnail =
    song?.thumbnailUrl ||
    (song as any)?.thumbnail_url ||
    (song?.externalVideoId ? `https://img.youtube.com/vi/${song.externalVideoId}/hqdefault.jpg` : null);

  const badgeColorStyles: Record<string, string> = {
    primary: 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/30',
    secondary: 'bg-[#06B6D4] text-black shadow-sm shadow-[#06B6D4]/30',
    accent: 'bg-[#F59E0B] text-black shadow-sm shadow-[#F59E0B]/30',
    success: 'bg-[#10B981] text-white shadow-sm shadow-[#10B981]/30',
    danger: 'bg-[#F43F5E] text-white shadow-sm shadow-[#F43F5E]/30',
  };

  const glowStyles: Record<string, 'primary' | 'cyan' | 'pink' | 'danger' | 'none'> = {
    primary: 'primary',
    secondary: 'cyan',
    accent: 'pink',
    success: 'cyan',
    danger: 'danger',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="song-details-title"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <GlassCard
          variant="elevated"
          glow={glowStyles[badgeColor] || 'primary'}
          className="w-full p-5 sm:p-6 relative flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-4 shrink-0">
            <span
              className={`px-3 py-1 rounded-lg text-[11px] font-black tracking-wider uppercase ${
                badgeColorStyles[badgeColor] || badgeColorStyles.accent
              }`}
            >
              {badgeLabel}
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Song Thumbnail */}
            {thumbnail ? (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 relative group shadow-lg">
                <img
                  src={thumbnail}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center text-slate-500 shrink-0">
                <Music className="w-12 h-12 mb-2 text-slate-600" />
                <span className="text-xs font-semibold">Karaoke Music</span>
              </div>
            )}

            {/* Song Title & Artist */}
            <div>
              <h2
                id="song-details-title"
                className="text-lg sm:text-xl font-extrabold text-white mb-1 leading-snug font-['Outfit'] break-words"
              >
                {title}
              </h2>
              <p className="text-sm font-semibold text-slate-400 break-words">
                {artist}
              </p>
            </div>

            {/* Meta Details Card matching mobapp */}
            <div className="bg-[#1C1F30] border border-white/[0.08] rounded-xl p-3.5 space-y-2.5">
              {/* Singer Row */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-slate-500" />
                  Singer on Stage
                </span>
                <span className="font-extrabold text-[#22D3EE] flex items-center gap-1">
                  <span>🎤</span>
                  <span>{singer}</span>
                </span>
              </div>

              {/* Duration Row */}
              {duration && (
                <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-white/[0.06]">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Duration
                  </span>
                  <span className="font-bold text-white font-mono">
                    ⏱ {duration}
                  </span>
                </div>
              )}

              {/* Queue Position Row (if present) */}
              {typeof (songItem as any)?.position === 'number' && (
                <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-white/[0.06]">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    Party Queue
                  </span>
                  <span className="font-bold text-[#C084FC]">
                    #{(songItem as any).position} in Line
                  </span>
                </div>
              )}

              {/* Source Provider */}
              <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-white/[0.06]">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <PlaySquare className="w-3.5 h-3.5 text-slate-500" />
                  Source
                </span>
                <span className="font-bold text-[#8B5CF6] flex items-center gap-1">
                  <span>▶</span> YouTube Karaoke
                </span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="pt-4 border-t border-white/[0.08] mt-2 shrink-0">
            <NeonButton
              variant="secondary"
              size="md"
              onClick={onClose}
              className="w-full justify-center"
            >
              Close
            </NeonButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
