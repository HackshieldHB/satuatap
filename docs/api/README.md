# API

Base URL (local): `http://localhost:3001`

Auth: `Authorization: Bearer <jwt>` from `POST /v1/auth/login`.

Internal (gateway): header `x-internal-key`.

## Health

- `GET /health`
- `GET /health/db`
- `GET /health/mqtt`

## Auth

- `POST /v1/auth/login` `{ email, password }`
- `GET /v1/auth/me`

## Homes / rooms / devices

- `GET /v1/homes`
- `GET /v1/homes/:homeId`
- `GET /v1/homes/:homeId/rooms`
- `GET /v1/homes/:homeId/devices?filter=&page=&pageSize=`
- `POST /v1/homes/:homeId/devices` — software registration (no physical claim yet)

## Telemetry

- `GET /v1/homes/:homeId/telemetry`
- `GET /v1/homes/:homeId/devices/:deviceId/telemetry`
- `GET /v1/homes/:homeId/energy`
- `GET /v1/homes/:homeId/water`
- `GET /v1/homes/:homeId/environment`
- `GET /v1/homes/:homeId/dashboard`

Query: `from`, `to`, `deviceId`, `roomId`, `limit` (capped).

## Commands

- `POST /v1/homes/:homeId/devices/:deviceId/commands`
  `{ "type": "TURN_ON"|"TURN_OFF"|"SET_BRIGHTNESS"|"SET_VALUE", "params": {}, "idempotencyKey": "..." }`
- `GET /v1/homes/:homeId/commands`

Lifecycle: PENDING → SENT → ACKNOWLEDGED → SUCCEEDED | FAILED | TIMEOUT | EXPIRED

## Automation / alerts / realtime

- `GET|POST /v1/homes/:homeId/automations`
- `PATCH|DELETE /v1/homes/:homeId/automations/:ruleId`
- `GET /v1/homes/:homeId/automations/:ruleId/executions`
- `GET /v1/homes/:homeId/alerts`
- `GET /v1/homes/:homeId/events` (SSE)

## Internal

- `POST /internal/telemetry`
- `POST /internal/status`
- `POST /internal/ack`
- `GET /internal/commands/pending`
- `POST /internal/commands/:id/sent`
