const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const diff = require('fast-diff');

const User = require('../models/User');
const Room = require('../models/Room');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const Activity = require('../models/Activity');

// roomId -> Map(socketId -> { userId, name, avatarColor, cursor})
const presence = new Map();

// roomId -> pending autosave timer
const autosaveTimers = new Map();

// Set once initSocket runs (at server startup, before any request can come
// in), so it's always populated by the time emitToUser is ever called from
// a controller.
let ioInstance = null;

/**
 * Pushes an event straight to one user's browser tab(s), regardless of
 * which room (if any) they currently have open. Every authenticated socket
 * joins a personal `user:<id>` room on connect (see io.on('connection')
 * below) specifically so this works app-wide, not just inside a shared
 * document room.
 */
function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

function getRoomPresence(roomId) {
  if (!presence.has(roomId)) presence.set(roomId, new Map());
  return presence.get(roomId);
}

function presenceList(roomId) {
  return Array.from(getRoomPresence(roomId).values());
}

/**
 * Applies an incoming edit against the current server document.
 *
 * Conflict handling strategy:
 * - The client sends `baseRevision` (the revision it started editing from)
 *   and its full resulting `content`.
 * - If baseRevision === current revision, no one else has changed the doc
 *   since this client last saw it -> apply directly, no conflict.
 * - If baseRevision < current revision, someone else's edit landed first.
 *   Instead of overwriting their work (data loss) or rejecting this client's
 *   work, we compute a character-level diff between the client's base text
 *   and the client's new text (i.e. what the client actually changed), then
 *   re-apply just that change on top of the *current* server content. This
 *   is a simplified operational-transform approach: it preserves both
 *   edits in the common case where they touch different parts of the text.
 */
function mergeEdit({ serverContent, serverRevision, clientBaseContent, clientNewContent, clientBaseRevision }) {
  if (clientBaseRevision === serverRevision || serverContent === clientBaseContent) {
    return { merged: clientNewContent, hadConflict: false };
  }

  // Diff what the client changed, relative to what the client started from
  const clientOps = diff(clientBaseContent, clientNewContent);

  // Walk the client's base text alongside the *server's* current text,
  // re-inserting the client's insertions and re-applying the client's
  // deletions at the matching point in the server text. This tolerates
  // edits in unrelated regions of the document without clobbering them.
  let merged = '';
  let serverCursor = 0;

  for (const [op, text] of clientOps) {
    if (op === diff.EQUAL) {
      // Text the client did not touch - copy forward from the server's
      // current content, since that reflects whatever else happened meanwhile.
      merged += serverContent.slice(serverCursor, serverCursor + text.length);
      serverCursor += text.length;
    } else if (op === diff.INSERT) {
      // Client added this text - keep the addition.
      merged += text;
    } else if (op === diff.DELETE) {
      // Client removed this text - skip it if it's still present at the
      // matching point in server content, otherwise it's already gone.
      const matchesHere = serverContent.slice(serverCursor, serverCursor + text.length) === text;
      if (matchesHere) {
        serverCursor += text.length;
      }
      // If it doesn't match, someone else already changed this region;
      // we simply don't advance serverCursor artificially and let EQUAL
      // segments realign on the next iteration.
    }
  }

  // Append anything left over on the server side (e.g. the other user
  // appended text past where this client's diff ended)
  merged += serverContent.slice(serverCursor);

  return { merged, hadConflict: true };
}

