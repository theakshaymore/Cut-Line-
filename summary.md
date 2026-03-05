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
- Normalized Inter typography to standard UI defaults for consistency:
  - `font-size: 16px`, `font-weight: 400`
  - removed forced global `h1-h4` weight override
  - file: `client/src/index.css`
- Fixed role-based post-login routing in customer login page:
  - `admin` -> `/admin`
  - `barber` -> `/barber/dashboard`
  - `customer` -> `/salons`
  - file: `client/src/pages/CustomerLogin.jsx`

### Latest auth policy update

- Added persisted app-level setting to control barber invite requirement:
  - Prisma model: `AppSetting` (singleton row, default `requireBarberInvite=false`)
  - Files:
    - `server/prisma/schema.prisma`
    - `server/prisma/migrations/20260303234500_add_app_setting/migration.sql`
- Added backend endpoints:
  - `GET /api/auth/barber-registration-policy` (public)
  - `GET /api/auth/admin/settings` (admin)
  - `PATCH /api/auth/admin/settings` (admin)
  - `POST /api/auth/barber-register` (no token path)
  - file updates:
    - `server/src/controllers/auth.controller.js`
    - `server/src/routes/auth.routes.js`
- Updated barber registration flow:
  - If `requireBarberInvite=true`: token required and validated
  - If `false`: token not required
  - Files:
    - `client/src/context/AuthContext.jsx`
    - `client/src/pages/BarberRegister.jsx`
- Added Admin Panel toggle UI:
  - Label: `Authorized Accounts`
  - Default OFF behavior is enforced by DB default
  - File:
    - `client/src/pages/AdminPanel.jsx`

### Latest media + UI enhancement update

- Added ImageKit integration for shop images:
  - New backend ImageKit auth service:
    - `server/src/services/imagekit.service.js`
  - New endpoint for ImageKit auth params:
    - `GET /api/auth/image-upload-auth`
  - Added ImageKit env variables:
    - `server/.env.example`
    - `client/.env.example`
  - Added `imagekit` dependency:
    - `server/package.json`
- Added salon image field:
  - Prisma `Salon.imageUrl` and migration:
    - `server/prisma/schema.prisma`
    - `server/prisma/migrations/20260304101500_add_salon_image/migration.sql`
- Barber registration now supports shop photo upload:
  - Client uploads image to ImageKit then sends URL to backend
  - Files:
    - `client/src/utils/imageUpload.js`
    - `client/src/pages/BarberRegister.jsx`
    - `server/src/controllers/auth.controller.js`
- Added shop image edit in barber dashboard:
  - New barber APIs:
    - `GET /api/barber/salon`
    - `PATCH /api/barber/salon/photo`
  - Files:
    - `server/src/controllers/barber.controller.js`
    - `server/src/routes/barber.routes.js`
    - `client/src/pages/BarberDashboard.jsx`
- Upgraded UI/UX visuals and iconography:
  - Landing hero section with image + highlights:
    - `client/src/pages/Landing.jsx`
  - Login/Register pages now include visual image layouts:
    - `client/src/pages/CustomerLogin.jsx`
    - `client/src/pages/CustomerRegister.jsx`
    - `client/src/pages/BarberLogin.jsx`
    - `client/src/pages/BarberRegister.jsx`
  - Salon listing/detail upgraded from basic boxes to richer cards:
    - `client/src/pages/SalonList.jsx`
    - `client/src/components/SalonCard.jsx`
    - `client/src/pages/SalonDetail.jsx`
  - Added meaningful icons to queue/chair/admin/my-queue views:
    - `client/src/components/QueueList.jsx`
    - `client/src/components/ChairCard.jsx`
    - `client/src/pages/MyQueue.jsx`
    - `client/src/pages/AdminPanel.jsx`

### Latest navigation + customer/admin UX update

- Added breadcrumb navigation across pages:
  - `client/src/components/Breadcrumbs.jsx`
  - wired in `client/src/App.jsx`
- Added public route guard behavior:
  - logged-in users are redirected away from login/register pages to role home
  - file: `client/src/App.jsx`
- Added global customer "your-turn" toast popup listener:
  - file: `client/src/App.jsx`
- Changed dark theme base to pure black/neutral tone:
  - `client/src/index.css`
  - `client/src/components/Navbar.jsx`
  - app shell in `client/src/App.jsx`
- Customer homepage (`/salons`) now includes:
  - right-side "My Waiting List" queue status panel
  - refresh button for queue status
  - first-load skeleton cards
  - file: `client/src/pages/SalonList.jsx`
- Queue join UX updates:
  - after join, redirect to customer homepage (`/salons`)
  - disable join button with "Already Joined" when active queue exists
  - file: `client/src/pages/SalonDetail.jsx`
- Admin panel now includes separate sections:
  - all customers list
  - all barbers with shop details
  - new backend endpoint:
    - `GET /api/auth/admin/users-overview`
  - files:
    - `server/src/controllers/auth.controller.js`
    - `server/src/routes/auth.routes.js`
    - `client/src/pages/AdminPanel.jsx`

### Documentation sync update
- Updated `README.md` API and feature sections to match current codebase:
  - ImageKit auth endpoint
  - optional barber registration route (`/barber-register`)
  - admin settings/users overview endpoints
  - barber salon photo endpoints
  - customer queue UX notes and local env notes
- Trimmed `README.md` to repository/project information only:
  - removed run/setup/how-to-execute command sections
  - retained architecture, features, API/event surface, and config references
- Removed obsolete `version` key from root `docker-compose.yml` to avoid Docker Compose v2 warning.

### Latest backend modernization + admin governance update
- Migrated backend from CommonJS to ESM (`import/export`):
  - Added `"type": "module"` in `server/package.json`
  - Converted all files in `server/src/**` to ESM import style.
- Added structured logging/tracing support:
  - new logger utility: `server/src/utils/logger.js`
  - request ID + request/response logs middleware:
    - `server/src/middleware/requestLogger.middleware.js`
  - startup/unhandled crash logging in `server/src/index.js`
  - express error middleware in `server/src/index.js`
- Added moderation fields for admin governance:
  - `User.isBanned`, `User.bannedAt`, `User.bannedReason`
  - `Salon.isListed` (controls storefront visibility)
  - Prisma migration:
    - `server/prisma/migrations/20260305110000_add_ban_and_listing/migration.sql`
- Auth/login ban enforcement:
  - blocked users now get explicit banned error on login and auth middleware checks.
- Added admin governance APIs:
  - `PATCH /api/auth/admin/users/:id/ban`
  - `DELETE /api/auth/admin/users/:id`
  - `PATCH /api/auth/admin/salons/:id/listing` (delist/relist)
  - `DELETE /api/auth/admin/salons/:id`
  - expanded `GET /api/auth/admin/users-overview` with customers, barbers, salons data
- Updated admin panel UI:
  - accordion sections for Users and Stores
  - ban/unban + delete actions for users
  - delist/relist + delete actions for stores
  - file: `client/src/pages/AdminPanel.jsx`
- Queue UX unified on customer homepage:
  - removed redundant `/my-queue` route usage
  - kept "My Waiting List" card on `/salons`
  - added optional queue details modal with leave action
  - file updates:
    - `client/src/App.jsx`
    - `client/src/pages/SalonList.jsx`
    - `client/src/pages/SalonDetail.jsx`
- Tightened salon API payload and removed placeholder rating:
  - removed static rating field
  - restricted selected fields for nearby salon API
  - delisted salons now hidden from nearby list and detail response
  - file: `server/src/controllers/salon.controller.js`
