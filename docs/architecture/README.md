# Architecture

SATU ATAP Phase 1 software foundation. **No physical hardware is connected.**

```text
Next.js :3000  --HTTP-->  API :3001  --SQL-->  PostgreSQL :5432
                              ^
                              | internal HTTP
                         IoT Gateway :3100  --MQTT-->  Mosquitto :1883
                              ^
                         IoT Simulator (fake ESP32)
```

| Process | Role |
| --- | --- |
| `src/` Next.js | Existing PWA. Mock services by default. |
| `apps/api` | Fastify: auth, homes, devices, telemetry, commands, automation, alerts, SSE |
| `apps/iot-gateway` | MQTT client only. Validates, forwards to API. Publishes commands. |
| `apps/iot-simulator` | Publishes the same MQTT topics future ESP32 firmware will use |
| `packages/db` | Prisma + PostgreSQL |
| `packages/shared` | Capabilities, Zod contracts, MQTT topic helpers |

MQTT is never used from React or Next.js.

See [implementation-plan.md](./implementation-plan.md).
