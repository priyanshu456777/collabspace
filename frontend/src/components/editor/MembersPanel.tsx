'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import type { Room } from '@/types';

interface MembersPanelProps {
  room: Room;
  currentUserId: string;
  onRoleChanged: (updatedRoom: Room) => void;
}

export function MembersPanel({ room, currentUserId, onRoleChanged }: MembersPanelProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner =
    typeof room.owner === 'object' ? room.owner._id === currentUserId : room.owner === currentUserId;

  async function changeRole(userId: string, role: 'editor' | 'viewer') {
    setUpdatingId(userId);
    setError(null);
    try {
      const data = await api.patch<{ room: Room }>(`/rooms/${room._id}/members/${userId}/role`, { role });
      onRoleChanged(data.room);
    } catch {
      setError('Could not update that member\u2019s role.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      {error && <p className="mb-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-600">{error}</p>}
      <ul className="space-y-1.5">
        {room.members.map((m) => {
          const isSelf = m.user._id === currentUserId;
          return (
            <li
              key={m.user._id}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-paper"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={m.user.name} color={m.user.avatarColor} imageUrl={m.user.avatarImage} size="xs" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">
                    {m.user.name}
                    {isSelf ? ' (you)' : ''}
                  </p>
                  <p className="text-[11px] capitalize text-ink-soft">{m.role}</p>
                </div>
              </div>

              {isOwner && m.role !== 'owner' && (
                <select
                  value={m.role}
                  disabled={updatingId === m.user._id}
                  onChange={(e) => changeRole(m.user._id, e.target.value as 'editor' | 'viewer')}
                  className="rounded-md border border-line bg-paper-raised px-1.5 py-1 text-xs text-ink outline-none disabled:opacity-50"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}