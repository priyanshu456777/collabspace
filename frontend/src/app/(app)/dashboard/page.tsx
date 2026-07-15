'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, LogIn, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoomCard } from '@/components/dashboard/RoomCard';
import { RoomCardSkeleton } from '@/components/ui/Skeleton';
import { CreateRoomModal } from '@/components/dashboard/CreateRoomModal';
import { JoinRoomModal } from '@/components/dashboard/JoinRoomModal';
import type { Room } from '@/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ rooms: Room[] }>('/rooms')
      .then((data) => setRooms(data.rooms))
      .catch(() => showToast('Could not load your rooms.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rooms;
    const q = search.toLowerCase();
    return rooms.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [rooms, search]);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {authLoading ? 'Welcome' : `Welcome back, ${user?.name.split(' ')[0]}`}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Your rooms, all in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setJoinOpen(true)}>
            <LogIn className="h-4 w-4" /> Join room
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New room
          </Button>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rooms…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RoomCardSkeleton />
          <RoomCardSkeleton />
          <RoomCardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line py-20 text-center">
          <p className="font-display text-lg text-ink">
            {search ? 'No rooms match your search.' : 'No rooms yet.'}
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            {search ? 'Try a different term.' : 'Create one, or join with an invite code.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room) => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      )}

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(room) => {
          setRooms((prev) => [room, ...prev]);
          showToast('Room created. Share the invite code to bring others in.', 'success');
        }}
      />
      <JoinRoomModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(room) => {
          setRooms((prev) => (prev.some((r) => r._id === room._id) ? prev : [room, ...prev]));
          showToast(`Joined "${room.name}".`, 'success');
        }}
      />
    </div>
  );
}
