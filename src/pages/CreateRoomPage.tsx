import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Tv, AlertCircle } from 'lucide-react';
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
          <h1 className="text-base font-bold text-white font-['Outfit']">Host a QueueMic Room</h1>
          <p className="text-[11px] text-slate-400">Configure party & launch screen</p>
        </div>
      </header>

      {/* Main Content: Flows naturally from the top without awkward vertical centering */}
      <main className="w-full max-w-lg p-4 sm:p-6 flex-1 flex flex-col">
        <GlassCard variant="surface" glow="primary" className="p-5 sm:p-7">
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
                <span className="text-[10px] font-bold text-[#A78BFA] bg-[#8B5CF6]/15 px-2 py-0.5 rounded-full border border-[#8B5CF6]/30 uppercase tracking-wider shrink-0">
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
                  className="w-full bg-[#1C1E2D] border border-white/10 focus:border-[#8B5CF6] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-all"
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
                className="w-full bg-[#1C1E2D] border border-white/10 focus:border-[#8B5CF6] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-all"
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
      </main>
    </div>
  );
};
