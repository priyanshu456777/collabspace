'use client';

import { useEffect, useState } from 'react';
import { DoorOpen, Crown, Users, PenLine } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Analytics } from '@/types';

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short' });

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DoorOpen;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper-raised p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brass-soft text-brass">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-xl leading-none text-ink">{value}</p>
        <p className="mt-1 text-xs text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

/**
 * Dashboard-top summary: a handful of stat cards plus a lightweight
 * 7-day activity bar chart, all derived from GET /api/rooms/analytics/summary.
 * Built with plain divs instead of a charting library - there isn't one in
 * this project's dependencies, and a handful of CSS bars is plenty for a
 * trend this small.
 */
export function AnalyticsCards() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ analytics: Analytics }>('/rooms/analytics/summary')
      .then((res) => setData(res.analytics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(...data.activityTrend.map((d) => d.count), 1);

  return (
    <div className="mb-8">
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={DoorOpen} label="Rooms you're in" value={data.roomsCount} />
        <StatCard icon={Crown} label="Rooms you own" value={data.ownedCount} />
        <StatCard icon={Users} label="Collaborators" value={data.collaboratorsCount} />
        <StatCard icon={PenLine} label="Edits you've made" value={data.totalEdits} />
      </div>

      <div className="rounded-xl border border-line bg-paper-raised p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-ink-soft">Activity, last 7 days</p>
          {data.mostActiveRoom && (
            <p className="text-[11px] text-ink-soft">
              Most active: <span className="text-ink">{data.mostActiveRoom.name}</span>
            </p>
          )}
        </div>
        <div className="flex h-24 items-end gap-2">
          {data.activityTrend.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-16 w-full items-end">
                <div
                  className="w-full rounded-t-sm bg-brass/70 transition-all"
                  style={{ height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 2)}%` }}
                  title={`${d.count} events`}
                />
              </div>
              <span className="text-[10px] text-ink-soft">{dayLabel(d.date)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}