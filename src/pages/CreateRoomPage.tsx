import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Tv, AlertCircle } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore } from '../store/useRoomStore';
import { roomApi } from '../api/roomApi';

const AVATAR_COLORS = [
  '#8B5CF6', '#EC4899', '#06B6D4', '#10B981',
  '#F59E0B', '#6366F1', '#3B82F6', '#D946EF',
];

export const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, nickname: storedNickname, avatarColor: storedColor, setAvatarColor } = useAuthStore();
  const { setCurrentRoom } = useRoomStore();

  const [nickname, setNickname] = useState(storedNickname || '');
  const [roomName, setRoomName] = useState('');
  const [selectedColor, setSelectedColor] = useState(storedColor || '#8B5CF6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err?.message || 'Failed to create room. Please verify backend connection.');
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

        <GlassCard variant="surface" glow="primary" className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center shadow-sm border border-white/10">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black font-['Outfit'] text-white">Create Party Room</h1>
              <p className="text-xs text-slate-400">Host video on your screen and invite singers</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            {/* If nickname already created, lock it in so user doesn't have to re-create */}
            {storedNickname ? (
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-[#8B5CF6]/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base shadow-sm ring-2 ring-white/20"
                    style={{ backgroundColor: selectedColor || storedColor || '#8B5CF6' }}
                  >
                    {storedNickname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Hosting As
                    </span>
                    <span className="text-sm font-bold text-white font-['Outfit']">
                      {storedNickname}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Host Profile
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
                  className="w-full bg-[#1C1E2D] border border-white/10 focus:border-[#8B5CF6] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Room Name (Optional)
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={`e.g. ${storedNickname || 'Saturday Night'} Lounge`}
                className="w-full bg-[#1C1E2D] border border-white/10 focus:border-[#8B5CF6] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-all"
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

            <div className="pt-4">
              <NeonButton
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Launch Room Stage 🎤
              </NeonButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
