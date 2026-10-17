import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, Maximize, Minimize, Volume2, VolumeX, QrCode, Plus, ListMusic, Tv } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { KaraokeQueueItem, PlaybackState, PlaybackSyncAnchor } from '../../types';
import { formatDuration } from '../../utils/formatting';
import { usePlaybackStore } from '../../store/usePlaybackStore';

const DRIFT_TOLERANCE_SECONDS = 0.4;
const RESYNC_COOLDOWN_MS = 3000;

let youTubeApiPromise: Promise<any> | null = null;
export const loadYouTubeIframeApi = (): Promise<any> => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (!youTubeApiPromise) {
    youTubeApiPromise = new Promise((resolve) => {
      const prevCallback = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        resolve(w.YT);
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    });
  }
  return youTubeApiPromise;
};

export const getExpectedPosition = (anchor: PlaybackSyncAnchor): number =>
  anchor.positionSeconds + (anchor.state === 'playing' ? (Date.now() - anchor.receivedAtMs) / 1000 : 0);

export interface WebVideoPlayerProps {
  currentSong: KaraokeQueueItem | null;
  playbackState: PlaybackState;
  isFullscreen?: boolean;
  onSongEnd?: () => void;
  onPlaybackStateChange?: (state: PlaybackState) => void;
  onToggleFullscreen?: () => void;
  onPlayPause?: () => void;
  onSkip?: () => void;
  onSeek?: (seconds: number) => void;
  seekTarget?: number | null;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  currentTimeSeconds?: number;
  durationSeconds?: number;
  syncAnchor?: PlaybackSyncAnchor | null;
  followHost?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  roomCode?: string;
  nextSong?: KaraokeQueueItem | null;
  queueCount?: number;
  onOpenSearch?: () => void;
  onOpenQueue?: () => void;
}

