# SATU ATAP — Phase 1 Implementation Plan

**Status:** Software foundation only. No physical hardware.

## CURRENT STATE

- Next.js 15 App Router PWA at repository root (`src/`).
- Mock services in `src/services/*` + `src/data/mock/index.ts`.
- No HTTP API, PostgreSQL, MQTT, or IoT gateway.
- Auth is `localStorage` + mock JWT.
- CI: typecheck, lint, vitest, `next build`.

## ARCHITECTURE GAP

| Layer | Gap |
| --- | --- |
| API | None exists; mock classes are the contract |
| Database | None |
| MQTT | Protocol label only |
| Gateway | None |
| Simulator | None |
| Frontend | Direct mock imports |

## APPROACH (least disruption)

**Do not move** the Next.js app to `apps/web`.

Add beside the existing frontend:

```text
apps/api
apps/iot-gateway
apps/iot-simulator
packages/shared
packages/db
infrastructure/mosquitto
docs/
docker-compose.yml
firmware/   (placeholders only)
```

Root `package.json` remains the web app and becomes an npm workspace root.

## FILES THAT WILL CHANGE

- `package.json` / `package-lock.json` — workspaces + compose scripts
- `.gitignore` — env, prisma generate, app node_modules
- `.env.example` — mock flag + API URL (wired)
- `.github/workflows/ci.yml` — backend job
- `README.md` — stack runbook
- `src/types/index.ts` — optional capabilities / lastSeen
- `src/services/*` — interface + Mock vs Api implementations
- `src/app/(main)/energy/page.tsx`, `water/page.tsx` — read service layer
- `src/app/(main)/automations/page.tsx` — persist via service
- `src/components/devices/DeviceCard.tsx` — capability-based controls (light/switch), keep UI
- `src/lib/config.ts` — **new** env helper

Mock data files are **kept**.

## FILES THAT WILL BE ADDED

See folder list above plus docs under `docs/`.

## RISKS

- Dual-mode services must default to **mock** so `npm run dev` without Docker still works and existing vitest auth tests pass.
- Seed IDs should stay compatible with `home-1` used by the session.
- Do not bind Postgres/MQTT to public interfaces; compose binds `127.0.0.1`.

## SEQUENCE

1. This plan
2. Prisma schema + seed
3. Fastify API
4. Mosquitto + gateway
5. Simulator
6. Frontend dual services
7. SSE + automation
8. Tests + docs
