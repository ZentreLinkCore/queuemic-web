import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Radio } from 'lucide-react';
import type { KaraokeQueueItem, PlaybackState, PlaybackSyncAnchor } from '../../types';
import { formatDuration } from '../../utils/formatting';
import { GlassCard } from '../common/GlassCard';
import { WebSongDetailsModal } from './WebSongDetailsModal';

export interface WebGuestProgressBarProps {
  currentSong: KaraokeQueueItem | null;
  playbackState: PlaybackState;
  syncAnchor: PlaybackSyncAnchor | null;
  currentTimeSeconds?: number;
  durationSeconds: number;
  canControlPlayback?: boolean;
  onPlayPause?: () => void;
  onSkip?: () => void;
}

export const WebGuestProgressBar: React.FC<WebGuestProgressBarProps> = ({
  currentSong,
  playbackState,
  syncAnchor,
  currentTimeSeconds,
  durationSeconds,
  canControlPlayback = false,
  onPlayPause,
  onSkip,
}) => {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [livePosition, setLivePosition] = useState<number>(0);
  const isPlaying = playbackState === 'playing';

  useEffect(() => {
    if (!currentSong) {
      setLivePosition(0);
      return;
    }

    const calculatePosition = () => {
      // 1. If we have live video currentTimeSeconds reported from the mounted player
      if (typeof currentTimeSeconds === 'number' && currentTimeSeconds > 0) {
        return Math.max(
          0,
          durationSeconds > 0 ? Math.min(currentTimeSeconds, durationSeconds) : currentTimeSeconds
        );
      }

      // 2. Otherwise extrapolate from syncAnchor
      if (syncAnchor && syncAnchor.queueItemId === currentSong.id) {
        const anchorIsPlaying = isPlaying && syncAnchor.state === 'playing';
        const elapsed = anchorIsPlaying ? Math.max(0, (Date.now() - syncAnchor.receivedAtMs) / 1000) : 0;
        const expected = syncAnchor.positionSeconds + elapsed;
        return Math.max(0, durationSeconds > 0 ? Math.min(expected, durationSeconds) : expected);
      }

      // 3. Fallback
      return typeof currentTimeSeconds === 'number' ? currentTimeSeconds : 0;
    };

    setLivePosition(calculatePosition());

    // If paused, freeze position and do not poll
    if (!isPlaying) {
      return;
    }

    const interval = setInterval(() => {
      setLivePosition(calculatePosition());
    }, 250);

    return () => clearInterval(interval);
  }, [currentSong?.id, isPlaying, syncAnchor, currentTimeSeconds, durationSeconds]);

  if (!currentSong) {
    return (
      <GlassCard variant="surface" className="p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span>Stage is waiting for next song</span>
        </div>
      </GlassCard>
    );
  }

  const song = currentSong.song;
  const progressPercent = durationSeconds > 0 ? (livePosition / durationSeconds) * 100 : 0;

  return (
    <GlassCard variant="surface" glow="primary" className="p-4 sm:p-5 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <div className="flex items-end gap-0.5 h-3.5 w-3 shrink-0 pb-0.5" aria-hidden="true">
              <span className="w-0.5 bg-emerald-400 rounded-full animate-equalizer-1 shadow-[0_0_4px_#34D399]" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-equalizer-2 shadow-[0_0_4px_#34D399]" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-equalizer-3 shadow-[0_0_4px_#34D399]" />
            </div>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
          )}
          <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase font-['Outfit'] flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> LIVE TV SYNC
          </span>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#8B5CF6]/20 text-[#C084FC] border border-[#8B5CF6]/30">
          🎤 {currentSong.singerName}
        </span>
      </div>

      {/* Song details (Clickable to view full details) */}
      <div
        onClick={() => setIsDetailsVisible(true)}
        className="flex items-center gap-3.5 mb-4 cursor-pointer group"
        title="Click to view song details"
      >
        {song?.thumbnailUrl ? (
          <img
            src={song.thumbnailUrl}
            alt={song.title}
            className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 text-slate-400" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white truncate font-['Outfit'] group-hover:text-[#06B6D4] transition-colors">
            {song?.title || 'Unknown Title'}
          </h3>
          <p className="text-xs text-slate-400 truncate">{song?.artist || 'YouTube'}</p>
        </div>
      </div>

      {/* Synchronized Progress Bar */}
      <div className="mb-2">
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#06B6D4] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 font-mono mt-1.5">
          <span>{formatDuration(livePosition)}</span>
          <span>{formatDuration(durationSeconds || song?.durationSeconds || 0)}</span>
        </div>
      </div>

      {/* Optional Guest Controls if enabled by host */}
      {canControlPlayback && (
        <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-4">
          {onPlayPause && (
            <button
              onClick={onPlayPause}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Play
                </>
              )}
            </button>
          )}

          {onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          )}
        </div>
      )}

      {/* Song Details Modal */}
      <WebSongDetailsModal
        visible={isDetailsVisible}
        songItem={currentSong}
        onClose={() => setIsDetailsVisible(false)}
        badgeLabel={isPlaying ? 'NOW PLAYING 🔴' : 'PAUSED ⏸'}
        badgeColor={isPlaying ? 'success' : 'accent'}
      />
    </GlassCard>
  );
};
