import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Check, Tv, Activity } from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePlaybackStore, getLivePlaybackPosition } from '../store/usePlaybackStore';
import { useEchoRoom } from '../hooks/useEchoRoom';
import { WebVideoPlayer } from '../components/player/WebVideoPlayer';
import { WebGuestProgressBar } from '../components/player/WebGuestProgressBar';
import { WebPlaybackControls } from '../components/player/WebPlaybackControls';
import { WebNextUpCard } from '../components/player/WebNextUpCard';
import { WebQueueList } from '../components/queue/WebQueueList';
import { WebQRCodeDisplay } from '../components/room/WebQRCodeDisplay';
import { WebMemberListModal } from '../components/room/WebMemberListModal';
import { WebSongSearchModal } from '../components/search/WebSongSearchModal';
import { roomApi } from '../api/roomApi';
import { queueApi } from '../api/queueApi';
import { playbackApi } from '../api/playbackApi';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

export const GuestRoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { currentRoom, members, leaveRoom } = useRoomStore();
  const { memberId } = useAuthStore();
  const { currentPlaying, queue, moveItem, removeFromQueue } = useQueueStore();
  const {
    state: playbackState,
    currentTimeSeconds,
    durationSeconds,
    syncAnchor,
    isFullscreen,
    setState: setPlaybackState,
    setCurrentTime,
    setDuration,
    setFullscreen,
    setSyncAnchor,
  } = usePlaybackStore();

  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isMemberListVisible, setIsMemberListVisible] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewMode, setViewMode] = useState<'video' | 'progress'>('video');
  const [isMuted, setIsMuted] = useState(true);

  // Set duration immediately when current track is loaded
  useEffect(() => {
    if (currentPlaying?.song?.durationSeconds) {
      setDuration(currentPlaying.song.durationSeconds);
    }
  }, [currentPlaying?.id, currentPlaying?.song?.durationSeconds, setDuration]);

  // Subscribe to room presence and real-time events as guest
  useEchoRoom(roomCode, false, {
    onRoomClosed: (reason) => {
      alert(reason || 'The karaoke party session has ended.');
      leaveRoom();
      navigate('/');
    },
    onRoleChanged: (newRole) => {
      if (newRole === 'host') {
        navigate(`/host/${roomCode}`);
      }
    },
  });

  if (!roomCode) {
    navigate('/');
    return null;
  }

  const canReorder = Boolean(
    currentRoom?.settings?.allow_guest_reorder ??
    currentRoom?.settings?.allowGuestReorder ??
    false
  );

  const canControlPlayback = Boolean(
    currentRoom?.settings?.allow_guest_playback_control ??
    currentRoom?.settings?.allowGuestPlaybackControl ??
    false
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode.toUpperCase());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePlayPause = async () => {
    if (!canControlPlayback) return;
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
      console.warn('Playback error:', err);
    }
  };

  const handleSkip = async () => {
    if (!canControlPlayback) return;
    try {
      await playbackApi.skipSong(roomCode);
    } catch (err) {
      console.warn('Skip song error:', err);
    }
  };

  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  const handleSeek = async (seconds: number) => {
    if (!canControlPlayback) return;
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
    if (!canReorder) return;
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

  const handleLeaveRoom = () => {
    if (!window.confirm('Leave this karaoke room?')) return;
    roomApi.leaveRoom(roomCode).catch(() => {});
    leaveRoom();
    navigate('/');
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
      setFullscreen(!isFullscreen);
    }
  };

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
      {/* Top Bar */}
      <header className="h-14 px-3 sm:px-6 bg-[#12131C]/90 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between shrink-0 z-30 transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* TV Icon Box: Shown in Web View (desktop), hidden on mobile */}
          <div className="hidden lg:flex w-9 h-9 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 items-center justify-center shrink-0 shadow-sm">
            <Tv className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white font-['Outfit'] truncate max-w-[140px] sm:max-w-xs">
              {currentRoom?.name || 'QueueMic Room'}
            </h1>
            <p className="text-[11px] text-[#94A3B8] font-semibold truncate">
              <span className="hidden sm:inline">Guest View • Room Code: </span>
              <span className="sm:hidden">Code: </span>
              <span className="font-mono text-[#06B6D4] font-bold">{roomCode.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Center View Switcher & Room Code */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] p-0.5 sm:p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('video')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                viewMode === 'video'
                  ? 'bg-[#06B6D4] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Video View"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Video</span>
            </button>
            <button
              onClick={() => setViewMode('progress')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                viewMode === 'progress'
                  ? 'bg-[#06B6D4] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Progress View"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Progress</span>
            </button>
          </div>

          <button
            onClick={handleCopyCode}
            className="hidden md:flex px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono font-bold tracking-widest text-slate-200 items-center gap-2 cursor-pointer transition-all"
            title="Click to copy room code"
          >
            <span>{roomCode.toUpperCase()}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Actions matching mobapp HeaderBar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsQrModalVisible(true)}
            className="h-[38px] px-3.5 rounded-xl bg-[#242738] border-[1.5px] border-[#06B6D4] text-[#06B6D4] text-xs font-black flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Show QR Code"
          >
            <span>📱</span>
            <span>QR</span>
          </button>

          <button
            onClick={() => setIsMemberListVisible(true)}
            className="h-[38px] px-3.5 rounded-xl bg-[#242738] border border-[#8B5CF6]/50 text-[#A78BFA] text-xs font-extrabold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Connected Members"
          >
            <span>👥</span>
            <span>{members.length}</span>
          </button>

          <button
            onClick={handleLeaveRoom}
            className="h-[38px] px-3.5 rounded-xl bg-[#242738] border border-red-500/40 text-red-400 text-xs font-extrabold flex items-center gap-1 active:scale-95 transition-all cursor-pointer ml-0.5"
            title="Leave Room"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Mobile View (< lg): Fixed Edge-to-Edge Video/Progress at top, scrollable Queue below (No card wrapper) */}
      {isMobile && !isFullscreen ? (
        <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
          {/* Edge-to-Edge Video Player & Outside Controls (PINNED - kept mounted so YouTube iframe never reloads on tab switch) */}
          <div className={viewMode === 'video' ? 'shrink-0 flex flex-col' : 'hidden'}>
            <div className="w-full aspect-video bg-black relative overflow-hidden">
              <WebVideoPlayer
                currentSong={currentPlaying}
                playbackState={playbackState}
                isFullscreen={false}
                roomCode={roomCode}
                nextSong={queue[0] || null}
                queueCount={queue.length}
                onOpenSearch={() => setIsSearchModalVisible(true)}
                onSongEnd={handleSkip}
                onPlayPause={canControlPlayback ? handlePlayPause : undefined}
                onSkip={canControlPlayback ? handleSkip : undefined}
                onSeek={canControlPlayback ? handleSeek : undefined}
                seekTarget={seekTarget}
                currentTimeSeconds={currentTimeSeconds}
                durationSeconds={durationSeconds}
                syncAnchor={syncAnchor}
                followHost={true}
                muted={isMuted}
                onToggleMute={() => setIsMuted(!isMuted)}
                onToggleFullscreen={handleToggleFullscreen}
                onTimeUpdate={(cur, dur) => {
                  setCurrentTime(cur);
                  if (dur > 0) setDuration(dur);
                }}
              />
            </div>

            {/* Stage Live & Controls directly below Video */}
            <div className="shrink-0">
              <WebPlaybackControls
                currentSong={currentPlaying}
                playbackState={playbackState}
                onPlayPause={canControlPlayback ? handlePlayPause : undefined}
                onSkip={canControlPlayback ? handleSkip : undefined}
                onSeek={canControlPlayback ? handleSeek : undefined}
                onToggleFullscreen={handleToggleFullscreen}
                isFullscreen={false}
                currentTimeSeconds={currentTimeSeconds}
                durationSeconds={durationSeconds}
                canControlPlayback={canControlPlayback}
                isHost={false}
                showOutsideControls={canControlPlayback}
              />
            </div>
          </div>

          {/* Progress Bar View Mode (Kept in DOM, toggled via hidden) */}
          <div className={viewMode === 'progress' ? 'shrink-0 p-3 bg-[#12131C] border-b border-white/[0.08]' : 'hidden'}>
            <WebGuestProgressBar
              currentSong={currentPlaying}
              playbackState={playbackState}
              syncAnchor={syncAnchor}
              currentTimeSeconds={currentTimeSeconds}
              durationSeconds={durationSeconds}
              canControlPlayback={canControlPlayback}
              onPlayPause={handlePlayPause}
              onSkip={handleSkip}
            />
          </div>

          {/* Queue Section - ONLY THIS SCROLLS! */}
          <div className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 pb-5">
            {/* Next Up Overlay Card */}
            {queue[0] && (
              <div className="shrink-0">
                <WebNextUpCard
                  nextSong={queue[0]}
                  onSkip={canControlPlayback ? handleSkip : undefined}
                  onOpenSearch={() => setIsSearchModalVisible(true)}
                />
              </div>
            )}

            {/* Queue List */}
            <WebQueueList
              queue={queue}
              canReorder={canReorder}
              memberId={memberId}
              isHost={false}
              title="Up Next in Queue"
              subtitle={canReorder ? 'Reorder songs or jump to Top' : `${queue.length} songs waiting`}
              onMoveItem={handleMoveItem}
              onRemoveItem={handleRemoveItem}
              onOpenSearch={() => setIsSearchModalVisible(true)}
            />
          </div>
        </div>
      ) : (
        /* Desktop View (>= lg): Balanced equal-height 2-column dashboard layout matching HostPlayerPage */
        <main
          className={`flex-1 min-h-0 w-full transition-all ${
            isFullscreen
              ? 'p-0 m-0 max-w-none'
              : 'p-3 sm:p-4 md:p-5 flex flex-col lg:flex-row gap-4 h-[calc(100vh-56px)] max-w-[1920px] mx-auto overflow-hidden'
          }`}
        >
          {/* Left Column: Video Stage / Progress + Up Next Card */}
          <div className={isFullscreen ? 'w-full h-full' : 'flex-1 h-full min-h-0 min-w-0 flex flex-col gap-3'}>
            <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
              {/* Video Player Container (Kept mounted to prevent YouTube iframe reload on tab switch) */}
              <div
                className={
                  viewMode === 'video'
                    ? 'w-full h-full flex flex-col bg-black rounded-2xl overflow-hidden border border-white/[0.08]'
                    : 'hidden'
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
                    onSongEnd={handleSkip}
                    onPlayPause={canControlPlayback ? handlePlayPause : undefined}
                    onSkip={canControlPlayback ? handleSkip : undefined}
                    onSeek={canControlPlayback ? handleSeek : undefined}
                    seekTarget={seekTarget}
                    currentTimeSeconds={currentTimeSeconds}
                    durationSeconds={durationSeconds}
                    syncAnchor={syncAnchor}
                    followHost={true}
                    muted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    onToggleFullscreen={handleToggleFullscreen}
                    onTimeUpdate={(cur, dur) => {
                      setCurrentTime(cur);
                      if (dur > 0) setDuration(dur);
                    }}
                  />
                </div>

                {!isFullscreen && (
                  <div className="shrink-0">
                    <WebPlaybackControls
                      currentSong={currentPlaying}
                      playbackState={playbackState}
                      isHost={false}
                      showOutsideControls={false}
                    />
                  </div>
                )}
              </div>

              {/* Progress Bar View Mode (Shown when viewMode === 'progress') */}
              <div
                className={
                  viewMode === 'progress'
                    ? 'w-full h-full flex items-center justify-center p-6 bg-[#12131C] rounded-2xl border border-white/[0.08]'
                    : 'hidden'
                }
              >
                <div className="max-w-xl w-full">
                  <WebGuestProgressBar
                    currentSong={currentPlaying}
                    playbackState={playbackState}
                    syncAnchor={syncAnchor}
                    currentTimeSeconds={currentTimeSeconds}
                    durationSeconds={durationSeconds}
                    canControlPlayback={canControlPlayback}
                    onPlayPause={handlePlayPause}
                    onSkip={handleSkip}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Up Next Card + Party Queue Sidebar matching HostPlayerPage */}
          {!isFullscreen && (
            <div className="w-full lg:w-[380px] xl:w-[440px] shrink-0 h-full min-h-0 flex flex-col gap-3">
              {queue[0] && (
                <div className="shrink-0">
                  <WebNextUpCard
                    nextSong={queue[0]}
                    onSkip={canControlPlayback ? handleSkip : undefined}
                    onOpenSearch={() => setIsSearchModalVisible(true)}
                  />
                </div>
              )}
              <WebQueueList
                queue={queue}
                canReorder={canReorder}
                memberId={memberId}
                isHost={false}
                title="Up Next in Queue"
                subtitle={canReorder ? 'Reorder songs or jump to Top' : `${queue.length} songs waiting`}
                onMoveItem={handleMoveItem}
                onRemoveItem={handleRemoveItem}
                onOpenSearch={() => setIsSearchModalVisible(true)}
                className="flex-1 min-h-0 h-full"
              />
            </div>
          )}
        </main>
      )}

      {/* Modals */}
      <WebQRCodeDisplay
        visible={isQrModalVisible}
        roomCode={roomCode}
        roomName={currentRoom?.name || 'QueueMic Room'}
        onClose={() => setIsQrModalVisible(false)}
      />

      <WebMemberListModal
        visible={isMemberListVisible}
        members={members}
        isCurrentUserHost={false}
        onClose={() => setIsMemberListVisible(false)}
      />

      <WebSongSearchModal
        visible={isSearchModalVisible}
        roomCode={roomCode}
        onClose={() => setIsSearchModalVisible(false)}
      />
    </div>
  );
};
