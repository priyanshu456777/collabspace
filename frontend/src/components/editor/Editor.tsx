'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getCaretCoordinates } from '@/lib/caretPosition';
import { debounce } from '@/lib/utils';

interface RemoteCursor {
  userId: string;
  name: string;
  avatarColor: string;
  position: number;
}

interface EditorProps {
  socket: Socket;
  roomId: string;
  initialContent: string;
  initialRevision: number;
  currentUserId: string;
  onTypingUsersChange: (names: string[]) => void;
  readOnly?: boolean;
}

export function Editor({
  socket,
  roomId,
  initialContent,
  initialRevision,
  currentUserId,
  onTypingUsersChange,
  readOnly = false,
}: EditorProps) {
  const [content, setContent] = useState(initialContent);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Tracks what the server has confirmed, so every outgoing edit can say
  // "here's what I started from" - the basis for the conflict merge.
  const lastKnown = useRef({ content: initialContent, revision: initialRevision });
  const typingUsersRef = useRef<Record<string, string>>({});
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sendTypingStop = useMemo(
    () => debounce(() => socket.emit('doc:typing', { roomId, isTyping: false }), 1200),
    [socket, roomId]
  );

  useEffect(() => {
    function handleUpdate(payload: {
      content: string;
      revision: number;
      editedBy: { id: string; name: string };
      hadConflict: boolean;
    }) {
      lastKnown.current = { content: payload.content, revision: payload.revision };
      // Only force-refresh the visible text if this update didn't originate
      // from us (our own non-conflicting edits already match locally, so
      // overwriting the textarea would just fight the user's live typing).
      if (payload.editedBy.id !== currentUserId || payload.hadConflict) {
        setContent(payload.content);
      }
    }

    function handleTyping(payload: { userId: string; name: string; isTyping: boolean }) {
      if (payload.isTyping) {
        typingUsersRef.current[payload.userId] = payload.name;
        clearTimeout(typingTimeouts.current[payload.userId]);
        typingTimeouts.current[payload.userId] = setTimeout(() => {
          delete typingUsersRef.current[payload.userId];
          onTypingUsersChange(Object.values(typingUsersRef.current));
        }, 3000);
      } else {
        delete typingUsersRef.current[payload.userId];
      }
      onTypingUsersChange(Object.values(typingUsersRef.current));
    }

    function handleCursorUpdate(payload: RemoteCursor) {
      setCursors((prev) => ({ ...prev, [payload.userId]: payload }));
    }

    function handlePresenceLeft(payload: { userId: string }) {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[payload.userId];
        return next;
      });
    }

    socket.on('doc:update', handleUpdate);
    socket.on('doc:typing', handleTyping);
    socket.on('cursor:update', handleCursorUpdate);
    socket.on('presence:left', handlePresenceLeft);

    return () => {
      socket.off('doc:update', handleUpdate);
      socket.off('doc:typing', handleTyping);
      socket.off('cursor:update', handleCursorUpdate);
      socket.off('presence:left', handlePresenceLeft);
    };
  }, [socket, currentUserId, onTypingUsersChange]);

  const emitEdit = useMemo(
    () =>
      debounce((payload: { baseContent: string; newContent: string; baseRevision: number }) => {
        socket.emit('doc:edit', { roomId, ...payload });
      }, 250),
    [socket, roomId]
  );

  const broadcastCursor = useMemo(
    () =>
      debounce((position: number) => {
        socket.emit('cursor:move', { roomId, position });
      }, 120),
    [socket, roomId]
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    // Belt-and-suspenders: the textarea is already `readOnly` below, so
    // browsers won't fire onChange from user typing, but this guards
    // against any programmatic change event still reaching the server.
    if (readOnly) return;

    const value = e.target.value;
    setContent(value);

    const payload = {
      baseContent: lastKnown.current.content,
      newContent: value,
      baseRevision: lastKnown.current.revision,
    };

    // Optimistically advance our own "known base" to what we just sent.
    // This prevents a second fast edit (fired before the server ack for the
    // first one arrives) from being diffed against a stale base and
    // misclassified as a conflict with itself - mergeEdit's
    // `serverContent === clientBaseContent` fast-path will line up once the
    // first edit lands, instead of falling into the diff-merge path and
    // duplicating our own text.
    lastKnown.current = { content: value, revision: lastKnown.current.revision };

    emitEdit(payload);

    socket.emit('doc:typing', { roomId, isTyping: true });
    sendTypingStop();

    broadcastCursor(e.target.selectionStart);
  }

  function handleSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    broadcastCursor((e.target as HTMLTextAreaElement).selectionStart);
  }

  // Reposition remote cursor overlays whenever content or cursor map changes
  const [overlayPositions, setOverlayPositions] = useState <
    Array<RemoteCursor & { top: number; left: number }>
  >([]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const positions = Object.values(cursors).map((c) => {
      const coords = getCaretCoordinates(textareaRef.current!, Math.min(c.position, content.length));
      return { ...c, top: coords.top, left: coords.left };
    });
    setOverlayPositions(positions);
  }, [cursors, content]);

  return (
    <div className="relative flex-1 overflow-hidden rounded-xl border border-line bg-paper-raised">
      {readOnly && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-soft shadow-sm">
          View only
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onSelect={handleSelect}
        onClick={handleSelect}
        onKeyUp={handleSelect}
        readOnly={readOnly}
        spellCheck={false}
        placeholder="Start writing. Everyone in this room sees it live…"
        className="h-full w-full resize-none bg-transparent p-6 font-mono text-sm leading-7 text-ink outline-none disabled:cursor-not-allowed"
      />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 overflow-hidden p-6">
        {overlayPositions.map((c) => (
          <div
            key={c.userId}
            className="absolute transition-all duration-100 ease-out"
            style={{ top: c.top, left: c.left }}
          >
            <div className="h-5 w-0.5 animate-caret" style={{ backgroundColor: c.avatarColor }} />
            <span
              className="absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: c.avatarColor }}
            >
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}