# Database

ORM: **Prisma** (only). Engine: PostgreSQL 16.

Schema: `packages/db/prisma/schema.prisma`

Energy/water/environment readings are stored as `TelemetryReading.metrics` JSON (normalized numbers, not display strings). Hourly rollups live in `TelemetryAggregate`. Discrete motion is also in `MotionEvent`. Lighting last-state is `LightingState`.

Tariffs: `UtilityConfig` per home (`electricityTariffPerKwh`, `waterTariffPerM3`, `currency`).

Hierarchy: Organization → Site → Building → Floor → Home → Room → Device → Sensor.

Access: `Membership` with roles ADMIN | USER | VIEWER. API always checks membership; the UI `homeId` is not trusted.

## Commands

```bash
docker compose up -d postgres
cp .env.example .env
# ensure DATABASE_URL matches compose
npm run db:generate
npm run db:migrate
npm run db:seed
```

Seed user: `kevin.santoso@gmail.com` / `password123` (local only).
