import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2, Radio, QrCode, Music, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { WebNicknameModal } from '../components/common/WebNicknameModal';
import { useAuthStore } from '../store/useAuthStore';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { nickname, avatarColor } = useAuthStore();
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);

  const handleHostPress = () => {
    if (!nickname || !nickname.trim()) {
      setPendingAction('create');
      setIsNicknameModalOpen(true);
      return;
    }
    navigate('/create');
  };

  const handleJoinPress = () => {
    if (!nickname || !nickname.trim()) {
      setPendingAction('join');
      setIsNicknameModalOpen(true);
      return;
    }
    navigate('/join');
  };

  const handleNicknameSuccess = () => {
    setIsNicknameModalOpen(false);
    if (pendingAction === 'create') {
      setPendingAction(null);
      navigate('/create');
    } else if (pendingAction === 'join') {
      setPendingAction(null);
      navigate('/join');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] text-white flex flex-col items-center overflow-x-hidden">
      {/* 1st Viewport / Above the Fold: Fills full viewport on mobile (100dvh) */}
      <div className="w-full min-h-[100dvh] flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 max-w-5xl">
        {/* Top Navbar: Enter Code removed as requested */}
        <header className="w-full flex items-center justify-between py-2 sm:py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center border border-white/10">
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
        </header>

        {/* Singer Profile Badge matching mobapp: Fills the first empty space */}
        <div className="w-full max-w-sm mt-3 mb-1 animate-fade-in">
          <div className="px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm ring-1 ring-white/15 shrink-0"
                style={{
                  backgroundColor: avatarColor || '#8B5CF6',
                }}
              >
                {nickname ? nickname.charAt(0).toUpperCase() : '🎤'}
              </div>
              <div className="min-w-0 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Singer Profile
                </span>
                <span className="text-xs sm:text-sm font-bold text-white font-['Outfit'] truncate block">
                  {nickname || 'Set your nickname'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNicknameModalOpen(true)}
              className="text-[11px] font-bold text-[#A78BFA] hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer shrink-0"
            >
              {nickname ? '✏️ Change' : '+ Set'}
            </button>
          </div>
        </div>

        {/* Hero Section: Centered */}
        <main className="w-full max-w-2xl flex flex-col items-center text-center my-auto py-3 sm:py-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300 mb-4 sm:mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[#EC4899]" />
            <span>Real-time collaborative karaoke party</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight font-['Outfit'] leading-[1.1] mb-4 sm:mb-5">
            Sing Together.{' '}
            <span className="bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#06B6D4] bg-clip-text text-transparent">
              In Perfect Sync.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-xl mb-6 sm:mb-8 leading-relaxed font-normal px-2">
            Queue karaoke tracks from any phone or laptop. Watch video playback and lyrics in real time,
            with sub-second synchronization and zero latency drift.
          </p>

          {/* Action Buttons: Themed with exact mobapp primary (Cyber Violet) and secondary (Electric Cyan) */}
          <div className="flex flex-col gap-3.5 w-full max-w-sm mb-2">
            <NeonButton
              size="lg"
              variant="primary"
              onClick={handleHostPress}
              icon={<span className="text-xl">👑</span>}
              className="w-full py-3.5 text-sm sm:text-base font-bold flex items-center justify-center gap-2"
            >
              Host a Party Room
            </NeonButton>

            <NeonButton
              size="lg"
              variant="outline"
              onClick={handleJoinPress}
              icon={<span className="text-xl">📱</span>}
              className="w-full py-3.5 text-sm sm:text-base font-bold text-white bg-white/[0.05] border border-white/15 hover:bg-white/[0.09] flex items-center justify-center gap-2"
            >
              Join as Singer
            </NeonButton>
          </div>

          {/* Quick Party Pillar Badges: Fills the lower empty space, clean without shadows */}
          <div className="w-full max-w-sm grid grid-cols-3 gap-2 mt-4 pt-1 animate-fade-in">
            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center flex flex-col items-center hover:border-[#8B5CF6]/30 transition-all">
              <span className="text-base mb-1">👑</span>
              <span className="text-[11px] font-bold text-white font-['Outfit']">Host TV</span>
              <span className="text-[9px] text-[#A78BFA] font-medium">Big Screen</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center flex flex-col items-center hover:border-[#06B6D4]/30 transition-all">
              <span className="text-base mb-1">📱</span>
              <span className="text-[11px] font-bold text-white font-['Outfit']">Phone Mic</span>
              <span className="text-[9px] text-[#06B6D4] font-medium">Remote Queue</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center flex flex-col items-center hover:border-emerald-500/30 transition-all">
              <span className="text-base mb-1">⚡️</span>
              <span className="text-[11px] font-bold text-white font-['Outfit']">Real-time</span>
              <span className="text-[9px] text-emerald-400 font-medium">Zero Drift</span>
            </div>
          </div>
        </main>

        {/* Scroll Hint */}
        <div className="shrink-0 pb-1 text-[11px] text-slate-400 font-medium flex items-center gap-1.5 opacity-90">
          <span>Scroll down for party features</span>
          <span>↓</span>
        </div>
      </div>

      {/* Nickname Modal matching mobapp */}
      <WebNicknameModal
        isOpen={isNicknameModalOpen}
        onClose={() => {
          setIsNicknameModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleNicknameSuccess}
      />

      {/* 2nd Screen / Below the Fold: Feature Highlights Grid (Visible only on scroll!) */}
      <section className="w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-16 border-t border-white/[0.08]">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-3xl font-extrabold font-['Outfit'] text-white">Party Features</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Built for effortless synchronization and karaoke fun</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
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
      </section>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-6 border-t border-white/[0.08] text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-2 px-4 sm:px-6">
        <p>© 2026 QueueMic. Realtime Karaoke Architecture.</p>
      </footer>
    </div>
  );
};
