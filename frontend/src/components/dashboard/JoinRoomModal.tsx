'use client';

import { useState, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import type { Room } from '@/types';

export function JoinRoomModal({
  open,
  onClose,
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  onJoined: (room: Room) => void;
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ room: Room }>('/rooms/join', { inviteCode });
      onJoined(data.room);
      setInviteCode('');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not join the room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a room">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Invite code"
          required
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="e.g. a1b2c3d4"
          className="font-mono"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Join room
        </Button>
      </form>
    </Modal>
  );
}
