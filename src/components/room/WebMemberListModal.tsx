import React from 'react';
import { Users, X, Crown, Shield } from 'lucide-react';
import type { RoomMember } from '../../types';
import { getInitials } from '../../utils/formatting';
import { GlassCard } from '../common/GlassCard';

export interface WebMemberListModalProps {
  visible: boolean;
  members: RoomMember[];
  onClose: () => void;
  onTransferHostClick?: (member: RoomMember) => void;
  isCurrentUserHost?: boolean;
}

export const WebMemberListModal: React.FC<WebMemberListModalProps> = ({
  visible,
  members,
  onClose,
  onTransferHostClick,
  isCurrentUserHost = false,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fade-in">
      <GlassCard
        variant="elevated"
        glow="primary"
        className="w-full max-w-md p-6 relative flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit']">Party Members</h3>
              <p className="text-xs text-slate-400">{members.length} singers connected</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {members.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">No members connected</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
                    style={{ backgroundColor: member.avatarColor || '#8B5CF6' }}
                  >
                    {getInitials(member.nickname)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white truncate">{member.nickname}</h4>
                      {member.role === 'host' && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          member.isConnected ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      <span className="text-[11px] text-slate-400">
                        {member.role === 'host' ? 'Room Host' : 'Guest Singer'}
                      </span>
                    </div>
                  </div>
                </div>

                {isCurrentUserHost && member.role !== 'host' && onTransferHostClick && (
                  <button
                    onClick={() => onTransferHostClick(member)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-[#8B5CF6]/20 text-slate-300 hover:text-[#C084FC] border border-white/10 hover:border-[#8B5CF6]/30 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Shield className="w-3 h-3" /> Make Host
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
