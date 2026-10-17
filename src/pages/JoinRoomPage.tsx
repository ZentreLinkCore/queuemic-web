import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LogIn, AlertCircle } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
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
  const { setCurrentRoom, setLastRoom } = useRoomStore();

  const codeFromUrl = searchParams.get('code') || '';
  const [roomCode, setRoomCode] = useState(formatRoomCode(codeFromUrl));
  const [nickname, setNickname] = useState(storedNickname || '');
  const [selectedColor, setSelectedColor] = useState(storedColor || '#06B6D4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (codeFromUrl) {
      setRoomCode(formatRoomCode(codeFromUrl));
    }
  }, [codeFromUrl]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formatRoomCode(roomCode);
    if (!cleanCode || cleanCode.length < 4) {
      setError('Please enter a valid room code (e.g. 6 characters)');
      return;
    }

    const finalNickname = nickname.trim() || 'Guest Singer';

    setLoading(true);
    setError(null);

    try {
      const response = await roomApi.joinRoom({
        roomCode: cleanCode,
        nickname: finalNickname,
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
      }
    } catch (err: any) {
      setError(err?.message || 'Room not found or session closed. Check the code on the Host screen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <GlassCard variant="surface" glow="cyan" className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center shadow-sm border border-white/10">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black font-['Outfit'] text-white">Join Party Room</h1>
              <p className="text-xs text-slate-400">Queue songs and follow live progress</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(formatRoomCode(e.target.value))}
                placeholder="e.g. ABC123"
                maxLength={8}
                required
                className="w-full bg-[#1C1E2D] border border-white/10 focus:border-[#06B6D4] rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-center uppercase text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#06B6D4] transition-all"
              />
            </div>

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

            <div className="pt-4">
              <NeonButton
                type="submit"
                variant="secondary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Join Party Stage 🎶
              </NeonButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
