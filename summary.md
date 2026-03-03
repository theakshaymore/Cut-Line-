# NextCut Implementation Summary

This file is a project handoff summary for the current state of the `nextcut` repository.
It is intended to let another developer continue work immediately with minimal context loss.

## 1. What was requested

A complete production-ready full-stack app named **NextCut** was requested with:
- Customer and Barber roles
- Queue management and live updates
- Backend: Node/Express, Prisma/PostgreSQL, Redis, Socket.IO, JWT, Nodemailer
- Frontend: React + Vite + Tailwind + Router + Axios + Socket client
- Specific folder structure, routes, socket events, and queue business logic
- Deliverables including `.env.example`, `README.md`, schema/migrations, and all pages/components

The implementation was done from an almost empty repo (only `.git` existed initially).

## 2. What was created (high-level)

### Root
- `.gitignore`
- `README.md`
- `summary.md` (this file)

### Server
Created complete backend scaffold and implementation under `server/`:
- `package.json`
- `.env.example`
- Prisma schema + migration:
  - `server/prisma/schema.prisma`
  - `server/prisma/migrations/20260303190000_init/migration.sql`
- App entrypoint:
  - `server/src/index.js`
- Middleware:
  - `auth.middleware.js`
  - `role.middleware.js`
  - `rateLimit.middleware.js`
- Routes:
  - `auth.routes.js`
  - `salon.routes.js`
  - `queue.routes.js`
  - `chair.routes.js`
  - `barber.routes.js`
- Controllers:
  - `auth.controller.js`
  - `salon.controller.js`
  - `queue.controller.js`
  - `chair.controller.js`
  - `barber.controller.js`
- Services:
  - `prisma.service.js`
  - `redis.service.js`
  - `mail.service.js`
  - `queue.service.js`
- Socket:
  - `socket/socket.handler.js`
- Utils:
  - `generateToken.js`
  - `calcWaitTime.js`

### Client
Created complete frontend scaffold and implementation under `client/`:
- `package.json`
- `.env.example`
- Vite/Tailwind setup:
  - `index.html`
  - `vite.config.js`
  - `tailwind.config.js`
  - `postcss.config.js`
- App runtime:
  - `src/main.jsx`
  - `src/App.jsx`
  - `src/index.css`
- Context:
  - `src/context/AuthContext.jsx`
  - `src/context/SocketContext.jsx`
- Hooks:
  - `src/hooks/useQueue.js`
  - `src/hooks/useSocket.js`
- Utils:
  - `src/utils/api.js`
  - `src/utils/formatTime.js`
- Components:
  - `Navbar.jsx`
  - `SalonCard.jsx`
  - `QueueList.jsx`
  - `ChairCard.jsx`
  - `WaitTimeBadge.jsx`
- Pages:
  - `Landing.jsx`
  - `CustomerLogin.jsx`
  - `CustomerRegister.jsx`
  - `BarberLogin.jsx`
  - `BarberRegister.jsx`
  - `SalonList.jsx`
  - `SalonDetail.jsx`
  - `MyQueue.jsx`
  - `BarberDashboard.jsx`
  - `AdminPanel.jsx`

## 3. Backend behavior implemented

### Auth
- Customer register (`POST /api/auth/register`)
- Login (`POST /api/auth/login`)
- Invite-only barber register (`POST /api/auth/barber-register/:token`)
- Admin send invite (`POST /api/auth/admin/send-invite`)
- Password hashing with bcrypt, JWT issuance with role + salonId

### Salons
- Nearby salons by geolocation and radius (`GET /api/salons`)
- Salon detail (`GET /api/salons/:id`)
- Returns queue/chair-derived data including estimated wait

### Customer queue
- Join queue (`POST /api/queue/join`)
- My status (`GET /api/queue/my-status`)
- Leave queue (`DELETE /api/queue/leave`)
- One active queue check + short Redis join throttle key

### Barber operations
- Get active queue (`GET /api/barber/queue`)
- Assign next to chair (`PATCH /api/barber/chair/:chairId/assign`)
- Mark chair done (`PATCH /api/barber/chair/:chairId/done`)
- Reset chair idle (`PATCH /api/barber/chair/:chairId/idle`)
- Mark no-show (`PATCH /api/barber/queue/:entryId/noshow`)
- Chair CRUD (`GET/POST/DELETE /api/barber/chairs`)

### Queue business logic
- Wait time calculation uses occupied chairs + avg service time
- Position re-numbering and estimated wait re-calc on queue changes
- Prisma transaction for assign and done flows
- Emits direct and room socket updates
- “Service elapsed” suggestion timer emitted to barber room when assign starts from all-idle state

### Redis layer
- Keys used:
  - `salon:{salonId}:queue`
  - `salon:{salonId}:chairs`
  - `socket:{customerId}`
  - `ratelimit:join:{customerId}`
