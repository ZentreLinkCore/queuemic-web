import React, { useState } from 'react';
import { Settings, X, QrCode, Users, Copy, Check, Sliders, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { NeonButton } from '../common/NeonButton';
import { useRoomStore } from '../../store/useRoomStore';
import { roomApi } from '../../api/roomApi';

export interface WebSettingsModalProps {
  visible: boolean;
  roomCode: string;
  onClose: () => void;
  onOpenQrModal?: () => void;
  onOpenMemberList?: () => void;
  onCloseRoom?: () => void;
}

export const WebSettingsModal: React.FC<WebSettingsModalProps> = ({
  visible,
  roomCode,
  onClose,
  onOpenQrModal,
  onOpenMemberList,
  onCloseRoom,
}) => {
  const { currentRoom, updateRoomSettings, members } = useRoomStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!visible) return null;

  const allowGuestReorder = Boolean(
    currentRoom?.settings?.allow_guest_reorder ?? currentRoom?.settings?.allowGuestReorder ?? false
  );
  const allowGuestPlaybackControl = Boolean(
    currentRoom?.settings?.allow_guest_playback_control ??
      currentRoom?.settings?.allowGuestPlaybackControl ??
      false
  );
  const maxQueuePerUser: number | null =
    currentRoom?.settings?.max_queue_per_user ?? currentRoom?.settings?.maxQueuePerUser ?? null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode.toUpperCase().trim());
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleToggleGuestPlayback = async (value: boolean) => {
    updateRoomSettings({ allow_guest_playback_control: value, allowGuestPlaybackControl: value });
    try {
      await roomApi.updateSettings(roomCode, { allow_guest_playback_control: value });
    } catch (e) {
      console.warn('⚠️ [Update Settings Error]:', e);
    }
  };

  const handleToggleGuestReorder = async (value: boolean) => {
    updateRoomSettings({ allow_guest_reorder: value, allowGuestReorder: value });
    try {
      await roomApi.updateSettings(roomCode, { allow_guest_reorder: value });
    } catch (e) {
      console.warn('⚠️ [Update Settings Error]:', e);
    }
  };

  const handleChangeQueueLimit = async (step: 1 | -1) => {
    if (isUpdating) return;
    const next =
      maxQueuePerUser === null
        ? step > 0
          ? 1
          : null
        : maxQueuePerUser + step < 1
        ? null
        : Math.min(50, maxQueuePerUser + step);

    if (next === maxQueuePerUser) return;

    setIsUpdating(true);
    updateRoomSettings({ max_queue_per_user: next, maxQueuePerUser: next });
    try {
      await roomApi.updateSettings(roomCode, { max_queue_per_user: next });
    } catch (e) {
      console.warn('⚠️ [Update Settings Error]:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-backdrop-blur animate-fade-in select-none"
    >
      <GlassCard
        variant="elevated"
        glow="primary"
        className="w-full max-w-lg p-5 sm:p-6 relative flex flex-col max-h-[90vh] overflow-hidden border-white/10"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit']">Room Settings</h3>
              <p className="text-xs text-slate-400">
                Code:{' '}
                <span className="font-mono font-bold text-[#06B6D4]">{roomCode.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Settings Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Room Information */}
          <GlassCard variant="surface" className="p-4 border-white/5 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" /> Room Information
            </h4>

            <div className="flex items-center justify-between py-1.5 border-b border-white/5 text-xs">
              <span className="text-slate-400">Room Name</span>
              <span className="font-semibold text-white truncate max-w-[200px]">
                {currentRoom?.name || 'QueueMic Room'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-white/5 text-xs">
              <span className="text-slate-400">Room Code</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono font-bold text-[#06B6D4] tracking-widest cursor-pointer transition-colors"
                title="Click to copy code"
              >
                <span>{roomCode.toUpperCase()}</span>
                {copiedCode ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between py-1.5 text-xs">
              <span className="text-slate-400">Your Role</span>
              <span className="font-bold text-[#F59E0B] flex items-center gap-1">
                <span>👑 Host</span>
              </span>
            </div>
          </GlassCard>

          {/* Party Shortcuts */}
          <GlassCard variant="surface" className="p-4 border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" /> Party Shortcuts
            </h4>

            <div className="flex flex-col gap-2.5">
              {onOpenQrModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenQrModal();
                  }}
                  className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] active:scale-[0.99] border border-white/[0.08] hover:border-[#06B6D4]/30 flex items-center justify-between transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5 text-[#06B6D4]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[#06B6D4] transition-colors truncate">
                        Show Room QR Code
                      </p>
                      <p className="text-[11px] text-[#94A3B8] truncate">
                        Let singers scan & join this session
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-mono font-bold text-[#06B6D4] text-[11px] px-2 py-0.5 rounded-md bg-[#06B6D4]/10 border border-[#06B6D4]/20">
                      {roomCode.toUpperCase()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              )}

              {onOpenMemberList && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMemberList();
                  }}
                  className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] active:scale-[0.99] border border-white/[0.08] hover:border-[#8B5CF6]/30 flex items-center justify-between transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-[#A78BFA]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[#A78BFA] transition-colors truncate">
                        Manage Party Members
                      </p>
                      <p className="text-[11px] text-[#94A3B8] truncate">
                        Connected singers & host transfer
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-extrabold text-[#A78BFA] text-[11px] px-2 py-0.5 rounded-md bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
                      {members.length} {members.length === 1 ? 'Singer' : 'Singers'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              )}
            </div>
          </GlassCard>

          {/* Queue & Playback Controls */}
          <GlassCard variant="surface" className="p-4 border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#8B5CF6]" /> Queue & Playback Controls
            </h4>

            {/* Toggle 1: Guest Playback */}
            <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5 pb-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-white">
                  Allow Guests to Play / Pause & Skip
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Let connected party guests pause, resume, and skip songs from their phones.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allowGuestPlaybackControl}
                  onChange={(e) => handleToggleGuestPlayback(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B5CF6]" />
              </label>
            </div>

            {/* Toggle 2: Guest Reorder */}
            <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5 pb-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-white">
                  Allow Guests to Reorder
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Let party members move their own songs up or down in queue.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allowGuestReorder}
                  onChange={(e) => handleToggleGuestReorder(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B5CF6]" />
              </label>
            </div>

            {/* Stepper: Max Queue Limit */}
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-white">
                  Songs Each Guest Can Have Waiting
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Keeps the queue fair at busy parties. You, the host, are never limited.
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 bg-white/[0.04] p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => handleChangeQueueLimit(-1)}
                  disabled={maxQueuePerUser === null}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-white font-bold flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-white/5"
                  title="Allow fewer songs"
                >
                  −
                </button>

                <div className="w-16 text-center text-xs font-bold text-[#06B6D4]">
                  {maxQueuePerUser === null ? 'No limit' : maxQueuePerUser}
                </div>

                <button
                  type="button"
                  onClick={() => handleChangeQueueLimit(1)}
                  disabled={maxQueuePerUser === 50}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-white font-bold flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-white/5"
                  title="Allow more songs"
                >
                  +
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Danger Zone matching mobapp */}
          {onCloseRoom && (
            <GlassCard variant="elevated" glow="danger" className="p-4 sm:p-5 border-[1.5px]">
              <h3 className="text-base sm:text-lg font-bold text-[#FB7185] font-['Outfit'] mb-1">
                Danger Zone
              </h3>
              <p className="text-xs text-[#94A3B8] mb-4 leading-relaxed">
                Ending the room immediately stops TV playback and disconnects all connected phones.
              </p>
              <NeonButton
                type="button"
                variant="danger"
                size="md"
                onClick={() => {
                  onClose();
                  onCloseRoom();
                }}
                className="w-full py-2.5 font-bold"
              >
                End & Close Room
              </NeonButton>
            </GlassCard>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
