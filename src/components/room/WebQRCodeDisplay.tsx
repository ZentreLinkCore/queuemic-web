import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, QrCode } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';

export interface WebQRCodeDisplayProps {
  visible: boolean;
  roomCode: string;
  roomName: string;
  onClose: () => void;
}

export const WebQRCodeDisplay: React.FC<WebQRCodeDisplayProps> = ({
  visible,
  roomCode,
  roomName,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join?code=${roomCode.toUpperCase().trim()}`
      : `https://queuemic.com/join?code=${roomCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(6, 7, 14, 0.55)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-backdrop-blur animate-fade-in"
    >
      <GlassCard
        variant="elevated"
        glow="cyan"
        className="w-full max-w-sm p-6 text-center relative border-[#06B6D4]/30"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-1 text-[#06B6D4]">
          <QrCode className="w-5 h-5" />
          <h3 className="text-lg font-bold text-white font-['Outfit']">Scan to Join Room</h3>
        </div>
        <p className="text-xs text-slate-400 mb-6 truncate">{roomName}</p>

        {/* QR Code Canvas */}
        <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-white/10 mb-6">
          <QRCodeSVG
            value={joinUrl}
            size={200}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#0A0A14"
          />
        </div>

        <p className="text-xs text-slate-400 mb-2">Or enter Room Code manually:</p>
        <div className="text-3xl font-black text-white font-mono tracking-widest py-2 px-4 rounded-xl bg-white/[0.04] border border-white/10 inline-block mb-6 select-all">
          {roomCode}
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" /> Link Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy Direct Invite Link
            </>
          )}
        </button>
      </GlassCard>
    </div>
  );
};
