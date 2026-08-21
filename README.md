# SATU ATAP — Rumahmu, Lebih Pintar

SATU ATAP is a smart-home companion app (Phase 1 UI/UX foundation). This phase is a
**fully client-side, mock-data build** — there is no backend, database, or real
integration. Authentication, devices, rooms, AI insights, payments, and ads are
all driven by in-memory mock services so the app runs entirely on `localhost`.

---

## Requirements

| Tool            | Version                                             |
| --------------- | --------------------------------------------------- |
| Node.js         | **>= 20** (developed & verified on Node 24 LTS)     |
| Package manager | **npm** (repo ships `package-lock.json`)            |
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
- Image optimization via **sharp** (used automatically by `next/image`)

---

## Installation

```bash
npm install
```

---

## Environment

Phase 1 requires **no environment variables** — it runs as-is.

A documented `.env.example` is provided for future phases. To create a local
override (optional):

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored. Never commit real secrets.

---

## Development

```bash
npm run dev
```

Open **http://localhost:3000**.

If port 3000 is busy, Next.js will offer the next free port (e.g. 3001), or you
can force one:

```bash
npm run dev -- -p 3001
```

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
