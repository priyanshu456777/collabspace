# CollabSpace API Reference

Base URL: `http://localhost:5000/api`
Auth: JWT in an httpOnly cookie (`token`), set automatically by login/signup.
All authenticated routes require this cookie (sent automatically by the
browser with `credentials: 'include'`) or an `Authorization: Bearer <token>`
header for non-browser clients.

## Auth — `/api/auth`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/signup` | — | `{ name, email, password }` | Create account, sets auth cookie |
| POST | `/login` | — | `{ email, password }` | Log in, sets auth cookie |
| POST | `/logout` | ✓ | — | Clears auth cookie, marks user offline |
| GET | `/me` | ✓ | — | Returns current user (used for session restore on refresh) |
| PATCH | `/profile` | ✓ | `{ name?, bio?, avatarColor? }` | Update profile fields |
| PATCH | `/password` | ✓ | `{ currentPassword, newPassword }` | Change password, re-issues cookie |

## Rooms — `/api/rooms`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/` | ✓ | `{ name, description? }` | Create a room + its document, becomes owner |
| GET | `/?search=` | ✓ | — | List rooms you're a member of, optional text search |
| POST | `/join` | ✓ | `{ inviteCode }` | Join a room by invite code |
| GET | `/:id` | ✓ | — | Get one room (must be a member) |
| POST | `/:id/leave` | ✓ | — | Leave a room (owners cannot leave) |
| GET | `/:id/activity` | ✓ | — | Last 50 activity log entries for the room |

## Documents — `/api/documents`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/:roomId/versions` | ✓ | Last 30 saved snapshots, newest first |
| POST | `/:roomId/restore/:versionId` | ✓ | Restore document content to a prior snapshot |
| GET | `/:roomId/export` | ✓ | Downloads current document as `.txt` |

## Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | ✓ | List notifications + unread count |
| PATCH | `/read` | ✓ | Mark all as read |

---

## Socket.IO events

Connects to the same origin as the API (default `http://localhost:5000`),
authenticated via the same `token` cookie during the handshake.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `room:join` | `{ roomId }` (with ack callback) | Join a room's real-time channel; ack returns current document + presence |
| `room:leave` | `{ roomId }` | Leave the real-time channel |
| `doc:edit` | `{ roomId, baseContent, newContent, baseRevision }` | Submit an edit; server merges if a conflict is detected |
| `doc:typing` | `{ roomId, isTyping }` | Broadcast typing state |
| `cursor:move` | `{ roomId, position }` | Broadcast caret position (character offset) |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `doc:update` | `{ content, revision, editedBy, hadConflict }` | New document state after any accepted edit |
| `doc:conflict-resolved` | `{ message }` | Sent additionally when an edit required merging |
| `presence:list` | `PresenceUser[]` | Full current presence list for the room |
| `presence:joined` / `presence:left` | `{ userId, name }` | Someone joined/left |
| `doc:typing` | `{ userId, name, isTyping }` | Someone's typing state changed |
| `cursor:update` | `{ userId, name, avatarColor, position }` | Someone's caret moved |

---

## ER overview

```
User ──< RoomMember >── Room ── 1:1 ── Document ── 1:N ── DocumentVersion
  │                        │
  └────< Activity >────────┘
  └────< Notification (recipient/actor) >
```

- A `Room` embeds its `members` (user ref + role) directly rather than a
  separate join collection, since membership is always read alongside the
  room and rarely queried independently.
- `Document` is 1:1 with `Room` (one shared doc per room); `DocumentVersion`
  is an append-only snapshot log used for the version-history feature.
