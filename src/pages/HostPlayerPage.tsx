import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Power, Copy, Check, X, Music, Tv } from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePlaybackStore, getLivePlaybackPosition } from '../store/usePlaybackStore';
import { useEchoRoom } from '../hooks/useEchoRoom';
import { WebVideoPlayer } from '../components/player/WebVideoPlayer';
import { WebNextUpCard } from '../components/player/WebNextUpCard';
import { WebPlaybackControls } from '../components/player/WebPlaybackControls';
import { WebQueueList } from '../components/queue/WebQueueList';
import { WebQRCodeDisplay } from '../components/room/WebQRCodeDisplay';
import { WebMemberListModal } from '../components/room/WebMemberListModal';
import { WebSettingsModal } from '../components/room/WebSettingsModal';
import { WebSongSearchModal } from '../components/search/WebSongSearchModal';
import { roomApi } from '../api/roomApi';
import { queueApi } from '../api/queueApi';
import { playbackApi } from '../api/playbackApi';
import type { RoomMember } from '../types';

const HEARTBEAT_INTERVAL_MS = 30000;

const useIsMobile = () => {
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

  return isMobile;
};

export const HostPlayerPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { currentRoom, members, leaveRoom } = useRoomStore();
  const { currentPlaying, queue, moveItem, removeFromQueue } = useQueueStore();
  const {
    state: playbackState,
    currentTimeSeconds,
    durationSeconds,
    syncAnchor,
    isFullscreen,
    setCurrentTime,
    setDuration,
    setState: setPlaybackState,
    setFullscreen,
    setSyncAnchor,
  } = usePlaybackStore();

  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isMemberListVisible, setIsMemberListVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Set duration immediately when current track is loaded
  useEffect(() => {
    if (currentPlaying?.song?.durationSeconds) {
      setDuration(currentPlaying.song.durationSeconds);
    }
  }, [currentPlaying?.id, currentPlaying?.song?.durationSeconds, setDuration]);

  // Subscribe to room presence and real-time events
  useEchoRoom(roomCode, true, {
    onRoomClosed: (reason) => {
      alert(reason || 'The karaoke party session has ended.');
      leaveRoom();
      navigate('/');
    },
    onRoleChanged: (newRole) => {
      if (newRole === 'guest') {
        navigate(`/room/${roomCode}`);
      }
    },
  });

  // Host position sync anchor: as soon as the player has a position after (re)starting — a new song, or a
  // guest's resume — then every 30s. Guests hold off resyncing until this first report arrives
  useEffect(() => {
    if (!roomCode || playbackState !== 'playing' || !currentPlaying) return;
    const queueItemId = currentPlaying.id;
    let lastSentAt = 0;

    const interval = setInterval(() => {
      if (usePlaybackStore.getState().currentTimeSeconds <= 0) return;
      if (Date.now() - lastSentAt < HEARTBEAT_INTERVAL_MS) return;
      lastSentAt = Date.now();
      playbackApi.updatePlaybackState(roomCode, 'playing', getLivePlaybackPosition(), queueItemId).catch(() => {});
    }, 500);
    return () => clearInterval(interval);
  }, [roomCode, currentPlaying?.id, playbackState]);

  if (!roomCode) {
    navigate('/');
    return null;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode.toUpperCase());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePlayPause = async () => {
    const nextState = playbackState === 'playing' ? 'paused' : 'playing';
    const position = Math.max(0, Math.round(getLivePlaybackPosition() * 100) / 100);
    setPlaybackState(nextState);
    setCurrentTime(position);
    setSyncAnchor({
      queueItemId: currentPlaying?.id ?? null,
      state: nextState,
      positionSeconds: position,
      receivedAtMs: Date.now(),
    });
    try {
      await playbackApi.updatePlaybackState(roomCode, nextState, position, currentPlaying?.id);
    } catch (err) {
      console.warn('Playback state error:', err);
    }
  };

  const handleSkip = async () => {
    try {
      await playbackApi.skipSong(roomCode);
    } catch (err) {
      console.warn('Skip song error:', err);
    }
  };

  const handleNext = async () => {
    try {
      await playbackApi.nextSong(roomCode);
    } catch (err) {
      console.warn('Next song error:', err);
    }
  };

  const handleSeek = async (seconds: number) => {
    setSeekTarget(seconds);
    setCurrentTime(seconds);
    setSyncAnchor({
      queueItemId: currentPlaying?.id ?? null,
      state: playbackState,
      positionSeconds: seconds,
      receivedAtMs: Date.now(),
    });
    try {
      await playbackApi.updatePlaybackState(roomCode, playbackState, seconds, currentPlaying?.id);
    } catch (err) {
      console.warn('Seek error:', err);
    }
  };

  const handleMoveItem = async (queueId: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    moveItem(queueId, direction);
    try {
      await queueApi.moveQueueItem(roomCode, queueId, { direction });
    } catch (err) {
      console.warn('Move queue error:', err);
    }
  };

  const handleRemoveItem = async (queueId: number) => {
    removeFromQueue(queueId);
    try {
      await queueApi.removeFromQueue(roomCode, queueId);
    } catch (err) {
      console.warn('Remove queue error:', err);
    }
  };

  const handleTransferHost = async (targetMember: RoomMember) => {
    if (!window.confirm(`Transfer host control to ${targetMember.nickname}?`)) return;
    try {
      await roomApi.transferHost(roomCode, targetMember.id);
      setIsMemberListVisible(false);
    } catch (err) {
      console.warn('Transfer host error:', err);
    }
  };

  const handleCloseRoom = async () => {
    if (!window.confirm('Are you sure you want to end this karaoke session for all singers?')) return;
    try {
      await roomApi.closeRoom(roomCode);
      leaveRoom();
      navigate('/');
    } catch (err) {
      console.warn('Close room error:', err);
    }
  };

  const handleToggleFullscreen = async (e?: React.SyntheticEvent | Event) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
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
        setFullscreen(false);
      } else if (isFullscreen) {
        setFullscreen(false);
      } else {
        const el = document.documentElement as any;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else {
          setFullscreen(true);
        }
      }
    } catch {
      // Fallback for environments where Fullscreen API is blocked
      setFullscreen(!isFullscreen);
    }
  };

  // Synchronize native fullscreen changes (Esc key, F11, or browser controls)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setFullscreen(isCurrentlyFullscreen);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [setFullscreen]);

  return (
    <div className="min-h-screen h-[100dvh] w-screen bg-[#0D0E15] text-white flex flex-col overflow-hidden select-none">
      {/* Top Bar (Hidden when in TV Fullscreen mode) */}
      <header
        className={`h-14 px-3 sm:px-6 bg-[#12131C]/90 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between shrink-0 z-30 transition-all ${
          isFullscreen ? 'hidden' : ''
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* TV Icon Box: Shown on both Mobile and Web View */}
          <div className="flex w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 items-center justify-center shrink-0 shadow-sm">
            <Tv className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white font-['Outfit'] truncate max-w-[140px] sm:max-w-xs">
              {currentRoom?.name || 'QueueMic Host'}
            </h1>
            <p className="text-[11px] text-[#94A3B8] font-semibold truncate">
              <span className="hidden sm:inline">Host TV Control • Code: </span>
              <span className="sm:hidden">Code: </span>
              <span className="font-mono text-[#06B6D4] font-bold">{roomCode.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Center: Room Code Pill (shown on tablet/desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono font-bold tracking-widest text-slate-200 flex items-center gap-2 cursor-pointer transition-all"
            title="Click to copy room code"
          >
            <span>{roomCode.toUpperCase()}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Actions matching mobapp HeaderBar: QR, Members, Settings, and End Session */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* QR Code Pill */}
          <button
            type="button"
            onClick={() => setIsQrModalVisible(true)}
            className="h-[38px] px-3.5 rounded-xl bg-[#242738] border-[1.5px] border-[#06B6D4] text-[#06B6D4] text-xs font-black flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Show Room QR Code"
          >
            <span>📱</span>
            <span>QR</span>
          </button>

          {/* Members Pill */}
          <button
            type="button"
            onClick={() => setIsMemberListVisible(true)}
            className="h-[38px] px-3.5 rounded-xl bg-[#242738] border border-[#8B5CF6]/50 text-[#A78BFA] text-xs font-extrabold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Connected Members"
          >
            <span>👥</span>
            <span>{members.length}</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalVisible(true)}
            className="w-[38px] h-[38px] rounded-xl bg-[#242738] border border-white/10 text-slate-200 text-base flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            title="Room Settings"
          >
            ⚙️
          </button>

          {/* End Room Button (Hidden on mobile view, shown on desktop) */}
          <button
            type="button"
            onClick={handleCloseRoom}
            className="hidden lg:flex w-[38px] h-[38px] rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 items-center justify-center active:scale-95 transition-all cursor-pointer ml-0.5"
            title="End Session"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile View (< lg): Fixed Video & Controls at top, scrollable Queue Manager below */}
      {isMobile && !isFullscreen ? (
        <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
          {/* Edge-to-Edge 16:9 Video Player (PINNED - does not scroll) */}
          <div className="w-full aspect-video bg-black shrink-0 relative overflow-hidden">
            <WebVideoPlayer
              currentSong={currentPlaying}
              playbackState={playbackState}
              isFullscreen={false}
              roomCode={roomCode}
              nextSong={queue[0] || null}
              queueCount={queue.length}
              onOpenSearch={() => setIsSearchModalVisible(true)}
              onSongEnd={handleNext}
              onPlayPause={handlePlayPause}
              onSkip={handleSkip}
              onSeek={handleSeek}
              seekTarget={seekTarget}
              onToggleFullscreen={handleToggleFullscreen}
              currentTimeSeconds={currentTimeSeconds}
              durationSeconds={durationSeconds}
              syncAnchor={syncAnchor}
              onTimeUpdate={(cur, dur) => {
                setCurrentTime(cur);
                setDuration(dur);
              }}
            />
          </div>

          {/* Mobapp PlaybackControls Deck directly below Video (PINNED - does not scroll) */}
          <div className="shrink-0">
            <WebPlaybackControls
              currentSong={currentPlaying}
              playbackState={playbackState}
              onPlayPause={handlePlayPause}
              onSkip={handleSkip}
              onSeek={handleSeek}
              onToggleFullscreen={handleToggleFullscreen}
              isFullscreen={false}
              currentTimeSeconds={currentTimeSeconds}
              durationSeconds={durationSeconds}
              isHost={true}
              canControlPlayback={true}
              showOutsideControls={true}
            />
          </div>

          {/* Queue Section - ONLY THIS SCROLLS! */}
          <div className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 pb-5">
            {/* Next Up Overlay Card */}
            {queue[0] && (
              <WebNextUpCard
                nextSong={queue[0]}
                onSkip={handleSkip}
                onOpenSearch={() => setIsSearchModalVisible(true)}
              />
            )}

            {/* Host Queue Manager */}
            <WebQueueList
              queue={queue}
              canReorder={true}
              isHost={true}
              title="Host Queue Manager"
              subtitle="Reorder, skip, or remove songs in queue"
              onMoveItem={handleMoveItem}
              onRemoveItem={handleRemoveItem}
              onOpenSearch={() => setIsSearchModalVisible(true)}
            />
          </div>
        </div>
      ) : (
        /* Desktop / Fullscreen TV View (lg:): Balanced equal-height 2-column layout */
        <main
          className={`flex-1 min-h-0 w-full transition-all ${
            isFullscreen
              ? 'p-0 m-0 max-w-none'
              : 'p-3 sm:p-4 md:p-5 flex flex-col lg:flex-row gap-4 h-[calc(100vh-56px)] max-w-[1920px] mx-auto overflow-hidden'
          }`}
        >
          {/* Left Column: Video Stage with Stage Live below */}
          <div className={isFullscreen ? 'w-full h-full' : 'flex-1 h-full min-h-0 min-w-0 flex flex-col'}>
            <div
              className={
                isFullscreen
                  ? 'w-full h-full'
                  : 'w-full h-full flex flex-col bg-black rounded-2xl overflow-hidden border border-white/[0.08]'
              }
            >
              <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-black">
                <WebVideoPlayer
                  currentSong={currentPlaying}
                  playbackState={playbackState}
                  isFullscreen={isFullscreen}
                  roomCode={roomCode}
                  nextSong={queue[0] || null}
                  queueCount={queue.length}
                  onOpenSearch={() => setIsSearchModalVisible(true)}
                  onOpenQueue={() => setIsQueueDrawerOpen(true)}
                  onSongEnd={handleNext}
                  onPlayPause={handlePlayPause}
                  onSkip={handleSkip}
                  onSeek={handleSeek}
                  seekTarget={seekTarget}
                  onToggleFullscreen={handleToggleFullscreen}
                  currentTimeSeconds={currentTimeSeconds}
                  durationSeconds={durationSeconds}
                  syncAnchor={syncAnchor}
                  onTimeUpdate={(cur, dur) => {
                    setCurrentTime(cur);
                    setDuration(dur);
                  }}
                />
              </div>

              {!isFullscreen && (
                <div className="shrink-0">
                  <WebPlaybackControls
                    currentSong={currentPlaying}
                    playbackState={playbackState}
                    isHost={true}
                    showOutsideControls={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Up Next Card + Party Queue Manager Sidebar */}
          {!isFullscreen && (
            <div className="w-full lg:w-[380px] xl:w-[440px] shrink-0 h-full min-h-0 flex flex-col gap-3">
              {queue[0] && (
                <div className="shrink-0">
                  <WebNextUpCard
                    nextSong={queue[0]}
                    onSkip={handleSkip}
                    onOpenSearch={() => setIsSearchModalVisible(true)}
                  />
                </div>
              )}
              <WebQueueList
                queue={queue}
                canReorder={true}
                isHost={true}
                title="Host Queue Manager"
                subtitle="Reorder, skip, or remove songs in queue"
                onMoveItem={handleMoveItem}
                onRemoveItem={handleRemoveItem}
                onOpenSearch={() => setIsSearchModalVisible(true)}
                className="flex-1 min-h-0 h-full"
              />
            </div>
          )}
        </main>
      )}

      {/* Slide-out Queue Drawer in TV View */}
      {isQueueDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full sm:w-[420px] h-full bg-[#12131C] border-l border-white/10 p-4 sm:p-6 flex flex-col shadow-2xl animate-slide-left">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="font-bold text-white text-base font-['Outfit']">Sing-Along Queue ({queue.length})</h3>
              </div>
              <button
                onClick={() => setIsQueueDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <WebQueueList
                queue={queue}
                canReorder={true}
                isHost={true}
                onMoveItem={handleMoveItem}
                onRemoveItem={handleRemoveItem}
                onOpenSearch={() => {
                  setIsQueueDrawerOpen(false);
                  setIsSearchModalVisible(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <WebQRCodeDisplay
        visible={isQrModalVisible}
        roomCode={roomCode}
        roomName={currentRoom?.name || 'QueueMic Stage'}
        onClose={() => setIsQrModalVisible(false)}
      />

      <WebMemberListModal
        visible={isMemberListVisible}
        members={members}
        isCurrentUserHost={true}
        onTransferHostClick={handleTransferHost}
        onClose={() => setIsMemberListVisible(false)}
      />

      <WebSettingsModal
        visible={isSettingsModalVisible}
        roomCode={roomCode}
        onClose={() => setIsSettingsModalVisible(false)}
        onOpenQrModal={() => setIsQrModalVisible(true)}
        onOpenMemberList={() => setIsMemberListVisible(true)}
        onCloseRoom={handleCloseRoom}
      />

      <WebSongSearchModal
        visible={isSearchModalVisible}
        roomCode={roomCode}
        onClose={() => setIsSearchModalVisible(false)}
      />
    </div>
  );
};