- Redis startup is graceful (non-fatal if unavailable)
- Rehydrate queues/chairs from Postgres on server start

### Socket events
- Client -> server:
  - `join-salon-room`
  - `leave-salon-room`
  - `barber-join`
  - `customer-join`
- Server -> client:
  - `queue-updated`
  - `chair-updated`
  - `your-turn`
  - `position-changed`
  - `kicked-from-queue`
  - `chair-service-suggestion`

## 4. Frontend behavior implemented

- Auth state persisted in localStorage (`nextcut_token`, `nextcut_user`)
- Axios instance with bearer token interceptor
- Role-protected routes in `App.jsx`
- Customer flow:
  - Login/register
  - Fetch nearby salons via browser geolocation
  - Join salon queue with service selection
  - Track queue position and estimated wait live
  - Leave queue
- Barber flow:
  - Login/register via token page
  - Dashboard with queue and chair state
  - Assign/done/idle/no-show actions
  - Add chairs
  - React to realtime queue/chair updates
- Admin flow:
  - Send barber invite email

## 5. Important implementation notes / deviations

- Added `BarberInvite` Prisma model for one-time invite token tracking (`token`, `usedAt`), instead of overloading `Salon.registrationToken`.
- Included `salonId` in sanitized auth response user payload for barber role consistency in frontend socket join.
- Queue join initially creates an entry then runs full recalculation to normalize position/wait values.
- Redis service is intentionally tolerant: server continues without Redis if connection fails.

## 6. Validation done

- Ran backend JavaScript syntax checks via `node --check` across `server/src/**/*.js`.
- Did **not** run full runtime integration (no dependency install/migration execution in this environment).

## 7. What still needs to be done by next developer

1. Install dependencies:
   - `cd server && npm install`
   - `cd ../client && npm install`
2. Configure environment:
   - `server/.env` from `.env.example`
   - `client/.env` from `.env.example`
3. Run Prisma:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
4. Start services:
   - Backend: `npm run dev` in `server`
   - Frontend: `npm run dev` in `client`
5. Ensure PostgreSQL + Redis are running and reachable.
6. Seed/create an admin user (`role=admin`) to use invite endpoint/UI.
7. Perform end-to-end QA (auth, queue operations, socket updates, invite mail).

## 8. Maintenance rule for this file

When future code changes are made, update this `summary.md` in the same change set with:
- What changed
- Why it changed
- Files touched
- Any migration/env/runtime impact

## 9. Latest updates (this change set)

### Added local infra orchestration
- Added root Docker Compose file for PostgreSQL + Redis:
  - `docker-compose.yml`
- Services included:
  - `postgres:16` exposed on `5432` with db `nextcut`
  - `redis:7` exposed on `6379`
- Added persistent named volumes and health checks.

### Added dark theme with toggle
- Enabled Tailwind class-based dark mode (`darkMode: "class"`).
- Added theme context with persistence:
  - `client/src/context/ThemeContext.jsx`
  - Stores selected theme in localStorage key `nextcut_theme`
  - Applies/removes `dark` class on `<html>`
- Wired provider in app bootstrap:
  - `client/src/main.jsx`
- Added navbar theme toggle button (sun/moon icons):
  - `client/src/components/Navbar.jsx`
- Updated app shell and core pages/components with dark-mode styles:
  - `client/src/App.jsx`
  - `client/src/index.css`
  - `client/src/components/SalonCard.jsx`
  - `client/src/components/QueueList.jsx`
  - `client/src/components/ChairCard.jsx`
  - `client/src/components/WaitTimeBadge.jsx`
  - `client/src/pages/Landing.jsx`
  - `client/src/pages/CustomerLogin.jsx`
  - `client/src/pages/CustomerRegister.jsx`
  - `client/src/pages/BarberLogin.jsx`
  - `client/src/pages/BarberRegister.jsx`
  - `client/src/pages/SalonDetail.jsx`
  - `client/src/pages/MyQueue.jsx`
  - `client/src/pages/BarberDashboard.jsx`
  - `client/src/pages/AdminPanel.jsx`

### Docs updates
- Updated `README.md` with Docker Compose startup/stop instructions.
- Added theme section documenting dark/light toggle behavior.

### Typography update
- Added global `Inter` font across the website via Google Fonts import in:
  - `client/src/index.css`

### Latest UI access update
- Replaced global font with `Goudy Bookletter 1911` in:
  - `client/src/index.css`
- Reverted global font back to `Inter` in:
  - `client/src/index.css`
- Added a floating bottom-right `Admin` button that routes to `/admin`:
  - `client/src/App.jsx`
- Increased global typography weight/size for better readability with this font:
  - `client/src/index.css`
