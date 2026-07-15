'use client';

import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import type { ActivityItem } from '@/types';

const labels: Record<ActivityItem['type'], string> = {
  join: 'joined the room',
  leave: 'left the room',
  edit: 'edited the document',
  room_created: 'created this room',
  conflict_resolved: 'had overlapping edits auto-merged',
};

export function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-ink-soft">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3 overflow-y-auto px-4 py-3">
      {activity.map((item) => (
        <li key={item._id} className="flex gap-2.5">
          <Avatar name={item.user.name} color={item.user.avatarColor} size="xs" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink">
              <span className="font-medium">{item.user.name}</span> {labels[item.type]}
            </p>
            <p className="text-[10px] text-ink-soft">{timeAgo(item.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
