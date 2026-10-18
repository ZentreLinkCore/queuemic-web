import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Music, Check, Plus } from 'lucide-react';
import type { Song } from '../../types';
import { songApi } from '../../api/songApi';
import { queueApi } from '../../api/queueApi';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueueStore } from '../../store/useQueueStore';
import { GlassCard } from '../common/GlassCard';
import { NeonButton } from '../common/NeonButton';

export interface WebSongSearchModalProps {
  visible: boolean;
  roomCode: string;
  onClose: () => void;
  /** A song was queued; the modal closes right after, so the page shows the confirmation */
  onQueued?: (title: string, singerName: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Hits', icon: '🔥', query: '' },
  { id: 'opm', label: 'OPM & Rock', icon: '🎸', query: 'OPM Rock' },
  { id: 'pop', label: 'Pop & Billboard', icon: '✨', query: 'Pop' },
  { id: 'acoustic', label: 'Acoustic & Chill', icon: '🎵', query: 'Acoustic' },
  { id: 'duets', label: 'Duets & Love', icon: '🎤', query: 'Duet' },
  { id: 'retro', label: '80s & 90s', icon: '📼', query: '80s 90s' },
  { id: 'party', label: 'Party Bangers', icon: '🎉', query: 'Party' },
];

export const WebSongSearchModal: React.FC<WebSongSearchModalProps> = ({
  visible,
  roomCode,
  onClose,
  onQueued,
}) => {
  const { nickname } = useAuthStore();
  const { queue, currentPlaying, addToQueue } = useQueueStore();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentlyQueuedIds, setRecentlyQueuedIds] = useState<Set<number>>(new Set());

  const debouncedQuery = useDebounce(query, 300);

  // Clear selection on modal open/close: closing cancels it, so nothing is queued without the confirm step
  useEffect(() => {
    if (visible) {
      setErrorMessage(null);
    }
    setSelectedSong(null);
  }, [visible]);

  // The window listener below outlives renders; it calls the latest confirm handler
  const confirmAddRef = useRef<() => void>(() => {});

