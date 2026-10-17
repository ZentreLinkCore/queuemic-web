import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2, Radio, QrCode, Tv, Music, ArrowRight, Sparkles, LogIn } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { useRoomStore } from '../store/useRoomStore';
import { roomApi } from '../api/roomApi';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { lastRoom, setLastRoom } = useRoomStore();
  const [rejoining, setRejoining] = useState(false);

  // Check if lastRoom is still active
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

  const handleRejoin = () => {
    if (!lastRoom) return;
    setRejoining(true);
    navigate(`/room/${lastRoom.code}`);
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
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-10">
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

        {/* Rejoin Card if active */}
        {lastRoom && (
          <GlassCard
            variant="surface"
            glow="primary"
            className="w-full max-w-md p-4 flex items-center justify-between gap-4 mb-8 text-left animate-slide-up"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C084FC]">
                Recent Party Room
              </span>
              <h4 className="text-sm font-bold text-white truncate">{lastRoom.name}</h4>
              <p className="text-xs text-slate-400 font-mono">Code: {lastRoom.code}</p>
            </div>

            <button
              disabled={rejoining}
              onClick={handleRejoin}
              className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Rejoin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </GlassCard>
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
