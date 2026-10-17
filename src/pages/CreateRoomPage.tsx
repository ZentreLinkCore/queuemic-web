import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Tv, AlertCircle, Power, Loader2, Music2 } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore } from '../store/useRoomStore';
import { roomApi } from '../api/roomApi';
import type { Room } from '../types';

const AVATAR_COLORS = [
  '#8B5CF6', '#EC4899', '#06B6D4', '#10B981',
  '#F59E0B', '#6366F1', '#3B82F6', '#D946EF',
];

export const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    role,
    setRole,
    setAuth,
    nickname: storedNickname,
    avatarColor: storedColor,
    setAvatarColor,
  } = useAuthStore();
  const { currentRoom, lastRoom, setCurrentRoom, leaveRoom, setLastRoom } = useRoomStore();

  const [nickname, setNickname] = useState(storedNickname || '');
  const [roomName, setRoomName] = useState('');
  const [selectedColor, setSelectedColor] = useState(storedColor || '#8B5CF6');
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [checkingActiveRoom, setCheckingActiveRoom] = useState(true);
  const [activeHostedRoom, setActiveHostedRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate if current device is already hosting an active room on the server
  useEffect(() => {
    let isMounted = true;

    const checkActiveRoom = async () => {
      const codeToCheck = currentRoom?.code || (role === 'host' ? lastRoom?.code : null);
      if (codeToCheck && role === 'host') {
        try {
          const res = await roomApi.getRoomDetails(codeToCheck);
          if (!isMounted) return;
          if (res.success && res.data && res.data.status === 'active') {
            setActiveHostedRoom(res.data);
          } else {
            leaveRoom();
            setLastRoom(null);
            setRole('guest');
            setActiveHostedRoom(null);
          }
        } catch {
          if (!isMounted) return;
          leaveRoom();
          setLastRoom(null);
          setRole('guest');
          setActiveHostedRoom(null);
        }
      } else {
        setActiveHostedRoom(null);
      }
      if (isMounted) {
        setCheckingActiveRoom(false);
      }
    };

    checkActiveRoom();

    return () => {
      isMounted = false;
    };
  }, [currentRoom?.code, lastRoom?.code, role, leaveRoom, setLastRoom, setRole]);

  const handleReenterActiveRoom = () => {
    if (!activeHostedRoom) return;
    navigate(`/host/${activeHostedRoom.code}`);
  };

  const handleCloseActiveRoom = async () => {
    if (!activeHostedRoom) return;
    const confirmed = window.confirm(
      `Are you sure you want to end and close "${activeHostedRoom.name || activeHostedRoom.code}"? This will end the party session for all connected singers.`
    );
    if (!confirmed) return;

    setClosing(true);
    setError(null);
    try {
      await roomApi.closeRoom(activeHostedRoom.code);
    } catch (err: any) {
      console.warn('Close room API call error (clearing local state):', err);
    } finally {
      leaveRoom();
      setLastRoom(null);
      setRole('guest');
      setActiveHostedRoom(null);
      setClosing(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNickname = (storedNickname || nickname).trim() || 'Host';
    const finalRoomName = roomName.trim() || `${finalNickname}'s Lounge`;

    setLoading(true);
    setError(null);

    try {
      const response = await roomApi.createRoom({
        roomName: finalRoomName,
        nickname: finalNickname,
        deviceUuid: useAuthStore.getState().deviceUuid,
      });

      if (response.success && response.data) {
        setAuth({
          token: response.data.token,
          memberId: response.data.member.id,
          nickname: response.data.member.nickname,
          avatarColor: selectedColor,
          role: 'host',
        });
        useAuthStore.getState().setNickname(finalNickname, selectedColor);
        setCurrentRoom(response.data.room);
        navigate(`/host/${response.data.room.code}`);
      }
    } catch (err: any) {
      // No HTTP status means the request never reached the server (offline, DNS, CORS)
      setError(
        err?.status
          ? err?.message || 'Failed to create room. Please verify backend connection.'
          : 'Unable to create room. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] text-white flex flex-col relative overflow-x-hidden">
      {/* Ambient background glow for rich desktop experience */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] bg-[#8B5CF6]/15 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-[#EC4899]/10 rounded-full blur-[140px] opacity-40" />
        <div className="absolute top-1/2 left-1/3 w-[350px] h-[350px] bg-[#06B6D4]/08 rounded-full blur-[100px] opacity-30" />
      </div>

      {/* Responsive HeaderBar */}
      <header className="w-full border-b border-white/[0.08] shrink-0 bg-[#0D0E15]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between py-3 px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              aria-label="Back to Home"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white font-['Outfit'] truncate">
                  Host a QueueMic Room
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#C084FC] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 px-2.5 py-0.5 rounded-full">
                  <Tv className="w-3 h-3" /> TV Host Mode
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">Configure party & launch big screen</p>
            </div>
          </div>

          {/* Desktop Navigation & Host Identity */}
          <div className="hidden md:flex items-center gap-4">
            {storedNickname ? (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-xs ring-1 ring-white/20"
                  style={{ backgroundColor: selectedColor || storedColor || '#8B5CF6' }}
                >
                  {storedNickname.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-300">{storedNickname}</span>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  Host
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/join')}
              className="text-xs font-semibold text-slate-400 hover:text-[#06B6D4] transition-colors cursor-pointer"
            >
              Join Room instead →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Responsive 2-column layout on web/desktop view */}
      <main className="w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Desktop Visual Showcase of TV Stage (Desktop Web Only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-5">
            <GlassCard variant="surface" glow="none" className="p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center border border-white/10 shrink-0">
                  <Tv className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-['Outfit'] text-white">TV Stage & Sound Hub</h3>
                  <p className="text-xs text-slate-400">Real-time big screen party experience</p>
                </div>
              </div>

              {/* TV Screen Preview Graphic */}
              <div className="rounded-2xl bg-gradient-to-b from-[#1C1F30] to-[#12131C] p-4 border border-white/10 shadow-[0_0_40px_-10px_rgba(139,92,246,0.25)] mb-5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 mb-3 border-b border-white/[0.06]">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE TV STAGE
                  </span>
                  <span className="font-mono text-xs text-[#06B6D4] font-bold tracking-widest">
                    PIN: • • • • • •
                  </span>
                </div>
                <div className="aspect-video rounded-xl bg-black/70 border border-white/5 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-radial from-[#8B5CF6]/15 via-transparent to-transparent pointer-events-none" />
                  <div className="w-11 h-11 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center mb-2 shadow-lg shadow-[#8B5CF6]/20">
                    <Music2 className="w-5 h-5 text-[#C084FC]" />
                  </div>
                  <span className="text-sm font-bold text-white font-['Outfit'] mb-0.5">
                    Synchronized Video Karaoke
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Live lyrics, on-screen QR join, & queue display
                  </span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0 text-base">
                    📺
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Big-Screen TV Display</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Connect this screen to your TV or sound system to play 1080p YouTube karaoke videos with synced audio.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center shrink-0 text-base">
                    📱
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Instant Mobile Queueing</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Party guests scan the QR code on your TV screen to search songs and line up their performances.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EC4899]/15 border border-[#EC4899]/30 flex items-center justify-center shrink-0 text-base">
                    🎛️
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Full Host Controls</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Skip tracks, pause playback, reorder singers, or let the room auto-advance when songs finish.
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column / Centered on Mobile: Room Setup or Active Room in Progress */}
          <div className="w-full lg:col-span-7">
            {checkingActiveRoom ? (
              <GlassCard variant="surface" className="p-8 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-7 h-7 text-[#8B5CF6] animate-spin mb-2.5" />
                <p className="text-xs text-slate-400">Checking room status...</p>
              </GlassCard>
            ) : activeHostedRoom ? (
              /* Active Room in Progress View (Replaces Room Setup) */
              <GlassCard variant="surface" glow="primary" className="p-5 sm:p-7 w-full animate-fade-in">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center border border-white/10 shrink-0">
                    <span className="text-2xl">👑</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-['Outfit'] text-white">Active Room in Progress</h2>
                    <p className="text-xs text-slate-400">You are currently hosting an active party room.</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">{error}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Active Hosted Room Info Card */}
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-[#8B5CF6]/30 mb-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-['Outfit'] whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      Live Session
                    </span>
                    <span className="text-[11px] font-bold text-[#A78BFA] bg-[#8B5CF6]/15 px-2.5 py-0.5 rounded-full border border-[#8B5CF6]/30 whitespace-nowrap shrink-0">
                      👑 Host
                    </span>
                  </div>

                  <div className="mb-3.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Current Party Room
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white truncate font-['Outfit']">
                      {activeHostedRoom.name || 'QueueMic Lounge'}
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 mb-3.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Room Code
                      </span>
                      <span className="font-mono text-2xl font-black text-[#06B6D4] tracking-widest block">
                        {activeHostedRoom.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                      <Tv className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>TV Stage</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed border-t border-white/[0.06] pt-3">
                    You cannot create a new party room while this session is active. Re-enter your TV stage to control playback, or end and close the room to start a new one.
                  </p>
                </div>

                {/* Action Buttons: Clean, single-line, aligned */}
                <div className="flex flex-col gap-2.5">
                  <NeonButton
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleReenterActiveRoom}
                    icon={<Tv className="w-5 h-5 text-white" />}
                    className="w-full py-3.5 text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-[#8B5CF6]/20"
                  >
                    Re-enter Host Stage
                  </NeonButton>

                  <NeonButton
                    type="button"
                    variant="danger"
                    size="md"
                    loading={closing}
                    onClick={handleCloseActiveRoom}
                    icon={<Power className="w-4 h-4" />}
                    className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    End & Close Room
                  </NeonButton>
                </div>
              </GlassCard>
            ) : (
              /* Normal Room Setup Form */
              <GlassCard variant="surface" glow="primary" className="p-5 sm:p-7 w-full animate-fade-in">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center border border-white/10 shrink-0">
                    <Tv className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-['Outfit'] text-white">Room Setup</h2>
                    <p className="text-xs text-slate-400">Configure your party room and start queuing music.</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">{error}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form onSubmit={handleCreate} className="space-y-4">
                  {/* Host Profile Info */}
                  {storedNickname ? (
                    <div className="p-3.5 rounded-xl bg-white/[0.04] border border-[#8B5CF6]/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base ring-1 ring-white/20 shrink-0"
                          style={{ backgroundColor: selectedColor || storedColor || '#8B5CF6' }}
                        >
                          {storedNickname.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Hosting As
                          </span>
                          <span className="text-sm font-bold text-white font-['Outfit'] truncate block">
                            {storedNickname}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#A78BFA] bg-[#8B5CF6]/15 px-2.5 py-0.5 rounded-full border border-[#8B5CF6]/30 uppercase tracking-wider shrink-0">
                        👑 TV / Sound Host
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Host Nickname
                      </label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="e.g. Master Singer"
                        required
                        className="w-full bg-[#1C1F30] border border-white/10 focus:border-[#8B5CF6] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      QueueMic Room Name
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder={`e.g. ${storedNickname || 'Friday Night'} Lounge`}
                      className="w-full bg-[#1C1F30] border border-white/10 focus:border-[#8B5CF6] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                    />
                  </div>

                  {/* Host Role Tip matching mobapp */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
                    <span className="text-base shrink-0">👑</span>
                    <span>
                      As the Host, this device connects to the TV / sound system and controls live video lyrics, queue order, and playback controls.
                    </span>
                  </div>

                  {!storedNickname && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                        Avatar Glow Color
                      </label>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {AVATAR_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              setSelectedColor(col);
                              setAvatarColor(col);
                            }}
                            style={{ backgroundColor: col }}
                            className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                              selectedColor === col ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#12131C]' : 'opacity-70 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <NeonButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      className="w-full font-bold"
                    >
                      Launch QueueMic Room 🚀
                    </NeonButton>
                  </div>
                </form>
              </GlassCard>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