  // Keyboard shortcut: Enter to confirm add, Escape to cancel selection
  useEffect(() => {
    // The modal stays mounted while hidden: only listen while it is on screen
    if (!visible || !selectedSong || submitting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') confirmAddRef.current();
      if (e.key === 'Escape') setSelectedSong(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, selectedSong, submitting]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    const fetchSongs = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await songApi.searchSongs(debouncedQuery, roomCode);
        if (!cancelled) {
          setResults(res.data || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message || 'Failed to load songs');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSongs();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, roomCode, visible]);

  if (!visible) return null;

  const isSongQueued = (songId: number) => {
    return (
      currentPlaying?.songId === songId ||
      queue.some((item) => item.songId === songId) ||
      recentlyQueuedIds.has(songId)
    );
  };

  const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
    setActiveCategory(cat.id);
    setQuery(cat.query);
  };

  const handleSelectSong = (song: Song) => {
    if (selectedSong?.id === song.id) {
      setSelectedSong(null);
    } else {
      setSelectedSong(song);
      setErrorMessage(null);
    }
  };

  const handleConfirmAddQueue = async () => {
    if (!selectedSong || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);

    const singer =
      nickname?.trim() || (useAuthStore.getState().role === 'guest' ? 'Singer' : 'Host');

    try {
      const res = await queueApi.addToQueue(roomCode, {
        songId: selectedSong.id,
        singerName: singer,
      });

      if (res.data) {
        addToQueue(res.data);
      }

      setRecentlyQueuedIds((prev) => new Set(prev).add(selectedSong.id));
      setSelectedSong(null);
      onQueued?.(selectedSong.title, singer);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to add song to queue');
    } finally {
      setSubmitting(false);
    }
  };
  confirmAddRef.current = handleConfirmAddQueue;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xl animate-fade-in select-none">
      <GlassCard
        variant="elevated"
        glow="primary"
        className="w-full max-w-2xl h-[88vh] max-h-[780px] p-0 flex flex-col overflow-hidden border-white/10 shadow-2xl"
      >
        {/* Modal Top Header Bar */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#12131C]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center">
              <Music className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                Search Karaoke Catalog
              </h2>
              <p className="text-xs text-slate-400">
                Add to Party Queue • Room:{' '}
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

        {/* Search Input Bar */}
        <div className="p-4 pb-2 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value === '') setActiveCategory('all');
              }}
              placeholder="Search by song name or artist..."
              autoFocus
              className="w-full bg-[#1C1F30] border border-white/10 focus:border-[#8B5CF6] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-all"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setActiveCategory('all');
                }}
                className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sleek Category Filter Chips */}
        <div className="px-4 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-sm ring-1 ring-[#8B5CF6]/50'
                    : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/5'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results Counter / Status Line */}
        <div className="px-5 py-1.5 text-xs text-slate-400 shrink-0">
          {loading ? (
            <span className="flex items-center gap-1.5 text-[#C084FC]">
              <Loader2 className="w-3 h-3 animate-spin" /> Searching karaoke tracks...
            </span>
          ) : (
            <span>{results.length} songs available</span>
          )}
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="mx-4 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {loading ? (
            /* Animated Skeletons while searching */
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-white/10 rounded w-2/3" />
                      <div className="h-2.5 bg-white/5 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="w-20 h-8 bg-white/10 rounded-xl shrink-0" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            /* Empty Search Results */
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-2xl">
                🎵
              </div>
              <h3 className="text-sm font-bold text-white mb-1">No songs found</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Try searching for another song title, artist name, or pick a category above.
              </p>
            </div>
          ) : (
            /* Search Results */
            results.map((song) => {
              const queued = isSongQueued(song.id);
              const isSelected = selectedSong?.id === song.id;

              return (
                <div
                  key={song.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/60 shadow-sm'
                      : queued
                      ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {song.thumbnailUrl ? (
                      <img
                        src={song.thumbnailUrl}
                        alt={song.title}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-[#1E1F2E]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                        <Music className="w-5 h-5 text-slate-400" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">{song.title}</h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{song.artist}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#8B5CF6]/20 text-[#C084FC] border border-[#8B5CF6]/30">
                          KARAOKE
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {song.durationFormatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Add to Queue or Queued Checkmark Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectSong(song)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm active:scale-95 ${
                      isSelected
                        ? 'bg-[#8B5CF6] text-white ring-2 ring-[#8B5CF6]/50'
                        : queued
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400'
                        : 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white hover:brightness-105'
                    }`}
                    title={queued ? 'Already in queue! Click to queue another copy' : 'Queue this song'}
                  >
                    {queued ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Queued</span>
                      </>
                    ) : isSelected ? (
                      <>
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Queue</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Polished Confirmation Bottom Tray when a song is selected */}
        {selectedSong && (
          <div className="p-3.5 sm:p-4 bg-[#161828] border-t border-white/10 shrink-0 shadow-2xl animate-slide-up flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Selected Song Preview */}
            <div className="flex items-center gap-3 min-w-0 w-full sm:flex-1">
              {selectedSong.thumbnailUrl ? (
                <img
                  src={selectedSong.thumbnailUrl}
                  alt={selectedSong.title}
                  className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0 bg-[#1E1F2E]"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider block">
                  Add to Party Queue
                </span>
                <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                  {selectedSong.title}
                </h5>
                <div className="flex items-center gap-2 text-xs text-slate-400 truncate mt-0.5">
                  <span className="truncate">{selectedSong.artist}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-mono text-[11px] text-slate-500">{selectedSong.durationFormatted}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSong(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <NeonButton
                type="button"
                variant="primary"
                size="sm"
                loading={submitting}
                onClick={handleConfirmAddQueue}
                className="py-2.5 px-5 text-xs font-bold"
              >
                Confirm & Add 🎤
              </NeonButton>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
