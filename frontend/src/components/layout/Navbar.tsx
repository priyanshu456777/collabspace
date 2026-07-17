'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { NotificationPanel } from '@/components/layout/NotificationPanel';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { NotificationItem } from '@/types';

export function Navbar() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  // Initial load - after this, new notifications arrive live over the
  // socket instead of being polled for.
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications')
      .then((data) => {
        if (cancelled) return;
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingNotifs(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live push: the backend emits `notification:new` the instant something
  // notification-worthy happens (someone joins your room, your role
  // changes, etc.), straight to this user's personal socket room - no
  // polling delay.
  useEffect(() => {
    const socket = getSocket();
    function handleNew(notification: NotificationItem) {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      setUnreadCount((count) => count + 1);
      showToast(notification.message, 'info');
    }
    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [showToast]);

  const handleRead = useCallback(() => {
    setUnreadCount(0);
    api.patch('/notifications/read').catch(() => {});
  }, []);

  // Global keyboard shortcuts: Ctrl/Cmd+K opens the command palette from
  // anywhere in the app, Escape closes whatever's open.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const isTypingTarget =
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setOpen(false);
        return;
      }
      if (!isTypingTarget && e.key === '/') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-line bg-paper-raised px-6 py-3.5 md:px-10">
      <button
        onClick={() => setPaletteOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-ink-soft hover:border-brass hover:text-ink md:flex"
      >
        Jump to room…
        <kbd className="ml-4 rounded border border-line bg-paper-raised px-1.5 py-0.5 text-[10px] font-medium">
          Ctrl K
        </kbd>
      </button>
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
          {open && (
            <NotificationPanel
              notifications={notifications}
              loading={loadingNotifs}
              onClose={() => setOpen(false)}
              onRead={handleRead}
            />
          )}
        </div>
        <Avatar name={user.name} color={user.avatarColor} imageUrl={user.avatarImage} size="sm" online />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}