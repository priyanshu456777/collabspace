'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { NotificationPanel } from '@/components/layout/NotificationPanel';
import { api } from '@/lib/api';

export function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await api.get<{ unreadCount: number }>('/notifications');
        if (!cancelled) setUnreadCount(data.unreadCount);
      } catch {
        // notifications are non-critical; fail silently
      }
    }
    poll();
    const interval = setInterval(poll, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-line bg-paper-raised px-6 py-3.5 md:px-10">
      <div />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-paper hover:text-ink"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {open && <NotificationPanel onClose={() => setOpen(false)} onRead={() => setUnreadCount(0)} />}
        </div>
        <Avatar name={user.name} color={user.avatarColor} size="sm" online />
      </div>
    </header>
  );
}
