import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, LogIn, AlertCircle, Camera, X } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { WebQRScannerModal } from '../components/room/WebQRScannerModal';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore } from '../store/useRoomStore';
import { roomApi } from '../api/roomApi';
import { formatRoomCode } from '../utils/formatting';

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
      if (!cleanCode || cleanCode.length < 4) {
        setError('Please enter a valid 6-character room code');
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
    const finalNickname = (storedNickname || nickname).trim() || 'Guest Singer';
    joinRoomWithCode(roomCode, finalNickname);
  };

  const handleScannedCode = (scannedCode: string) => {
    setRoomCode(scannedCode);
    const finalNickname = (storedNickname || nickname).trim() || 'Guest Singer';
    joinRoomWithCode(scannedCode, finalNickname);
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] text-white flex flex-col items-center">
      {/* Top Mobile HeaderBar */}
      <header className="w-full max-w-lg flex items-center gap-3 py-3 px-4 border-b border-white/[0.08] shrink-0 bg-[#0D0E15]/95 backdrop-blur-md sticky top-0 z-30">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          aria-label="Back to Home"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-white font-['Outfit']">Join a QueueMic Room</h1>
          <p className="text-[11px] text-slate-400">Queue songs & follow live progress</p>
        </div>
      </header>

      {/* Main Content: Flows naturally from the top */}
      <main className="w-full max-w-lg p-4 sm:p-6 flex-1 flex flex-col">
        {/* Previous Active Room Rejoin Card */}
        {lastRoom && (
          <GlassCard
            variant="elevated"
            glow="none"
            className="p-4 sm:p-5 mb-4 border border-[#06B6D4]/30 bg-gradient-to-r from-[#06B6D4]/10 via-[#12131C] to-[#8B5CF6]/10 text-left animate-fade-in"
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
        <GlassCard variant="surface" glow="cyan" className="p-5 sm:p-7">
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

          <form onSubmit={handleManualSubmit} className="space-y-4">
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
                <span className="text-[10px] font-bold text-[#06B6D4] bg-[#06B6D4]/15 px-2 py-0.5 rounded-full border border-[#06B6D4]/30 uppercase tracking-wider shrink-0">
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
                  className="w-full bg-[#1C1E2D] border border-white/10 focus:border-[#06B6D4] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#06B6D4] transition-all"
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
                className="w-full bg-[#1C1E2D] border border-white/10 focus:border-[#06B6D4] rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-center uppercase text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#06B6D4] transition-all"
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

        {/* 2. Camera TV QR Scanner Card (Enabled on Mobile View) */}
        <div className="mt-4">
          <GlassCard variant="surface" className="p-5 border-white/[0.08] text-center">
            <div className="w-11 h-11 rounded-2xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center mx-auto mb-2.5">
              <span className="text-xl">📷</span>
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
              className="w-full border border-[#06B6D4]/30 bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 text-white font-bold"
            >
              ⚡️ Open QR Camera Scanner
            </NeonButton>
          </GlassCard>
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
