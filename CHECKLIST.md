# Final Checklist

Mapped to the actual marking scheme (10 marks):

| # | Criterion | Marks | Where to see it |
|---|---|---|---|
| 1 | Real-time functionality working | 3 | Type in the editor from two sessions at once — `socket/socketHandler.js`, `components/editor/Editor.tsx` |
| 2 | Backend logic & architecture | 2 | `backend/` layered into config/models/controllers/routes/middleware/socket |
| 3 | Multi-user sync & handling | 1.5 | Presence bar, join/leave toasts, `mergeEdit()` conflict resolution |
| 4 | Frontend UI/UX | 1.5 | Dashboard, editor, dark/light mode, responsive layout |
| 5 | Code quality & structure | 1 | Consistent error handling (`AppError`/`catchAsync`), typed frontend, no dead code |
| 6 | Innovation / extra features | 1 | Live cursor tracking, version history with restore, diff-based conflict merge (not last-write-wins) |

## Engineering verification actually performed in this build

- [x] Backend: every controller/route/middleware/socket file loads with no syntax or import errors (`node -c` + `require` smoke test)
- [x] Backend: `npm install` completes clean, no dependency conflicts
- [x] Frontend: `npx tsc --noEmit` → zero TypeScript errors
- [x] Frontend: `next build` (production, Turbopack) → zero build errors
- [x] Frontend: `eslint src --max-warnings=0` → zero lint errors/warnings
- [x] Frontend: production server boots and serves `/`, `/login`, `/signup` with HTTP 200
- [x] Frontend: `proxy.ts` correctly redirects unauthenticated `/dashboard` access (307 → `/login`)

## Not verified here (needs your machine, since this sandbox has no MongoDB and no browser)

- [ ] Full signup → login → create room → join from 2nd account → live co-editing, in an actual browser with `mongod` running
- [ ] Socket reconnect behavior after a dropped connection
- [ ] Cross-browser check (Chrome + one other)

Run through `README.md` section 5 (Testing checklist) locally to confirm these.