function initSocket(io) {
  ioInstance = io;

  // Authenticate the socket handshake using the same JWT cookie as the REST API
  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error('Authentication required'));

      const parsed = cookie.parse(rawCookie);
      const token = parsed.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired session'));
    }
  });

  io.on('connection', (socket) => {
    let currentRoomId = null;

    // Personal room for direct, cross-page pushes (e.g. notifications) that
    // aren't tied to any single document room the user might not have open.
    socket.join(`user:${socket.user._id}`);

    socket.on('room:join', async ({ roomId }, ack) => {
      try {
        // Guard against duplicate joins on the same socket (React Strict
        // Mode runs effects twice in development, which can fire this event
        // twice in quick succession before the first call finishes). Treat
        // a repeat join for the same room as a cheap refresh, not new work.
        if (currentRoomId === roomId && getRoomPresence(roomId).has(socket.id)) {
          const document = await Document.findOne({ room: roomId });
          return ack?.({
            success: true,
            document: { content: document.content, revision: document.revision, title: document.title },
            presence: presenceList(roomId),
          });
        }

        // Room + Document don't depend on each other's result, so fetch
        // both at once instead of one after another - this alone cuts the
        // network round-trip time roughly in half on a cloud (Atlas) DB.
        const [room, document] = await Promise.all([
          Room.findById(roomId),
          Document.findOne({ room: roomId }),
        ]);

        if (!room) return ack?.({ success: false, message: 'Room not found' });

        const isMember = room.members.some((m) => m.user.equals(socket.user._id));
        if (!isMember) return ack?.({ success: false, message: 'Not a member of this room' });

        currentRoomId = roomId;
        socket.join(roomId);

        // Atomic update instead of socket.user.save() - avoids Mongoose's
        // "Can't save() the same doc multiple times in parallel" error if
        // this handler ever runs twice concurrently for the same socket.
        // Also fire-and-forget: this is not needed to complete the join,
        // so we don't make the user wait on it.
        User.updateOne({ _id: socket.user._id }, { isOnline: true }).catch((err) =>
          console.error('[socket] failed to update isOnline:', err.message)
        );

        getRoomPresence(roomId).set(socket.id, {
          userId: String(socket.user._id),
          name: socket.user.name,
          avatarColor: socket.user.avatarColor,
          cursor: null,
        });

        socket.to(roomId).emit('presence:joined', {
          userId: socket.user._id,
          name: socket.user.name,
          avatarColor: socket.user.avatarColor,
        });

        io.in(roomId).emit('presence:list', presenceList(roomId));

        // Also non-critical for the join itself - log in the background
        // instead of delaying the ack to the client.
        Activity.create({ room: roomId, user: socket.user._id, type: 'join' }).catch((err) =>
          console.error('[socket] activity log failed:', err.message)
        );

        ack?.({
          success: true,
          document: {
            content: document.content,
            revision: document.revision,
            title: document.title,
          },
          presence: presenceList(roomId),
        });
      } catch (err) {
        console.error('[socket] room:join failed:', err.message);
        ack?.({ success: false, message: `Failed to join room: ${err.message}` });
      }
    });

    // Real-time text edits with conflict resolution
    socket.on('doc:edit', async ({ roomId, baseContent, newContent, baseRevision }) => {
      try {
        // Enforce role-based access before touching the document at all.
        // Viewers can watch a room live (presence, cursors, updates) but
        // can't submit edits. We check current membership on every edit
        // (rather than a cached value from room:join) so a role change
        // made mid-session takes effect immediately, without requiring
        // the viewer to reconnect.
        const room = await Room.findById(roomId);
        const member = room?.members.find((m) => m.user.equals(socket.user._id));
        if (!member || member.role === 'viewer') {
          socket.emit('doc:edit-rejected', {
            message: 'You have view-only access to this document.',
          });
          return;
        }

        const document = await Document.findOne({ room: roomId });
        if (!document) return;

        const { merged, hadConflict } = mergeEdit({
          serverContent: document.content,
          serverRevision: document.revision,
          clientBaseContent: baseContent,
          clientNewContent: newContent,
          clientBaseRevision: baseRevision,
        });

        document.content = merged;
        document.revision += 1;
        document.lastEditedBy = socket.user._id;
        await document.save();

        io.in(roomId).emit('doc:update', {
          content: merged,
          revision: document.revision,
          editedBy: { id: socket.user._id, name: socket.user.name },
          hadConflict,
        });

        if (hadConflict) {
          io.in(roomId).emit('doc:conflict-resolved', {
            message: `Merged concurrent edits from ${socket.user.name} automatically.`,
          });
          await Activity.create({ room: roomId, user: socket.user._id, type: 'conflict_resolved' });
        }

        // Debounced autosave snapshot for version history (avoid a new
        // version row on every keystroke)
        clearTimeout(autosaveTimers.get(roomId));
        autosaveTimers.set(
          roomId,
          setTimeout(async () => {
            try {
              const latest = await Document.findOne({ room: roomId });
              await DocumentVersion.create({
                document: latest._id,
                room: roomId,
                content: latest.content,
                revision: latest.revision,
                editedBy: socket.user._id,
                reason: hadConflict ? 'conflict-merge' : 'autosave',
              });
            } catch (e) {
              // non-critical background task; log only
              console.error('[socket] autosave snapshot failed:', e.message);
            }
          }, 4000)
        );
      } catch (err) {
        console.error('[socket] doc:edit failed:', err.message);
      }
    });

    // Typing indicator
    socket.on('doc:typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('doc:typing', {
        userId: socket.user._id,
        name: socket.user.name,
        isTyping,
      });
    });

    // Live cursor position broadcast (bonus feature)
    socket.on('cursor:move', ({ roomId, position }) => {
      const roomPresence = getRoomPresence(roomId);
      const entry = roomPresence.get(socket.id);
      if (entry) entry.cursor = position;

      socket.to(roomId).emit('cursor:update', {
        userId: socket.user._id,
        name: socket.user.name,
        avatarColor: socket.user.avatarColor,
        position,
      });
    });

    socket.on('room:leave', async ({ roomId }) => {
      handleLeave(socket, roomId);
    });

    socket.on('disconnect', async () => {
      if (currentRoomId) {
        await handleLeave(socket, currentRoomId);
      }
      try {
        await User.updateOne({ _id: socket.user._id }, { isOnline: false, lastSeen: new Date() });
      } catch (err) {
        console.error('[socket] disconnect cleanup failed:', err.message);
      }
    });

    async function handleLeave(socket, roomId) {
      const roomPresence = getRoomPresence(roomId);
      roomPresence.delete(socket.id);
      socket.leave(roomId);

      socket.to(roomId).emit('presence:left', {
        userId: socket.user._id,
        name: socket.user.name,
      });
      io.in(roomId).emit('presence:list', presenceList(roomId));

      try {
        await Activity.create({ room: roomId, user: socket.user._id, type: 'leave' });
      } catch (e) {
        // best-effort logging only
      }
    }
  });
}

module.exports = { initSocket, emitToUser };