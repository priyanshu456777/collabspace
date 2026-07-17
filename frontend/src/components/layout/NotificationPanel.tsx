'use client';

import { useEffect, useRef } from 'react';
import { timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import type { NotificationItem } from '@/types';

interface NotificationPanelProps {
  notifications: NotificationItem[];
  loading: boolean;
  onClose: () => void;
  onRead: () => void;
}

export function NotificationPanel({ notifications, loading, onClose, onRead }: NotificationPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Mark everything as read the moment the panel is opened, same as before.
  useEffect(() => {
    onRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-11 z-20 w-80 rounded-lg border border-line bg-paper-raised shadow-xl"
    >
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm font-medium text-ink">Notifications</p>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading && <p className="px-4 py-6 text-center text-xs text-ink-soft">Loading…</p>}
        {!loading && notifications.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-ink-soft">Nothing yet. All quiet in your rooms.</p>
        )}
        {notifications.map((n) => (
          <div key={n._id} className="flex gap-3 border-b border-line/60 px-4 py-3 last:border-0">
            {n.actor && <Avatar name={n.actor.name} color={n.actor.avatarColor} imageUrl={n.actor.avatarImage} size="xs" />}
            <div className="flex-1">
              <p className="text-xs text-ink">{n.message}</p>
              <p className="mt-0.5 text-[10px] text-ink-soft">{timeAgo(n.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}