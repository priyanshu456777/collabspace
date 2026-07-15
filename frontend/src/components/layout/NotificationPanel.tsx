'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

interface NotificationItem {
  _id: string;
  message: string;
  read: boolean;
  createdAt: string;
  actor?: { name: string; avatarColor: string };
}

export function NotificationPanel({ onClose, onRead }: { onClose: () => void; onRead: () => void }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ notifications: NotificationItem[] }>('/notifications')
      .then((data) => setNotifications(data.notifications))
      .finally(() => setLoading(false));

    api.patch('/notifications/read').then(onRead).catch(() => {});
  }, [onRead]);

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
            {n.actor && <Avatar name={n.actor.name} color={n.actor.avatarColor} size="xs" />}
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
