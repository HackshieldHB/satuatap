# SATU ATAP — Rumahmu, Lebih Pintar

SATU ATAP is a smart-home companion app. The **web UI** is still a Next.js 15 PWA
and defaults to mock services so `npm run dev` needs no Docker.

A **software IoT foundation** (Fastify API, PostgreSQL, Mosquitto, IoT gateway,
MQTT simulator) lives beside the UI. **No physical hardware is connected.**
See `docs/architecture/README.md`.

---

## Requirements

| Tool            | Version                                             |
| --------------- | --------------------------------------------------- |
| Node.js         | **>= 20** (developed & verified on Node 24 LTS)     |
| Package manager | **npm** (repo ships `package-lock.json`)            |
| Docker          | optional — Postgres / MQTT stack                    |
| Git             | any recent version                                  |

> This project uses npm. A `package-lock.json` is committed — do not switch
> package managers without regenerating the lock file intentionally.

Check your versions:

```bash
node -v
npm -v
```

---

## Tech Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript 5** (strict mode)
- **Tailwind CSS 3**
- **lucide-react** icons
- **Fastify** API + **Prisma** + PostgreSQL (`apps/api`, `packages/db`)
- **MQTT** Mosquitto + gateway (`apps/iot-gateway`) — not inside Next.js
- Image optimization via **sharp** (used automatically by `next/image`)

---

## Installation

```bash
npm install
```

---

## Environment

The UI requires **no env vars** (mock mode). Copy `.env.example` to `.env.local`
to point at the API:

```
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
NEXT_PUBLIC_API_URL=http://localhost:3001
```

API/gateway/Prisma use `DATABASE_URL`, `JWT_SECRET`, `MQTT_URL`, `INTERNAL_API_KEY`.
Never commit secrets.

---

## Development

```bash
npm run dev
```

Open **http://localhost:3000**. If 3000 is busy, use another port **other than 3001**
(the API uses 3001): `npm run dev -- -p 3002`.

### Full software stack (simulator, no hardware)

```bash
docker compose up -d postgres mosquitto
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:gateway
npm run dev:simulator
npm run dev
```

Demo login is unchanged. Set `NEXT_PUBLIC_ENABLE_MOCK_DATA=false` in `.env.local`
to load dashboard/devices/energy/water from the API.

---

## Type Checking

```bash
npm run typecheck
```

## Lint

```bash
npm run lint
```

## Production Build

```bash
npm run build
```

## Production Local Run

After a successful build:

```bash
npm run start
```

Open **http://localhost:3000**.

---

## Demo Account

Mock authentication (defined in `src/data/mock/index.ts` and
`src/services/auth.service.ts`):

| Field    | Value                     |
| -------- | ------------------------- |
| Email    | `kevin.santoso@gmail.com` |
| Password | `password123`             |
| OTP code | `123456`                  |

Use the OTP code `123456` anywhere an OTP is requested (e.g. after registration).
These are local mock credentials only — no real account or secret is involved.

---

## Available Routes

| Route                       | Description                          |
| --------------------------- | ------------------------------------ |
| `/login`                    | Login (demo credentials above)       |
| `/register`                 | Registration                         |
| `/otp`                      | OTP verification                     |
| `/forgot-password`          | Request password reset               |
| `/reset-password`           | Reset password                       |
| `/onboarding/welcome`       | Onboarding start                     |
| `/onboarding/create-home`   | Onboarding — name home               |
| `/onboarding/home-type`     | Onboarding — home type               |
| `/onboarding/add-device`    | Onboarding — add first device        |
| `/`                         | Dashboard (home) — requires login    |
| `/devices`, `/devices/add`  | Devices list / add device            |
| `/rooms`                    | Rooms (per-room icons)               |
| `/rooms/[id]`               | Room detail — devices in that room   |
| `/ai`                       | AI insights                          |
| `/services`                 | Services hub                         |
| `/payments`                 | Bills & payments                     |
| `/qris`                     | QRIS payment (mock; `?bill=<id>`)    |
| `/notifications`            | Notifications list                   |
| `/profile`                  | Profile & household members          |
| `/settings`                 | App preferences (mock toggles)       |
| `/homes`                    | Home switcher / management           |

All routes referenced in the UI are implemented and resolve — there are no
dangling links.

---

## Project Structure

```
src/
  app/
    (auth)/         Login, register, OTP, forgot/reset password (+ auth layout)
    (main)/         Authenticated app: dashboard (/), devices, rooms, ai,
                    services, payments, qris, notifications, profile,
                    settings, homes (+ AppShell layout with nav)
    onboarding/     Welcome → create-home → home-type → add-device flow
    layout.tsx      Root layout (fonts, AuthProvider, ToastProvider)
    globals.css     Tailwind base + global styles
    icon.png,       App icons (favicon / apple-touch generated from brand mark)
    apple-icon.png,
    favicon.ico
  components/
    ui/             Reusable primitives (Button, Card, Input, Modal, Toast, ...)
    layout/         AppShell, Header, Sidebar, AuthGuard, Logo
    home/ devices/ rooms/ ai/ services/ payments/ ads/ notifications/
  data/mock/        In-memory mock data (users, devices, rooms, bills, ads, ...)
  services/         Mock service layer (auth, home, payment, ad)
  hooks/            useAuth, useToast, useMediaQuery, useOffline
  lib/              cn / utils helpers
  types/            Shared TypeScript types
  middleware.ts     Passes through; auth is enforced client-side by guards
public/
  manifest.json     PWA manifest
  icons/            PWA icons (192 / 512)
```

Auth is client-side: the session is stored in `localStorage` and route
protection is handled by `AuthGuard` / `AppGuard` components (not middleware).

---

## Troubleshooting

**Port already in use**
Run on another port: `npm run dev -- -p 3001`. Do not kill unrelated processes.

**`node` / `npm` not found**
Install Node.js 20+ (LTS) from https://nodejs.org and reopen your terminal so
the updated PATH is picked up.

**`next lint` asks to configure ESLint**
The repo ships `eslint.config.mjs` (flat config extending `next/core-web-vitals`
and `next/typescript`). If prompted, ensure that file exists and dependencies are
installed.

**Missing environment variables**
None are required for Phase 1. If you added a `.env.local`, make sure values are
valid; delete it to fall back to defaults.

**Dependency installation failure**
Delete `node_modules` and `package-lock.json`, then `npm install` again. Ensure
Node is 20+.

**Build failure**
Run `npm run typecheck` and `npm run lint` to surface the root cause, fix it, then
re-run `npm run build`.

**Images not loading in production**
`next/image` optimizes remote images (Unsplash) at runtime via `sharp` and needs
network access. Allowed hosts are configured in `next.config.ts`.

---

## Known Limitations (Phase 1)

- QRIS payment, "add home", and settings toggles are **mock/simulated** — they
  update local UI state only and perform no real transaction or persistence.
- Lint reports non-blocking warnings only (unused vars, `react-hooks/exhaustive-deps`).
  The build succeeds regardless.
- All data is mock/in-memory; refreshing keeps only the `localStorage` session.
