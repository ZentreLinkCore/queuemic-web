import React from 'react';
import { WifiOff } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';

/** Offline indicator shown while the realtime connection is down (spec EC-04). */
export const WebConnectionBanner: React.FC = () => {
  const isConnected = useRoomStore((s) => s.isConnected);
  if (isConnected) return null;
  return (
    <div
      role="status"
      data-testid="offline-indicator"
      className="w-full px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 shrink-0 z-30"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline — reconnecting…</span>
    </div>
  );
};
