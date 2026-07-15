# Deployment Guide

## Database — MongoDB Atlas
1. Create a free cluster at cloud.mongodb.com.
2. Add a database user and allow network access from anywhere (0.0.0.0/0) or your backend host's IP.
3. Copy the connection string — this becomes `MONGO_URI`.

## Backend — Render or Railway
1. Push the `backend/` folder to a GitHub repo (or the whole monorepo — set the service's root directory to `backend`).
2. Create a new Web Service, build command `npm install`, start command `npm start`.
3. Set environment variables from `.env.example`:
   - `MONGO_URI` → your Atlas connection string
   - `JWT_SECRET` → a long random string (`openssl rand -base64 48`)
   - `CLIENT_URL` → your deployed frontend URL (e.g. `https://collabspace.vercel.app`) — required for CORS and cookie behavior
   - `NODE_ENV=production`
4. Once deployed, note the backend URL (e.g. `https://collabspace-api.onrender.com`).

## Frontend — Vercel
1. Import the repo into Vercel, set the project root to `frontend`.
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` → `https://<your-backend-url>/api`
   - `NEXT_PUBLIC_SOCKET_URL` → `https://<your-backend-url>`
3. Deploy.

## Cross-origin cookies in production
Because the frontend and backend are on different domains, the auth cookie
needs `Secure` (already conditional on `NODE_ENV=production` in
`utils/jwt.js`) and both sides need HTTPS — which Vercel and
Render/Railway provide by default. If you see login working but `/api/auth/me`
failing right after, double-check `CLIENT_URL` on the backend matches the
frontend's exact deployed origin (CORS is strict about this).

## Smoke test after deploying
1. Visit the frontend URL, sign up.
2. Open dev tools → Application → Cookies → confirm `token` is set as `Secure`, `HttpOnly`.
3. Create a room, open it in a second browser/incognito window logged in as a different user, and confirm live sync works end-to-end.
