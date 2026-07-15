# CollabSpace

A real-time collaborative document editor. Multiple people open the same
room and edit the same document at once — changes sync instantly over
Socket.IO, presence and typing are visible live, and concurrent edits are
merged instead of overwriting each other.

Built for the **ReadyNest Week 4 — Full Stack Development** internship task.

---

## 1. Why this shape

The brief asks for real-time collaboration, conflict handling, activity
tracking, multi-user sync, and persistence. A shared **document editor**
(rather than chat or a kanban board) was chosen because it's the one type of
app where "two people changed the same thing at once" is a real, visible
problem — which makes the conflict-handling requirement demonstrable rather
than theoretical.

## 2. Architecture

```
collabspace/
├── backend/                 Node.js + Express + Socket.IO + MongoDB
│   ├── config/db.js          Mongoose connection
│   ├── models/                User, Room, Document, DocumentVersion, Activity, Notification
│   ├── controllers/           Route handlers (auth, rooms, documents, notifications)
│   ├── routes/                Express routers, wired to controllers + middleware
│   ├── middleware/             auth (JWT), validate (express-validator), errorHandler
│   ├── socket/socketHandler.js Real-time engine: presence, typing, cursors, conflict merge
│   ├── utils/                  jwt helpers, AppError, catchAsync, seed script
│   └── server.js               Wires Express + Socket.IO + security middleware together
│
└── frontend/                 Next.js 16 (App Router) + TypeScript + Tailwind v4
    └── src/
        ├── app/                Routes: landing, login, signup, (app)/{dashboard,settings,room/[roomId]}
        ├── components/         ui/ (Button, Input, Avatar, Modal…), editor/, dashboard/, layout/
        ├── context/             AuthContext (session), ToastContext (notifications UI)
        ├── lib/                 api client, socket client, caret-position math, utils
        └── proxy.ts             Route protection (Next 16's renamed `middleware`)
```

**Why this split:** controllers hold business logic, routes just wire HTTP
verbs to controllers + middleware, models own schema/validation, and the
socket layer is isolated from REST entirely (it re-authenticates its own
handshake using the same JWT cookie, so there's one source of truth for
identity). On the frontend, anything stateful and cross-page (auth, toasts)
lives in `context/`; anything reusable but dumb lives in `components/ui/`.

## 3. The conflict-handling model (the interesting part)

Every document has a `revision` counter. When a client sends an edit, it
includes the revision/content it *started from*. If nothing else changed in
the meantime, the edit applies directly. If someone else's edit landed
first, the server computes a character-level diff of what *this* client
actually changed (not the whole document) and replays just that change on
top of the current server content — so two people editing different parts
of the same document both keep their work, instead of one silently
overwriting the other. See `backend/socket/socketHandler.js` → `mergeEdit()`.
When a merge happens, everyone in the room gets a toast saying so, and it's
logged to the activity feed.

## 4. Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`) — or update `MONGO_URI` to Atlas

### Backend
```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET at minimum
npm run dev                # http://localhost:5000
npm run seed                # optional: creates 2 demo users + a shared room
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                # http://localhost:3000
```

Open two browser windows (one normal, one incognito), log in as two
different users, join the same room, and type in both — that's the demo.

If you ran `npm run seed`, log in as:
- `priya@example.com` / `password123`
- `sam@example.com` / `password123`

and join the room with invite code `demo1234`.

## 5. Testing checklist

- [ ] Sign up, log out, log back in — session persists across refresh (auto-login via `/api/auth/me`)
- [ ] Create a room, copy the invite code, join it from a second account
- [ ] Type in the document from both windows at once — both edits land, no data loss
- [ ] Watch the presence bar and typing indicator update live
- [ ] Disconnect one client (close the tab) — the other sees a "left" toast and the presence list updates
- [ ] Open version history — restore an earlier revision
- [ ] Export the document (plain text download)
- [ ] Toggle dark/light mode — persists across reload
- [ ] Visit a nonexistent room ID → clean "not found" state, not a crash
- [ ] Visit `/dashboard` with no session → redirected to `/login`

## 6. Security notes

JWT lives in an httpOnly cookie (never touched by client JS), passwords are
bcrypt-hashed, Mongo inputs are sanitized against NoSQL injection, Helmet
sets standard security headers, and both a general API rate limiter and a
stricter one on `/api/auth/*` are in place.

## 7. Known limitations (worth mentioning in your viva)

- The conflict merge is a simplified diff-based strategy, not a full CRDT/OT
  library (like Yjs or ShareDB) — it's transparent and explainable in a viva,
  which matters more here than production-grade scale.
- Presence state lives in server memory (`Map`), not Redis — fine for one
  server instance; would need a shared store (Redis adapter for Socket.IO)
  to run multiple backend instances behind a load balancer.
- No automated test suite is included (would use Jest + Supertest for the
  API, Playwright for end-to-end multi-client sync) — noted here rather than
  faked, since a real suite worth trusting takes real time to write.
