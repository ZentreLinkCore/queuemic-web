import React, { useState, useEffect } from 'react';
import { X, Dices, Check } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { NeonButton } from './NeonButton';
import { useAuthStore } from '../../store/useAuthStore';

export interface WebNicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (nickname: string, color: string) => void;
}

const AVATAR_COLORS = [
  '#8B5CF6', // Neon Violet
  '#06B6D4', // Cyan Glow
  '#EC4899', // Hot Pink
  '#F59E0B', // Sunset Amber
  '#10B981', // Emerald
  '#6366F1', // Royal Indigo
  '#EF4444', // Fiery Red
];

const RANDOM_NICKNAMES = [
  'Rockstar',
  'Karaoke Queen',
  'Songbird',
  'Mic Master',
  'Vocal Titan',
  'Party Diva',
  'Melody King',
  'Harmonix',
  'Voice Boss',
  'Groove Star',
];

export const WebNicknameModal: React.FC<WebNicknameModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { nickname: storedNickname, avatarColor: storedColor, setNickname } = useAuthStore();
  const [name, setName] = useState(storedNickname || '');
  const [selectedColor, setSelectedColor] = useState(storedColor || AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(storedNickname || '');
      setSelectedColor(storedColor || AVATAR_COLORS[0]);
      setError(null);
    }
  }, [isOpen, storedNickname, storedColor]);

  if (!isOpen) return null;

  const handleRandomize = () => {
    const randomName = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
    const randomNum = Math.floor(Math.random() * 90) + 10;
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    setName(`${randomName} ${randomNum}`);
    setSelectedColor(randomColor);
    setError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a nickname to proceed');
      return;
    }
    if (trimmed.length < 2) {
      setError('Nickname must be at least 2 characters');
      return;
    }
    if (trimmed.length > 30) {
      setError('Nickname must be less than 30 characters');
      return;
    }

    setNickname(trimmed, selectedColor);
    setError(null);
    onSuccess?.(trimmed, selectedColor);
    onClose();
  };

  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : '🎤';

  return (
    <div
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-backdrop-blur animate-fade-in select-none"
    >
      <div className="w-full max-w-sm relative">
        <GlassCard variant="elevated" glow="primary" className="p-6 relative border-white/10">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Avatar Preview */}
          <div className="flex flex-col items-center text-center mb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-2xl ring-2 ring-white/10 mb-3 transition-transform"
              style={{
                backgroundColor: selectedColor,
              }}
            >
              {initial}
            </div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">Set Singer Profile</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Everyone in the room will see this on the queue
            </p>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Singer Nickname
                </label>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="text-xs text-[#06B6D4] hover:text-[#22D3EE] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Random</span>
                </button>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rockstar 42"
                maxLength={30}
                autoFocus
                className="w-full bg-[#1C1F30] border border-white/10 focus:border-[#8B5CF6] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Avatar Glow Color
              </label>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {AVATAR_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    style={{ backgroundColor: col }}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                      selectedColor === col
                        ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#12131C]'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {selectedColor === col && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <NeonButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full font-bold"
              >
                Save Profile 🎤
              </NeonButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
