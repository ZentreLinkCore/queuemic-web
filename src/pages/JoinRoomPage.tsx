import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, LogIn, AlertCircle, X, Music2, Camera } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { WebQRScannerModal } from '../components/room/WebQRScannerModal';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore } from '../store/useRoomStore';
import { roomApi } from '../api/roomApi';
import { formatRoomCode } from '../utils/formatting';
import { validateJoinInput } from '../utils/validation';

const AVATAR_COLORS = [
  '#06B6D4', '#8B5CF6', '#EC4899', '#10B981',
  '#F59E0B', '#6366F1', '#3B82F6', '#D946EF',
];

export const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, nickname: storedNickname, avatarColor: storedColor, setAvatarColor } = useAuthStore();
  const { lastRoom, setCurrentRoom, setLastRoom } = useRoomStore();

  const codeFromUrl = searchParams.get('code') || '';
  const [roomCode, setRoomCode] = useState(formatRoomCode(codeFromUrl));
  const [nickname, setNickname] = useState(storedNickname || '');
  const [selectedColor, setSelectedColor] = useState(storedColor || '#06B6D4');
  const [loading, setLoading] = useState(false);
  const [rejoining, setRejoining] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate if lastRoom is still active
  useEffect(() => {
    if (lastRoom?.code) {
      roomApi
        .getRoomDetails(lastRoom.code)
        .then((res) => {
          if (!res.success || !res.data || res.data.status !== 'active') {
            setLastRoom(null);
          }
        })
        .catch(() => setLastRoom(null));
    }
  }, [lastRoom?.code, setLastRoom]);

  useEffect(() => {
    if (codeFromUrl) {
      setRoomCode(formatRoomCode(codeFromUrl));
    }
  }, [codeFromUrl]);

  const joinRoomWithCode = useCallback(
    async (codeToJoin: string, singerNickname: string) => {
      const cleanCode = formatRoomCode(codeToJoin);
      const validationError = validateJoinInput(cleanCode, singerNickname);
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await roomApi.joinRoom({
          roomCode: cleanCode,
          nickname: singerNickname,
          deviceUuid: useAuthStore.getState().deviceUuid,
        });

        if (response.success && response.data) {
          setAuth({
            token: response.data.token,
            memberId: response.data.member.id,
            nickname: response.data.member.nickname,
            avatarColor: selectedColor,
            role: 'guest',
          });
          useAuthStore.getState().setNickname(singerNickname, selectedColor);
          setCurrentRoom(response.data.room);
          setLastRoom({
            code: response.data.room.code,
            name: response.data.room.name,
            nickname: response.data.member.nickname,
          });

          navigate(`/room/${response.data.room.code}`);
        }
      } catch (err: any) {
        setError(err?.message || 'Room not found or session closed. Check the code on the Host screen.');
      } finally {
        setLoading(false);
      }
    },
    [navigate, selectedColor, setAuth, setCurrentRoom, setLastRoom]
  );

  const handleRejoin = async () => {
    if (!lastRoom) return;
    setRejoining(true);
    setError(null);
    try {
      const singerNickname = lastRoom.nickname || nickname.trim() || storedNickname || 'Guest Singer';
      const response = await roomApi.joinRoom({
        roomCode: lastRoom.code,
        nickname: singerNickname,
        deviceUuid: useAuthStore.getState().deviceUuid,
      });

      if (response.success && response.data) {
        setAuth({
          token: response.data.token,
          memberId: response.data.member.id,
          nickname: response.data.member.nickname,
          avatarColor: selectedColor,
          role: 'guest',
        });
        setCurrentRoom(response.data.room);
        setLastRoom({
          code: response.data.room.code,
          name: response.data.room.name,
          nickname: response.data.member.nickname,
        });

        navigate(`/room/${response.data.room.code}`);
      } else {
        navigate(`/room/${lastRoom.code}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Room not found or session closed.');
      if (err?.code === 'ROOM_NOT_FOUND' || err?.status === 404) {
        setLastRoom(null);
      }
    } finally {
      setRejoining(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    joinRoomWithCode(roomCode, (storedNickname || nickname).trim());
  };

  const handleScannedCode = (scannedCode: string) => {
    const cleanCode = formatRoomCode(scannedCode);
    setRoomCode(cleanCode);
    const singerNickname = (storedNickname || nickname).trim();
    if (singerNickname) {
      joinRoomWithCode(cleanCode, singerNickname);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] text-white flex flex-col relative overflow-x-hidden">
      {/* Ambient background glow for rich desktop experience */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] bg-[#06B6D4]/15 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-[#8B5CF6]/10 rounded-full blur-[140px] opacity-40" />
        <div className="absolute top-1/2 left-1/3 w-[350px] h-[350px] bg-[#10B981]/08 rounded-full blur-[100px] opacity-30" />
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
                  Join a QueueMic Room
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#06B6D4] bg-[#06B6D4]/15 border border-[#06B6D4]/30 px-2.5 py-0.5 rounded-full">
                  🎤 Guest Singer Mode
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">Queue songs & follow live progress</p>
            </div>
          </div>

          {/* Desktop Navigation & Singer Identity */}
          <div className="hidden md:flex items-center gap-4">
            {storedNickname ? (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-xs ring-1 ring-white/20"
                  style={{ backgroundColor: selectedColor || storedColor || '#06B6D4' }}
                >
                  {storedNickname.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-300">{storedNickname}</span>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  Singer
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="text-xs font-semibold text-slate-400 hover:text-[#C084FC] transition-colors cursor-pointer"
            >
              Host a Room instead →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Responsive 2-column layout on web/desktop view */}
      <main className="w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Desktop Visual Showcase of Guest Experience (Desktop Web Only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-5">
            <GlassCard variant="surface" glow="none" className="p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center border border-white/10 shrink-0">
                  <LogIn className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-['Outfit'] text-white">Guest Party Experience</h3>
                  <p className="text-xs text-slate-400">Join the live karaoke session</p>
                </div>
              </div>

              {/* Visual Graphic Card */}
              <div className="rounded-2xl bg-gradient-to-b from-[#1C1F30] to-[#12131C] p-4 border border-white/10 mb-5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 mb-3 border-b border-white/[0.06]">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-semibold font-mono text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> SINGER LOUNGE
                  </span>
                  <span className="font-mono text-xs text-purple-400 font-bold">READY TO SING</span>
                </div>
                <div className="aspect-video rounded-xl bg-black/70 border border-white/5 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-radial from-[#06B6D4]/15 via-transparent to-transparent pointer-events-none" />
                  <div className="w-11 h-11 rounded-full bg-[#06B6D4]/20 border border-[#06B6D4]/40 flex items-center justify-center mb-2">
                    <Music2 className="w-5 h-5 text-[#06B6D4]" />
                  </div>
                  <span className="text-sm font-bold text-white font-['Outfit'] mb-0.5">
                    Request & Sing Karaoke
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Instant song requests with real-time room sync
                  </span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center shrink-0 text-base">
                    🔍
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Search & Queue Any Song</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Access YouTube's entire karaoke library and queue your favorite tracks with your singer name.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0 text-base">
                    👥
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Live Room Queue</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      See the song lineup in real time. Know exactly when your turn to sing is coming up next.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EC4899]/15 border border-[#EC4899]/30 flex items-center justify-center shrink-0 text-base">
                    🔊
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Follow Host Playback</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Follow along with synchronized video and lyrics directly on your own device.
                    </p>
                  </div>
                </div>
              </div>

              {/* Helpful Code Tip */}
              <div className="mt-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-[11px] text-cyan-300/90 leading-relaxed flex items-center gap-2">
                <span>💡</span>
                <span>Look at the Host's TV screen or ask the host for the 6-character room code.</span>
              </div>
            </GlassCard>
          </div>

          {/* Right Column / Centered on Mobile: Enter Code & Profile Form */}
          <div className="w-full lg:col-span-7 flex flex-col gap-4">
            {/* Previous Active Room Rejoin Card */}
            {lastRoom && (
              <GlassCard
                variant="elevated"
                glow="none"
                className="p-4 sm:p-5 border border-[#06B6D4]/30 bg-gradient-to-r from-[#06B6D4]/10 via-[#12131C] to-[#8B5CF6]/10 text-left animate-fade-in"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 font-['Outfit'] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Previous Active Room
                  </span>
                  {lastRoom.nickname && (
                    <span className="text-[10px] text-slate-300 font-mono">
                      🎤 {lastRoom.nickname}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate font-['Outfit']">
                      {lastRoom.name || 'QueueMic Lounge'}
                    </h4>
                    <p className="text-xs text-[#06B6D4] font-mono font-bold">{lastRoom.code}</p>
                  </div>

                  <NeonButton
                    size="sm"
                    variant="primary"
                    onClick={handleRejoin}
                    loading={rejoining}
                    className="shrink-0 px-3.5 py-1.5 font-bold text-xs"
                  >
                    ⚡️ Rejoin Room
                  </NeonButton>
                </div>
              </GlassCard>
            )}

            {/* 1. Manual 6-Digit Code Entry Card */}
            <GlassCard variant="surface" glow="cyan" className="p-5 sm:p-7 w-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center border border-white/10 shrink-0">
                  <LogIn className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Outfit'] text-white">Enter Room Code</h2>
                  <p className="text-xs text-slate-400">Enter the 6-character code shown on the TV / Host screen.</p>
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

              <form onSubmit={handleManualSubmit} noValidate className="space-y-4">
                {/* If nickname already created, lock it in so user doesn't have to re-create */}
                {storedNickname ? (
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-[#06B6D4]/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base ring-1 ring-white/20 shrink-0"
                        style={{ backgroundColor: selectedColor || storedColor || '#06B6D4' }}
                      >
                        {storedNickname.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Joining As
                        </span>
                        <span className="text-sm font-bold text-white font-['Outfit'] truncate block">
                          {storedNickname}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#06B6D4] bg-[#06B6D4]/15 px-2.5 py-0.5 rounded-full border border-[#06B6D4]/30 uppercase tracking-wider shrink-0">
                      Guest Singer
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Your Singer Nickname
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Karaoke Queen"
                      required
                      className="w-full bg-[#1C1F30] border border-white/10 focus:border-[#06B6D4] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06B6D4] transition-all"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Room Code
                    </label>
                    {roomCode.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRoomCode('')}
                        className="text-[11px] text-slate-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" /> Clear Code
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(formatRoomCode(e.target.value));
                      if (error) setError(null);
                    }}
                    placeholder="e.g. ABC123"
                    maxLength={8}
                    required
                    className="w-full bg-[#1C1F30] border border-white/10 focus:border-[#06B6D4] rounded-xl px-4 py-3.5 text-xl font-mono font-bold tracking-[0.25em] sm:tracking-[0.35em] text-center uppercase text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#06B6D4] transition-all"
                  />
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
                    variant="secondary"
                    size="lg"
                    loading={loading}
                    className="w-full font-bold"
                  >
                    Join QueueMic Room 🎤
                  </NeonButton>
                </div>
              </form>
            </GlassCard>

            {/* 2. Camera TV QR Scanner Card (Mobile view only - hidden on web/desktop view) */}
            <div className="mt-4 sm:mt-5 block lg:hidden">
              <GlassCard variant="surface" className="p-5 border-white/[0.08] text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center mx-auto mb-2.5">
                  <span className="text-2xl">📷</span>
                </div>
                <h3 className="text-sm font-bold text-white font-['Outfit'] mb-1">
                  Or Scan TV QR Code
                </h3>
                <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto leading-relaxed">
                  Point your camera at the Host's TV screen to join automatically in one tap without typing.
                </p>
                <NeonButton
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsScannerOpen(true)}
                  icon={<Camera className="w-4 h-4 text-[#06B6D4]" />}
                  className="w-full border border-[#06B6D4]/30 bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 text-[#22D3EE] font-bold"
                >
                  ⚡️ Open QR Camera Scanner
                </NeonButton>
              </GlassCard>
            </div>
          </div>
        </div>
      </main>

      {/* Camera QR Scanner Viewfinder Modal */}
      <WebQRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeScanned={handleScannedCode}
      />
    </div>
  );
};

