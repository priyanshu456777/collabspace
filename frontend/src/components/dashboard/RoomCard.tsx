import Link from 'next/link';
import { Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { Room } from '@/types';

export function RoomCard({ room }: { room: Room }) {
  const members = room.members.slice(0, 4);
  const extra = room.members.length - members.length;

  return (
    <Link
      href={`/room/${room._id}`}
      className="group flex flex-col rounded-xl border border-line bg-paper-raised p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-display text-lg text-ink group-hover:text-brass">{room.name}</h3>
        <span className="rounded bg-paper px-2 py-0.5 font-mono text-[10px] text-ink-soft">
          {room.inviteCode}
        </span>
      </div>
      <p className="mb-5 line-clamp-2 flex-1 text-sm text-ink-soft">
        {room.description || 'No description yet.'}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {members.map((m) => (
            <Avatar
              key={typeof m.user === 'string' ? m.user : m.user._id}
              name={typeof m.user === 'string' ? '?' : m.user.name}
              color={typeof m.user === 'string' ? undefined : m.user.avatarColor}
              size="xs"
              className="ring-2 ring-paper-raised"
            />
          ))}
          {extra > 0 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-line text-[10px] font-medium text-ink-soft ring-2 ring-paper-raised">
              +{extra}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-soft">
          <Users className="h-3.5 w-3.5" />
          {room.members.length}
        </div>
      </div>
    </Link>
  );
}