import React from 'react';
import { Play, Pause, SkipForward, Maximize2, Minimize2 } from 'lucide-react';
import type { KaraokeQueueItem, PlaybackState } from '../../types';
import { formatDuration } from '../../utils/formatting';

export interface WebPlaybackControlsProps {
  currentSong?: KaraokeQueueItem | null;
  playbackState: PlaybackState;
  onPlayPause?: () => void;
  onSkip?: () => void;
  onSeek?: (seconds: number) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  currentTimeSeconds?: number;
  durationSeconds?: number;
  canControlPlayback?: boolean;
  isHost?: boolean;
  showOutsideControls?: boolean;
}

export const WebPlaybackControls: React.FC<WebPlaybackControlsProps> = ({
  currentSong,
  playbackState,
  onPlayPause,
  onSkip,
  onSeek,
  onToggleFullscreen,
  isFullscreen = false,
  currentTimeSeconds = 0,
  durationSeconds = 0,
  canControlPlayback = true,
  isHost = true,
  showOutsideControls = false,
}) => {
  const isPlaying = Boolean(currentSong && playbackState === 'playing');
  const isBuffering = Boolean(currentSong && playbackState === 'buffering');
  const effectiveDuration =
    durationSeconds > 0
      ? durationSeconds
      : currentSong?.song?.durationSeconds || 0;
  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, Math.max(0, (currentTimeSeconds / effectiveDuration) * 100))
      : 0;

  const rawSinger = currentSong?.singerName || (currentSong as any)?.singer_name;
  const singerName = rawSinger ? String(rawSinger) : null;
  const songTitle = currentSong?.song?.title || (currentSong ? 'Karaoke Track' : null);
  const songArtist = currentSong?.song?.artist;

  const shouldShowControlsBar = Boolean(showOutsideControls || (isHost && canControlPlayback));

  return (
    <div
      className={`w-full bg-[#0C0C16]/95 border-b border-white/[0.08] px-4 select-none transition-all ${
        shouldShowControlsBar ? 'pt-3 pb-3.5' : 'py-2.5'
      }`}
    >
      {/* Top Header: Live Status Indicator & On Stage Singer */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isPlaying
                ? 'bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse'
                : isBuffering
                ? 'bg-[#F59E0B]'
                : 'bg-[#F43F5E]'
            }`}
          />
          <span className="text-[#94A3B8] font-black tracking-[0.8px] text-[10px] uppercase">
            {isPlaying
              ? 'STAGE LIVE'
              : isBuffering
              ? 'TUNING...'
              : 'PAUSED'}
          </span>
        </div>

        {singerName ? (
          <div className="flex items-center gap-1 text-[11px] text-[#94A3B8] truncate max-w-[200px]">
            <span className="text-xs">🎤</span>
            <span className="truncate">
              On Stage: <strong className="text-[#F59E0B] font-extrabold">{singerName}</strong>
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[#64748B] font-semibold">QueueMic Live</span>
        )}
      </div>

      {/* Song Title & Artist Meta */}
      <div className={`min-h-[20px] flex items-center ${shouldShowControlsBar ? 'mb-2.5' : ''}`}>
        {songTitle ? (
          <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
            <h4 className="text-[15px] font-extrabold text-[#F8FAFC] truncate uppercase tracking-wide">
              {songTitle}
            </h4>
            {songArtist && <p className="text-xs text-[#94A3B8] font-semibold truncate shrink-0">{songArtist}</p>}
          </div>
        ) : (
          <p className="text-xs text-[#64748B]">Waiting for the next song to start...</p>
        )}
      </div>

      {/* Controls & Scrubber: Only shown when shouldShowControlsBar is true */}
      {shouldShowControlsBar && (
        <>
          {/* Sleek Interactive Timeline / Scrubber matching mobapp */}
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-[11px] font-bold font-mono text-[#94A3B8] w-9 tabular-nums shrink-0">
              {formatDuration(currentTimeSeconds)}
            </span>
            <div
              onClick={(e) => {
                if (!onSeek || !canControlPlayback || effectiveDuration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                const target = Math.floor(Math.max(0, Math.min(1, clickPos)) * effectiveDuration);
                onSeek(target);
              }}
              className={`flex-1 h-[5px] bg-white/12 rounded-full relative cursor-pointer group/bar ${
                !canControlPlayback ? 'pointer-events-none' : ''
              }`}
            >
              <div
                className="h-full bg-[#06B6D4] rounded-full relative transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white" />
              </div>
            </div>
            <span className="text-[11px] font-bold font-mono text-[#94A3B8] w-9 text-right tabular-nums shrink-0">
              {effectiveDuration > 0 ? formatDuration(effectiveDuration) : '--:--'}
            </span>
          </div>

          {/* Bottom Action Row: Controls + Fullscreen Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Hero Play / Pause Button with solid flat color matching mobapp */}
              {onPlayPause && (
                <button
                  type="button"
                  onClick={onPlayPause}
                  className={`h-[32px] px-3 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.25 min-w-[78px] active:scale-95 transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-[#F43F5E] hover:bg-[#E11D48] text-white'
                      : 'bg-[#10B981] hover:bg-[#059669] text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 fill-white text-white" strokeWidth={2} />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-white text-white translate-x-0.5" strokeWidth={2} />
                      <span>Play</span>
                    </>
                  )}
                </button>
              )}

              {/* Next / Skip Button in Cyber Violet - Exactly same size as Play/Pause */}
              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="h-[32px] px-3 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-[11px] font-extrabold flex items-center justify-center gap-1.25 min-w-[78px] active:scale-95 transition-all cursor-pointer"
                >
                  <SkipForward className="w-3 h-3 fill-white text-white" strokeWidth={2} />
                  <span>Next</span>
                </button>
              )}
            </div>

            {/* Fullscreen Button in Electric Cyan */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="h-[32px] px-2.5 rounded-lg bg-[#06B6D4]/12 hover:bg-[#06B6D4]/20 border border-[#06B6D4]/35 text-[#06B6D4] text-[11px] font-extrabold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3 h-3 stroke-[2.5]" />
                    <span>Exit</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3 stroke-[2.5]" />
                    <span>Fullscreen</span>
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
