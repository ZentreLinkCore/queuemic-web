import React from 'react';
import { FastForward, Plus, Music } from 'lucide-react';
import type { KaraokeQueueItem } from '../../types';
import { formatDuration } from '../../utils/formatting';

export interface WebNextUpCardProps {
  nextSong: KaraokeQueueItem | null;
  onSkip?: () => void;
  onOpenSearch?: () => void;
}

export const WebNextUpCard: React.FC<WebNextUpCardProps> = ({
  nextSong,
  onSkip,
  onOpenSearch,
}) => {
  const songTitle = nextSong?.song?.title || (nextSong as any)?.title || 'Karaoke Track';
  const singer = nextSong?.singerName || (nextSong as any)?.singer_name || 'Singer';
  const songArtist = nextSong?.song?.artist || '';
  const durationSec = nextSong?.song?.durationSeconds || 0;

  return (
    <div className="w-full px-4 py-3 rounded-2xl bg-[#12131C] border border-white/[0.08] shadow-sm flex items-center justify-between gap-3 shrink-0 transition-all select-none">
      {nextSong ? (
        <>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Amber Up Next Pill Badge (matching mobapp) */}
            <div className="px-2.5 py-1 rounded-lg bg-[#F59E0B] text-black font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm shrink-0">
              <span>⚡️</span>
              <span>UP NEXT</span>
            </div>

            {/* Thumbnail if available (hidden on mobile, visible on tablet/desktop) */}
            {nextSong.song?.thumbnailUrl ? (
              <img
                src={nextSong.song.thumbnailUrl}
                alt={songTitle}
                className="hidden sm:block w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0 bg-[#1E1F2E]"
              />
            ) : (
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 items-center justify-center shrink-0">
                <Music className="w-4 h-4 text-slate-400" />
              </div>
            )}

            {/* Song Meta */}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wide truncate">
                {songTitle}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 truncate">
                <span>
                  Singer:{' '}
                  <strong className="text-[#C084FC] font-extrabold">{singer}</strong>
                </span>
                {songArtist && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="truncate">{songArtist}</span>
                  </>
                )}
                {durationSec > 0 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatDuration(durationSec)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Play Next action (hidden on mobile, visible on desktop) */}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="hidden sm:flex px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-slate-200 hover:text-white text-xs font-bold items-center gap-1.5 transition-all cursor-pointer border border-white/10 shrink-0"
              title="Play this track now"
            >
              <FastForward className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Play Next</span>
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="px-2.5 py-1 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] font-black text-[10px] tracking-wider uppercase shrink-0">
              UP NEXT
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">
              No tracks waiting in line — search songs to queue up next!
            </p>
          </div>

          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Add Song</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};
