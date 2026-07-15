'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Rooms', icon: LayoutGrid },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper-raised px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
        <div className="h-6 w-6 rounded-md bg-ink dark:bg-brass" />
        <span className="font-display text-base text-ink">CollabSpace</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-brass-soft text-ink' : 'text-ink-soft hover:bg-paper hover:text-ink'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-paper hover:text-danger"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </aside>
  );
}
