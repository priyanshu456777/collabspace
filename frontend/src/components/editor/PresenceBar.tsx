'use client';

import { Avatar } from '@/components/ui/Avatar';
import type { PresenceUser } from '@/types';

export function PresenceBar({
  presence,
  typingUsers,
}: {
  presence: PresenceUser[];
  typingUsers: string[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {presence.map((p) => (
          <Avatar key={p.userId} name={p.name} color={p.avatarColor} size="sm" className="ring-2 ring-paper-raised" />
        ))}
      </div>
      <span className="text-xs text-ink-soft">
        {presence.length} online
        {typingUsers.length > 0 && (
          <span className="ml-2 text-brass">
            · {typingUsers.slice(0, 2).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing…
          </span>
        )}
      </span>
    </div>
  );
}
