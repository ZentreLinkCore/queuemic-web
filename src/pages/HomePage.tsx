import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2, Radio, QrCode, Tv, Music, ArrowRight, Sparkles, LogIn } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { useRoomStore } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { roomApi } from '../api/roomApi';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { lastRoom, setLastRoom, setCurrentRoom } = useRoomStore();
  const [rejoining, setRejoining] = useState(false);

  // Check if lastRoom is still active on the server
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

  const handleRejoin = async () => {
    if (!lastRoom) return;
    setRejoining(true);
    try {
      const singerNickname = lastRoom.nickname || useAuthStore.getState().nickname || 'Singer';
      const response = await roomApi.joinRoom({
        roomCode: lastRoom.code,
        nickname: singerNickname,
        deviceUuid: useAuthStore.getState().deviceUuid,
      });

      if (response.success && response.data) {
        useAuthStore.getState().setAuth({
          token: response.data.token,
          memberId: response.data.member.id,
          nickname: response.data.member.nickname,
          avatarColor: response.data.member.avatarColor || '#06B6D4',
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
      console.warn('Rejoin failed, navigating directly or clearing stale room:', err);
      if (err?.code === 'ROOM_NOT_FOUND' || err?.status === 404) {
        setLastRoom(null);
      } else {
        navigate(`/room/${lastRoom.code}`);
      }
    } finally {
      setRejoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] text-white flex flex-col items-center justify-between p-4 sm:p-6 md:p-8">
      {/* Top Navbar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center shadow-sm border border-white/10">
            <Mic2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight font-['Outfit'] bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              QueueMic
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase ml-2 px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#C084FC] border border-[#8B5CF6]/30">
              Web Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/join')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-all cursor-pointer"
          >
            Enter Code
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl flex flex-col items-center text-center my-auto py-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300 mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#EC4899]" />
          <span>Real-time collaborative karaoke party</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight font-['Outfit'] leading-[1.1] mb-6">
          Sing Together.{' '}
          <span className="bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#06B6D4] bg-clip-text text-transparent">
            In Perfect Sync.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed font-normal">
          Queue karaoke tracks from any phone or laptop. Watch video playback and lyrics in real time,
          with sub-second synchronization and zero latency drift.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-6">
          <NeonButton
            size="lg"
            variant="primary"
            onClick={() => navigate('/create')}
            icon={<Tv className="w-5 h-5" />}
            className="w-full sm:w-auto"
          >
            Host a Party Room
          </NeonButton>

          <NeonButton
            size="lg"
            variant="outline"
            onClick={() => navigate('/join')}
            icon={<LogIn className="w-5 h-5" />}
            className="w-full sm:w-auto"
          >
            Join as Singer
          </NeonButton>
        </div>

        {/* Previous Active Room Rejoin Card */}
        {lastRoom && (
          <div className="w-full max-w-md mb-8 animate-fade-in">
            <GlassCard
              variant="elevated"
              glow="cyan"
              className="p-4 sm:p-5 border-[#06B6D4]/40 bg-gradient-to-r from-[#06B6D4]/15 via-[#12131C] to-[#8B5CF6]/15 text-left shadow-lg"
            >
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 font-['Outfit']">
                    Previous Room Active
                  </span>
                </div>
                {lastRoom.nickname && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                    🎤 {lastRoom.nickname}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-white truncate font-['Outfit']">
                    {lastRoom.name || 'QueueMic Lounge'}
                  </h4>
                  <p className="text-xs text-slate-300 font-mono flex items-center gap-1.5 mt-0.5">
                    <span>Code:</span>
                    <span className="text-[#06B6D4] font-bold text-sm tracking-wider">
                      {lastRoom.code}
                    </span>
                  </p>
                </div>

                <NeonButton
                  size="sm"
                  variant="primary"
                  onClick={handleRejoin}
                  loading={rejoining}
                  icon={<ArrowRight className="w-4 h-4" />}
                  className="shrink-0 px-4 py-2 font-bold shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                >
                  ⚡️ Rejoin
                </NeonButton>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left mt-4">
          <GlassCard variant="surface" className="p-5 border-white/[0.07]">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center mb-3">
              <Music className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Collaborative Queue</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anyone in the room can search YouTube and line up tracks with singer tags.
            </p>
          </GlassCard>

          <GlassCard variant="surface" className="p-5 border-white/[0.07]">
            <div className="w-10 h-10 rounded-xl bg-[#EC4899]/15 border border-[#EC4899]/30 flex items-center justify-center mb-3">
              <Radio className="w-5 h-5 text-[#EC4899]" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Real-time Echo Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatic NTP clock estimation keeps guest progress bars aligned to the millisecond.
            </p>
          </GlassCard>

          <GlassCard variant="surface" className="p-5 border-white/[0.07]">
            <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center mb-3">
              <QrCode className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Instant QR Join</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan from any camera phone to connect instantly without app installation.
            </p>
          </GlassCard>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-6 border-t border-white/[0.08] text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 QueueMic. Realtime Karaoke Architecture.</p>
        <p className="font-mono text-[11px] text-slate-600">Laravel 13 • Reverb • Vite React 19</p>
      </footer>
    </div>
  );
};
