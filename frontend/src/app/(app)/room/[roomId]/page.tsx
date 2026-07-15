'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, History, Activity as ActivityIcon, Copy, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getSocket } from '@/lib/socket';
import { api, API_URL } from '@/lib/api';
import { Editor } from '@/components/editor/Editor';
import { PresenceBar } from '@/components/editor/PresenceBar';
import { ActivityFeed } from '@/components/editor/ActivityFeed';
import { VersionHistoryPanel } from '@/components/editor/VersionHistoryPanel';
import { Button } from '@/components/ui/Button';
import type { PresenceUser, ActivityItem, Room } from '@/types';

type SidePanel = 'activity' | 'history' | null;

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [docState, setDocState] = useState<{ content: string; revision: number } | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [panel, setPanel] = useState<SidePanel>(null);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get<{ room: Room }>(`/rooms/${roomId}`)
      .then((data) => setRoom(data.room))
      .catch(() => setNotFound(true));

    api
      .get<{ activity: ActivityItem[] }>(`/rooms/${roomId}/activity`)
      .then((data) => setActivity(data.activity))
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit(
      'room:join',
      { roomId },
      (res: { success: boolean; document?: { content: string; revision: number }; presence?: PresenceUser[]; message?: string }) => {
        if (res.success && res.document) {
          setDocState({ content: res.document.content, revision: res.document.revision });
          setPresence(res.presence || []);
        } else {
          showToast(res.message || 'Could not join the room in real time.', 'error');
        }
      }
    );

    function handlePresenceList(list: PresenceUser[]) {
      setPresence(list);
    }
    function handleJoined(payload: { name: string }) {
      showToast(`${payload.name} joined the room.`, 'info');
    }
    function handleLeft(payload: { name: string }) {
      showToast(`${payload.name} left the room.`, 'info');
    }
    function handleConflict(payload: { message: string }) {
      showToast(payload.message, 'info');
    }

    socket.on('presence:list', handlePresenceList);
    socket.on('presence:joined', handleJoined);
    socket.on('presence:left', handleLeft);
    socket.on('doc:conflict-resolved', handleConflict);

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('presence:list', handlePresenceList);
      socket.off('presence:joined', handleJoined);
      socket.off('presence:left', handleLeft);
      socket.off('doc:conflict-resolved', handleConflict);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  function copyInviteCode() {
    if (!room) return;
    navigator.clipboard.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="font-display text-2xl text-ink">Room not found</p>
          <p className="mt-2 text-sm text-ink-soft">It may have been deleted, or you&apos;re not a member.</p>
          <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-brass hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Only block on docState + user - this is what the editor actually needs
  // to render. Room metadata (name, invite code) fills in independently
  // once it arrives, instead of holding up the whole page behind two
  // sequential network round-trips.
  if (!docState || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink-soft">Loading room…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-paper-raised px-6 py-3.5">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-ink-soft hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-lg leading-tight text-ink">{room?.name || 'Untitled room'}</h1>
            <button
              onClick={copyInviteCode}
              disabled={!room}
              className="flex items-center gap-1 font-mono text-[11px] text-ink-soft hover:text-brass disabled:opacity-50"
            >
              {room?.inviteCode || '···'} {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <PresenceBar presence={presence} typingUsers={typingNames} />

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setPanel(panel === 'activity' ? null : 'activity')}>
            <ActivityIcon className="h-4 w-4" /> Activity
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPanel(panel === 'history' ? null : 'history')}>
            <History className="h-4 w-4" /> History
          </Button>
          <a href={`${API_URL}/documents/${roomId}/export`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4" /> Export
            </Button>
          </a>
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <Editor
          socket={getSocket()}
          roomId={roomId}
          initialContent={docState.content}
          initialRevision={docState.revision}
          currentUserId={user.id}
          onTypingUsersChange={setTypingNames}
        />

        {panel && (
          <aside className="w-72 shrink-0 overflow-hidden rounded-xl border border-line bg-paper-raised">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-medium text-ink">
                {panel === 'activity' ? 'Activity' : 'Version history'}
              </p>
            </div>
            <div className="h-[calc(100%-45px)]">
              {panel === 'activity' && <ActivityFeed activity={activity} />}
              {panel === 'history' && (
                <VersionHistoryPanel
                  roomId={roomId}
                  onRestored={(content) => setDocState((prev) => (prev ? { ...prev, content } : prev))}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}