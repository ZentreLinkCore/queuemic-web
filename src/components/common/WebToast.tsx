import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

const TOAST_DURATION_MS = 3000;

export interface WebToastProps {
  message: string;
  /** Called once the toast has been on screen long enough; the owner unmounts it */
  onDone: () => void;
}

/** Short confirmation pinned to the bottom of the screen, e.g. after a song is queued (spec §8 Add Song). */
export const WebToast: React.FC<WebToastProps> = ({ message, onDone }) => {
  // Room pages re-render on every playback tick; an inline onDone must not restart the timer each time
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] max-w-[calc(100vw-32px)] px-4 py-2.5 rounded-xl bg-[#12131C]/95 backdrop-blur-xl border border-emerald-400/30 text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-slide-up"
    >
      <Check className="w-4 h-4 shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
};
