'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, DoorOpen, Settings, LayoutGrid, CornerDownLeft } from 'lucide-react';
import { api } from '@/lib/api';
import type { Room } from '@/types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface StaticAction {
  id: string;
  label: string;
  hint: string;
  icon: typeof LayoutGrid;
  href: string;
}

const staticActions: StaticAction[] = [
  { id: 'dashboard', label: 'Go to Rooms', hint: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
  { id: 'settings', label: 'Go to Settings', hint: 'Profile & account', icon: Settings, href: '/settings' },
];

/**
 * App-wide Ctrl/Cmd+K palette: jump straight into any room you're a member
 * of, or to a static destination, without leaving the keyboard. Rooms are
 * fetched lazily the first time the palette opens rather than on every
 * page load, since most sessions never open it.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Reset the palette's local UI state each time it opens - this is a
    // one-time synchronization on the `open` transition, not a per-render
    // cascade, matching the same pattern used in AuthContext for
    // session-restore-on-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery('');
    setActiveIndex(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);

    if (rooms === null) {
      api
        .get<{ rooms: Room[] }>('/rooms')
        .then((data) => setRooms(data.rooms))
        .catch(() => setRooms([]));
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rooms.slice(0, 6);
    return rooms.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)).slice(0, 6);
  }, [rooms, query]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticActions;
    return staticActions.filter((a) => a.label.toLowerCase().includes(q));
  }, [query]);

  // Flat list so arrow keys / Enter work across both sections uniformly.
  const flatResults = useMemo(
    () => [
      ...filteredActions.map((a) => ({ kind: 'action' as const, item: a })),
      ...filteredRooms.map((r) => ({ kind: 'room' as const, item: r })),
    ],
    [filteredActions, filteredRooms]
  );

  function go(href: string) {
    router.push(href);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatResults[activeIndex];
      if (!selected) return;
      if (selected.kind === 'action') go(selected.item.href);
      else go(`/room/${selected.item._id}`);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-paper-raised shadow-2xl"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-ink-soft" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search rooms or jump to a page…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
              />
              <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-soft sm:block">
                Esc
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {rooms === null && <p className="px-3 py-6 text-center text-xs text-ink-soft">Loading…</p>}

              {rooms !== null && flatResults.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-ink-soft">No matches for &ldquo;{query}&rdquo;.</p>
              )}

              {filteredActions.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                    Navigate
                  </p>
                  {filteredActions.map((a, i) => {
                    const Icon = a.icon;
                    const isActive = flatResults[activeIndex]?.kind === 'action' && flatResults[activeIndex].item.id === a.id;
                    return (
                      <button
                        key={a.id}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => go(a.href)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isActive ? 'bg-brass-soft text-ink' : 'text-ink hover:bg-paper'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-ink-soft" />
                        <span className="flex-1">{a.label}</span>
                        <span className="text-[10px] text-ink-soft">{a.hint}</span>
                        {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-soft" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredRooms.length > 0 && (
                <div>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                    Rooms
                  </p>
                  {filteredRooms.map((r, i) => {
                    const flatIdx = filteredActions.length + i;
                    const isActive = activeIndex === flatIdx;
                    return (
                      <button
                        key={r._id}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        onClick={() => go(`/room/${r._id}`)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isActive ? 'bg-brass-soft text-ink' : 'text-ink hover:bg-paper'
                        }`}
                      >
                        <DoorOpen className="h-4 w-4 shrink-0 text-ink-soft" />
                        <span className="flex-1 truncate">{r.name}</span>
                        {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-soft" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[10px] text-ink-soft">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line px-1 py-0.5">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line px-1 py-0.5">Enter</kbd> select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line px-1 py-0.5">Ctrl K</kbd> toggle anywhere
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}