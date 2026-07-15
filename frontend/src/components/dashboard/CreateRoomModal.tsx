'use client';

import { useState, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import type { Room } from '@/types';

export function CreateRoomModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (room: Room) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ room: Room }>('/rooms', { name, description });
      onCreated(data.room);
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a room">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Room name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Q3 roadmap notes"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this room for?"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Create room
        </Button>
      </form>
    </Modal>
  );
}