export const WebVideoPlayer: React.FC<WebVideoPlayerProps> = ({
  currentSong,
  playbackState,
  isFullscreen = false,
  onSongEnd,
  onPlaybackStateChange,
  onToggleFullscreen,
  onPlayPause,
  onSkip,
  onSeek,
  seekTarget,
  onTimeUpdate,
  currentTimeSeconds = 0,
  durationSeconds = 0,
  syncAnchor = null,
  followHost = false,
  muted = false,
  onToggleMute,
  roomCode,
  nextSong = null,
  queueCount = 0,
  onOpenSearch,
  onOpenQueue,
}) => {
  const [videoPhase, setVideoPhase] = useState<'loading' | 'playing' | 'paused' | 'ended'>('loading');
  const [webNeedsTap, setWebNeedsTap] = useState(false);
  const [webAutoMuted, setWebAutoMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showQrOverlay, setShowQrOverlay] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const lastResyncAtRef = useRef<number>(0);
  const isBufferingRef = useRef<boolean>(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlaying = playbackState === 'playing';

  // Internal reactive playback time and duration for zero-lag smooth progress tracking
  const [localTime, setLocalTime] = useState<number>(currentTimeSeconds);
  const [localDuration, setLocalDuration] = useState<number>(durationSeconds || currentSong?.song?.durationSeconds || 0);

  const videoId = currentSong?.song?.externalVideoId || '';
  const anchorForSong =
    syncAnchor && currentSong && syncAnchor.queueItemId === currentSong.id ? syncAnchor : null;
  const startSeconds = anchorForSong ? Math.max(0, Math.floor(getExpectedPosition(anchorForSong))) : 0;

  // Sync state when props or currentSong changes
  useEffect(() => {
    setLocalTime(0);
    const initialDur = durationSeconds > 0 ? durationSeconds : currentSong?.song?.durationSeconds || 0;
    setLocalDuration(initialDur);
  }, [currentSong?.id]);

  useEffect(() => {
    if (currentTimeSeconds > 0 && Math.abs(currentTimeSeconds - localTime) > 1.5) {
      setLocalTime(currentTimeSeconds);
    }
  }, [currentTimeSeconds]);

  useEffect(() => {
    if (durationSeconds > 0 && durationSeconds !== localDuration) {
      setLocalDuration(durationSeconds);
    }
  }, [durationSeconds]);

  // Smooth local ticker when playing so progress bar never freezes
  useEffect(() => {
    if (!isPlaying || !currentSong) return;
    const ticker = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const cur = playerRef.current.getCurrentTime();
        if (typeof cur === 'number' && !isNaN(cur)) {
          setLocalTime(Math.round(cur * 100) / 100);
          return;
        }
      }
      if (anchorForSong && anchorForSong.state === 'playing') {
        setLocalTime(Math.round(getExpectedPosition(anchorForSong) * 100) / 100);
        return;
      }
      setLocalTime((prev) => prev + 0.25);
    }, 250);
    return () => clearInterval(ticker);
  }, [isPlaying, currentSong?.id, anchorForSong]);

  const wakeControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
    } else {
      wakeControls();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, [isPlaying, wakeControls]);

  // Toggle true browser HTML5 Fullscreen API with fallback
  const handleToggleFullscreen = useCallback(async (e?: React.SyntheticEvent | Event) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    try {
      const doc = document as any;
      const isNative = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (isNative) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        usePlaybackStore.getState().setFullscreen(false);
      } else if (isFullscreen) {
        usePlaybackStore.getState().setFullscreen(false);
      } else {
        const el = document.documentElement as any;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else {
          usePlaybackStore.getState().setFullscreen(true);
        }
      }
    } catch {
      usePlaybackStore.getState().setFullscreen(!isFullscreen);
    }
  }, [isFullscreen, onToggleFullscreen]);

  // Synchronize browser native fullscreen change events (e.g. user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      usePlaybackStore.getState().setFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut 'F' to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleFullscreen]);

  // Discriminate single-click (play/pause) from double-click (fullscreen toggle)
  const handleVideoSurfaceClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, a, input, [role="button"], [data-no-toggle]')) {
        return;
      }

      if (clickTimeoutRef.current) {
        // Second click arrived within interval -> cancel pending play/pause so double-click handles it
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        return;
      }

      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        onPlayPause?.();
      }, 220);
    },
    [onPlayPause]
  );

  const handleVideoSurfaceDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, a, input, [role="button"], [data-no-toggle]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      handleToggleFullscreen();
    },
    [handleToggleFullscreen]
  );

  // Sync to room position when drift exceeds tolerance
  const resyncToRoom = (actualSeconds: number) => {
    if (!anchorForSong || anchorForSong.state !== 'playing' || !isPlaying || isBufferingRef.current) return;
    const expected = getExpectedPosition(anchorForSong);
    if (durationSeconds > 0 && expected >= durationSeconds) return;
    if (Date.now() - lastResyncAtRef.current < RESYNC_COOLDOWN_MS) return;

    const drift = expected - actualSeconds;
    if (Math.abs(drift) > DRIFT_TOLERANCE_SECONDS) {
      lastResyncAtRef.current = Date.now();
      try {
        playerRef.current?.seekTo(expected, true);
      } catch (e) {}
    }
  };

  // Mount official YouTube IFrame Player
  useEffect(() => {
    if (!videoId || typeof window === 'undefined') return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    setVideoPhase('loading');
    setWebNeedsTap(false);
    setWebAutoMuted(false);

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = '';

      const targetDiv = document.createElement('div');
      containerRef.current.appendChild(targetDiv);

      playerRef.current = new YT.Player(targetDiv, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          playsinline: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          start: startSeconds,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            try {
              if (muted || followHost) {
                e.target.mute();
              } else {
                e.target.unMute();
                e.target.setVolume(100);
              }
              if (isPlaying) {
                e.target.playVideo();
              }
            } catch (err) {}

            pollTimer = setInterval(() => {
              const p = playerRef.current;
              if (!p || typeof p.getCurrentTime !== 'function') return;
              const cur = Math.round((p.getCurrentTime() || 0) * 100) / 100;
              const dur = Math.floor(p.getDuration() || 0);
              const effectiveDur = dur > 0 ? dur : (currentSong?.song?.durationSeconds || 0);
              setLocalTime(cur);
              if (effectiveDur > 0) {
                setLocalDuration(effectiveDur);
              }
              onTimeUpdate?.(cur, effectiveDur);
              if (followHost) resyncToRoom(cur);
            }, 250);

            // Check if autoplay was blocked by browser
            setTimeout(() => {
              if (isPlaying && playerRef.current) {
                const state = playerRef.current.getPlayerState?.();
                if (state !== 1 && state !== 3) {
                  if (followHost) {
                    playerRef.current.mute();
                    playerRef.current.playVideo();
                    setWebAutoMuted(true);
                  } else {
                    setWebNeedsTap(true);
                  }
                }
              }
            }, 1200);
          },
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PLAYING) {
              isBufferingRef.current = false;
              setWebNeedsTap(false);
              setVideoPhase('playing');
              if (!followHost && !isPlaying) onPlaybackStateChange?.('playing');
            } else if (e.data === YT.PlayerState.PAUSED) {
              setVideoPhase('paused');
              if (!followHost && isPlaying) onPlaybackStateChange?.('paused');
            } else if (e.data === YT.PlayerState.BUFFERING) {
              isBufferingRef.current = true;
            } else if (e.data === YT.PlayerState.ENDED) {
              setVideoPhase('ended');
              onSongEnd?.();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      try {
        playerRef.current?.destroy();
      } catch (e) {}
      playerRef.current = null;
    };
  }, [videoId]);

  // Handle external play/pause
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch (e) {}
  }, [isPlaying]);

  // Handle external seek target
  useEffect(() => {
    if (seekTarget !== null && seekTarget !== undefined && playerRef.current) {
      try {
        playerRef.current.seekTo(seekTarget, true);
      } catch (e) {}
    }
  }, [seekTarget]);

  // Handle mute changes
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (muted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      }
    } catch (e) {}
  }, [muted]);

  const handleUserGestureStart = () => {
    setWebNeedsTap(false);
    if (playerRef.current) {
      try {
        playerRef.current.unMute();
        playerRef.current.playVideo();
      } catch (e) {}
    }
  };

  // Standby view when no song is currently playing on stage
  if (!currentSong) {
    const joinUrl = typeof window !== 'undefined' && roomCode
      ? `${window.location.origin}/join?code=${roomCode}`
      : '';

    return (
      <div
        ref={wrapperRef}
        onDoubleClick={handleVideoSurfaceDoubleClick}
        className={`w-full bg-[#0A0A14] flex flex-col items-center justify-center p-5 text-center relative overflow-hidden select-none transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none border-none h-screen w-screen p-8 sm:p-12'
            : 'w-full h-full min-h-[220px] lg:min-h-[280px]'
        }`}
        title={isFullscreen ? 'Double-click to exit fullscreen' : 'Double-click to enter fullscreen'}
      >
        {/* Fullscreen Mode Top-Right Exit Action */}
        {isFullscreen && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Song</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 border border-white/10"
              title="Exit Fullscreen (Esc or F)"
            >
              <Minimize className="w-4 h-4 text-[#EC4899]" />
              <span className="text-xs font-semibold">Exit Fullscreen</span>
            </button>
          </div>
        )}

        {/* Center Stage Graphic matching mobapp HostVideoPlayer */}
        <div className="w-[72px] h-[72px] rounded-full bg-[#8B5CF6]/15 border-[1.5px] border-[#8B5CF6]/40 flex items-center justify-center mb-3.5">
          <span className="text-[32px] select-none leading-none">🎤</span>
        </div>
        <h2 className="text-base font-black tracking-[2px] text-white uppercase font-['Outfit']">
          STAGE IS READY
        </h2>
        <p className="text-xs text-[#94A3B8] text-center mt-1.5 max-w-xs leading-normal">
          Add songs to the QueueMic queue to start the show!
        </p>

        {/* Fullscreen TV View Connect Card (shown only in fullscreen) */}
        {isFullscreen && roomCode && (
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-2xl bg-[#1C1F30] border border-white/10 mt-6 max-w-lg w-full text-left shadow-sm">
            {joinUrl && (
              <div className="bg-white p-3 rounded-xl shadow-md shrink-0">
                <QRCodeSVG value={joinUrl} size={110} level="M" />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                Connect From Your Phone
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-[#06B6D4] my-1">
                {roomCode.toUpperCase()}
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Scan the QR code or enter code at <span className="text-white font-semibold">{window.location.host}/join</span> to queue tracks!
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const songTitle = currentSong.song?.title || 'Karaoke Track';
  const songArtist = currentSong.song?.artist || 'YouTube';
  const singerName = (currentSong.singerName || 'Singer').toUpperCase();

  const effectiveCurrentTime = localTime > 0 ? localTime : currentTimeSeconds;
  const effectiveDuration =
    localDuration > 0
      ? localDuration
      : durationSeconds > 0
      ? durationSeconds
      : currentSong.song?.durationSeconds || 0;
  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, Math.max(0, (effectiveCurrentTime / effectiveDuration) * 100))
      : 0;

  return (
    <div
      ref={wrapperRef}
      onMouseMove={wakeControls}
      onMouseEnter={wakeControls}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      onDoubleClick={handleVideoSurfaceDoubleClick}
      className={`relative w-full overflow-hidden bg-black transition-all duration-300 select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-none h-screen w-screen'
          : 'w-full h-full min-h-0 bg-black'
      }`}
    >
      {/* 16:9 Natural Full TV Video Frame without crop or zoom */}
      <div
        onClick={handleVideoSurfaceClick}
        onDoubleClick={handleVideoSurfaceDoubleClick}
        className="w-full h-full relative flex items-center justify-center overflow-hidden bg-black cursor-pointer"
        title={
          isFullscreen
            ? isPlaying
              ? 'Click to pause • Double-click to exit fullscreen'
              : 'Click to play • Double-click to exit fullscreen'
            : isPlaying
              ? 'Click to pause • Double-click for fullscreen'
              : 'Click to play • Double-click for fullscreen'
        }
      >
        <div className="w-full h-full max-w-full max-h-full aspect-video relative overflow-hidden bg-black flex items-center justify-center pointer-events-none youtube-cropped-frame">
          <div
            ref={containerRef}
            className="w-full h-[150%] absolute -top-[25%] left-0 pointer-events-none bg-black"
            style={{
              width: '100%',
              height: '150%',
              position: 'absolute',
              top: '-25%',
              left: 0,
              backgroundColor: '#000000',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Autoplay user gesture prompt overlay if blocked by browser */}
      {webNeedsTap && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center mb-4">
            <Play className="w-8 h-8 text-white translate-x-0.5" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 font-['Outfit']">Click to Start Audio & Video</h3>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
            Your browser requires an initial user interaction to allow autoplay with audio.
          </p>
          <button
            type="button"
            onClick={handleUserGestureStart}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            Start Karaoke Show 🎤
          </button>
        </div>
      )}

      {/* Loading Cover */}
      {videoPhase === 'loading' && !webNeedsTap && (
        <div className="absolute inset-0 z-30 bg-[#0A0A0F]/90 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin mb-4" />
          <p className="text-slate-300 font-medium text-sm tracking-wide">Loading karaoke track...</p>
        </div>
      )}

      {/* Paused Overlay - Clean minimal indicator without double overlay or heavy shadows */}
      {!isPlaying && videoPhase !== 'loading' && !webNeedsTap && (
        <div
          onClick={handleVideoSurfaceClick}
          onDoubleClick={handleVideoSurfaceDoubleClick}
          className="absolute inset-0 z-30 bg-[#0A0A12]/85 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer select-none animate-fade-in"
          title={
            isFullscreen
              ? 'Click to play • Double-click to exit fullscreen'
              : 'Click to play • Double-click for fullscreen'
          }
        >
          <div className="w-14 h-14 rounded-full bg-[#8B5CF6]/25 border border-[#8B5CF6]/50 flex items-center justify-center mb-2">
            <Play className="w-6 h-6 text-white fill-white translate-x-0.5" />
          </div>
          <p className="text-white font-bold tracking-[2px] text-xs uppercase font-['Outfit'] pointer-events-none">
            PAUSED
          </p>
          <p className="text-[#94A3B8] text-[11px] mt-0.5 pointer-events-none text-center">
            {followHost ? 'Waiting for host to resume' : 'Tap to resume'}
          </p>
        </div>
      )}

      {/* Top Banner (Singer & Song title + Room Code + Actions) - Hidden on mobile windowed mode */}
      {(isFullscreen || !isMobile) && (
        <div
          onDoubleClick={handleVideoSurfaceDoubleClick}
          className={`absolute top-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-b from-black/70 to-transparent z-40 flex items-center justify-between transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#8B5CF6]/30 text-[#C084FC] border border-[#8B5CF6]/40 tracking-wider flex items-center gap-1.5 shadow-sm">
            <span>🎤</span>
            <span className="uppercase">{singerName}</span>
          </span>
          <div className="truncate max-w-xs sm:max-w-md">
            <h4 className="text-white font-bold text-sm sm:text-base truncate">{songTitle}</h4>
            <p className="text-slate-400 text-xs truncate">{songArtist}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFullscreen && roomCode && (
            <button
              type="button"
              onClick={() => setShowQrOverlay((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 border border-white/10 cursor-pointer"
              title="Toggle On-Screen QR Code for singers to join"
            >
              <QrCode className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span className="hidden sm:inline">ROOM:</span>
              <span className="text-[#06B6D4]">{roomCode.toUpperCase()}</span>
            </button>
          )}

          {isFullscreen && onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer"
              title="Add Song to Queue"
            >
              <Plus className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span className="hidden md:inline">Add Song</span>
            </button>
          )}

          {isFullscreen && onOpenQueue && queueCount !== undefined && (
            <button
              type="button"
              onClick={onOpenQueue}
              className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer"
              title="View Sing-Along Queue"
            >
              <ListMusic className="w-3.5 h-3.5 text-[#EC4899]" />
              <span className="hidden sm:inline">Queue</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#EC4899]/30 text-xs font-bold text-pink-300">
                {queueCount}
              </span>
            </button>
          )}

          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-black/50 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-black/50 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
            title={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Enter TV Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-[#EC4899]" /> : <Maximize className="w-4 h-4 text-[#8B5CF6]" />}
          </button>
        </div>
      </div>
      )}

      {/* On-screen TV QR overlay when toggled */}
      {showQrOverlay && roomCode && (
        <div className="absolute top-16 right-4 z-30 p-4 rounded-2xl bg-[#12131C]/95 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col items-center animate-slide-up">
          <div className="bg-white p-3 rounded-xl mb-3 shadow-md">
            <QRCodeSVG value={`${window.location.origin}/join?code=${roomCode}`} size={120} level="M" />
          </div>
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Scan to Sing</span>
          <span className="text-xl font-black font-mono text-[#06B6D4] tracking-widest">{roomCode.toUpperCase()}</span>
          <button
            onClick={() => setShowQrOverlay(false)}
            className="mt-2 text-[10px] text-slate-400 hover:text-white uppercase tracking-wider cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* KTV Up Next Ticker on bottom left when idle (Fullscreen TV mode only) */}
      {isFullscreen && nextSong && isPlaying && !showControls && (
        <div className="absolute bottom-4 left-4 z-20 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-xs flex items-center gap-2 pointer-events-none transition-opacity duration-300">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-[#F59E0B] font-bold uppercase tracking-wider text-[10px]">Up Next:</span>
          <span className="text-white font-semibold truncate max-w-[200px]">{nextSong.song?.title}</span>
          <span className="text-slate-400 font-normal">({nextSong.singerName})</span>
        </div>
      )}

      {/* Bottom HUD Controls (Play/Pause, Skip, Progress Slider) - Only on web/desktop view or fullscreen */}
      {(isFullscreen || !isMobile) && (
        <div
          onDoubleClick={handleVideoSurfaceDoubleClick}
          className={`absolute bottom-0 inset-x-0 p-2.5 sm:p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent z-40 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
        {/* Progress Bar (Clickable for Host) */}
        <div
          data-no-toggle="true"
          onClick={(e) => {
            if ((!onSeek && !playerRef.current) || effectiveDuration <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            const target = Math.floor(Math.max(0, Math.min(1, clickPos)) * effectiveDuration);
            setLocalTime(target);
            try {
              playerRef.current?.seekTo(target, true);
            } catch (err) {}
            onSeek?.(target);
          }}
          className={`w-full h-2 bg-white/20 rounded-full mb-3 relative overflow-hidden group/bar ${
            onSeek || playerRef.current ? 'cursor-pointer' : ''
          }`}
        >
          <div
            className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {onPlayPause && (
              <button
                type="button"
                onClick={onPlayPause}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 translate-x-0.5" />}
              </button>
            )}

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10 shrink-0"
                title="Skip Song"
              >
                <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <div className="text-[11px] sm:text-xs text-slate-300 font-mono tracking-wider ml-1">
              {formatDuration(effectiveCurrentTime)} / {formatDuration(effectiveDuration)}
            </div>

            {isFullscreen && nextSong && (
              <div className="hidden sm:flex items-center gap-1.5 ml-4 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs">
                <span className="text-[#F59E0B] font-bold text-[10px] uppercase">Up Next:</span>
                <span className="text-white font-medium truncate max-w-[180px]">{nextSong.song?.title}</span>
                <span className="text-slate-400">({nextSong.singerName})</span>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
            {webAutoMuted && (
              <span className="text-amber-400 text-[11px] font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Audio Muted by Browser
              </span>
            )}
            {followHost ? (
              <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] sm:text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Room
              </span>
            ) : (
              <span className="text-[#C084FC] flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                <Tv className="w-3.5 h-3.5" /> TV Stage
              </span>
            )}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ml-1"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
