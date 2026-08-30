# Satu Atap — Cursor Prompts (Phase 1 Software)

Sembilan prompt, urut P0 → P8. Jalankan satu per satu, jangan digabung.
Tiap blok sudah membawa peta repo sendiri — Cursor tidak perlu tahu isi percakapan mana pun.

## Cara pakai

1. Kerjakan berurutan. Urutannya bukan selera: P1, P3, dan P4 menentukan konstanta di dalam firmware ESP32. Kalau tiga itu berubah setelah board ter-flash, lo flash ulang semuanya.
2. Setelah tiap prompt jalankan gerbang verifikasi:
   ```
   npm run typecheck && npm run lint && npm run test:backend && npm run build
   ```
3. Commit per prompt, jangan ditumpuk. Pesan commit disarankan ada di tiap bagian.
4. Kalau Cursor mulai melebar ke file yang tidak ada di daftar "FILES IN SCOPE", hentikan dan minta dia batasi diri. Prompt-prompt ini sengaja diberi pagar.

## Urutan dan ketergantungan

```
P0  bring-up          -> wajib pertama, tanpa ini tidak ada yang bisa diverifikasi
P1  kontrak MQTT      -> memblokir firmware
P2  perbaikan counter -> tidak memblokir firmware, tapi wajib sebelum data asli masuk
P3  schema + seed     -> memblokir firmware
P4  MQTT auth         -> memblokir firmware
P5  refactor engine   -> prasyarat P6
P6  edge agent        -> inti offline mode
P7  alert + rollup    -> butuh P2 dan P6
P8  dashboard         -> butuh P7
```

Setelah **P4** selesai, firmware ESP32 aman ditulis. P5–P8 boleh jalan paralel dengan perakitan hardware.

---

## P0 — Bring-up dan verifikasi dasar

**Estimasi:** setengah hari, sebagian besar manual
**Commit:** `chore: verify full stack bring-up`

Kerjakan bagian manual ini **sendiri**, jangan lewat Cursor:

```bash
# 1. Install Docker Desktop lebih dulu, lalu:
docker compose up -d postgres mosquitto
docker compose ps                 # keduanya harus healthy/running

# 2. Environment
cp .env.example .env
copy packages\db\.env.example packages\db\.env

# 3. Database
npm install
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Empat terminal terpisah
npm run dev:api
npm run dev:gateway
npm run dev:simulator
npm run dev

# 5. .env.local di root
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Buka `http://localhost:3000`, login `kevin.santoso@gmail.com` / `password123`.

**Gerbang P0:** angka di dashboard bergerak sendiri karena simulator, bukan karena mock. Kalau belum, jangan lanjut ke P1 — semua verifikasi berikutnya bergantung pada ini.

Kalau ada yang gagal, baru serahkan ke Cursor:

```
You are working in the SATU ATAP monorepo.

REPO MAP
  root/                  Next.js 15 App Router PWA (the web app itself), src/
  apps/api               Fastify API, port 3001, Prisma client
  apps/iot-gateway       MQTT client, port 3100, forwards to API over internal HTTP
  apps/iot-simulator     fake ESP32, publishes MQTT only, never touches the DB
  packages/shared        capabilities, Zod schemas, MQTT topic helpers (zod is its only dep)
  packages/db            Prisma schema, migrations, seed
  infrastructure/mosquitto/mosquitto.conf
  docker-compose.yml     postgres, mosquitto, api, iot-gateway, iot-simulator

TASK
The full stack fails to come up on a Windows development machine. Diagnose and fix it. Below is
exactly what happens:

<TEMPEL OUTPUT ERROR APA ADANYA DI SINI — perintah yang dijalankan dan seluruh keluarannya>

RULES
- Diagnose before changing anything. State the root cause in one sentence before you touch a file.
- Fix the actual cause. Do not work around it by disabling a check, loosening a type, skipping a
  migration, or adding a try/catch that swallows the error.
- Do not change application behaviour, the database schema, or the MQTT contract while fixing setup.
- If the cause is environmental rather than code (missing Docker, port already bound, wrong Node
  version), say so plainly and give me the exact commands to run instead of editing files.

DONE WHEN
docker compose up -d postgres mosquitto, npm run db:migrate, npm run db:seed, and all four dev
processes start cleanly, and the dashboard shows live simulator values with
NEXT_PUBLIC_ENABLE_MOCK_DATA=false.
```

---

## P1 — MQTT contract v2

**Estimasi:** 1 hari · **Memblokir firmware**
**Commit:** `feat(mqtt): migrate to 5-channel contract with node availability`

```
You are working in the SATU ATAP monorepo, a Phase 1 building-IoT platform prototype.

REPO MAP
  root/src               Next.js 15 App Router PWA. MQTT must NEVER be imported here.
  apps/api               Fastify API :3001. Entry apps/api/src/index.ts -> app.ts -> routes.ts
                         Domain logic in ingest.ts (telemetry persistence) and automation.ts
  apps/iot-gateway       MQTT client :3100. Single file: src/index.ts
  apps/iot-simulator     Fake ESP32. Single file: src/index.ts
  packages/shared        src/{capabilities,schemas,mqtt,interfaces}.ts — zod is the ONLY dependency
  packages/db            prisma/schema.prisma, prisma/seed.ts
  Tests: vitest. Root `npm run test`, backend `npm run test:backend`

OBJECTIVE
Migrate the MQTT contract from the current 4 channels to the 5-channel structure the Phase 1
specification requires. This is a breaking contract change; apply it across every consumer in one
pass so the repo is never in a half-migrated state.

WHY THIS MATTERS
Two channels are missing today and both are needed by hardware that does not exist yet, which is
exactly why we change it now. `availability` (retained, backed by an MQTT Last Will) is how the
dashboard learns a node died without waiting for a timeout. `event` carries discrete occurrences
like motion, which are badly modelled as a boolean inside periodic telemetry.

CURRENT CONTRACT (packages/shared/src/mqtt.ts)
  satuatap/{homeId}/{deviceId}/{telemetry|status|cmd|ack}

TARGET CONTRACT
  home/{homeId}/device/{deviceId}/telemetry     QoS 1  retain false
  home/{homeId}/device/{deviceId}/state         QoS 1  retain TRUE
  home/{homeId}/device/{deviceId}/command       QoS 1  retain false
  home/{homeId}/device/{deviceId}/ack           QoS 1  retain false
  home/{homeId}/device/{deviceId}/event         QoS 1  retain false
  home/{homeId}/node/{nodeId}/availability      QoS 1  retain TRUE   (this is the LWT topic)

FILES IN SCOPE
  packages/shared/src/mqtt.ts
  packages/shared/src/schemas.ts
  packages/shared/src/index.ts
  apps/iot-gateway/src/index.ts
  apps/iot-simulator/src/index.ts
  apps/api/src/routes.ts
  apps/api/src/ingest.ts
  packages/db/prisma/schema.prisma  (one field + one migration)
  the corresponding *.test.ts files

REQUIREMENTS

1. packages/shared/src/mqtt.ts
   - Rewrite mqttTopic(homeId, deviceId, channel) for the device channels.
   - Add nodeAvailabilityTopic(homeId, nodeId).
   - Rewrite parseMqttTopic(topic) to return a discriminated union:
       { kind: "device", homeId, deviceId, channel } | { kind: "node", homeId, nodeId } | null
     It must return null — never throw — for malformed input, wrong prefix, wrong segment count, or
     an unknown channel. Malformed topics arrive from misconfigured devices in the field and must
     not be able to crash the gateway.
   - Export wildcards for all five device channels plus node availability.

2. packages/shared/src/schemas.ts
   - Keep telemetryPayloadSchema and its .strict() metrics object EXACTLY as it is. The
     { ts, metrics } envelope stays. Do not flatten it and do not add device_id or sensor_type to
     the body — the topic already carries identity, and one envelope means one ingest path for
     every sensor type.
   - Add statePayloadSchema, reusing the same metrics shape as telemetry.
   - Add eventPayloadSchema:
       { ts: ISO string, event: "MOTION_DETECTED"|"MOTION_CLEARED"|"BUTTON_PRESSED"|"SENSOR_ERROR",
         data?: Record<string, unknown> }
   - Add availabilityPayloadSchema:
       { status: "online"|"offline"|"unknown", firmware?: string, build?: number, ip?: string,
         mac?: string matching /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, rssi?: number }

3. apps/iot-gateway/src/index.ts
   - Subscribe to all five device wildcards plus the node availability wildcard.
   - Route each channel to its own handler; validate with the matching schema; drop and log at
     `warn` on validation failure, never crash.
   - `state` goes through the same ingest path as telemetry but flagged as a state update.
   - `event` posts to a new POST /internal/event.
   - `availability` posts to a new POST /internal/availability, carrying nodeId — NOT deviceId.
   - Set the gateway's own LWT on home/+/node/gateway/availability.

4. apps/api — new internal endpoints, both behind the existing x-internal-key guard
   - POST /internal/event  -> writes MotionEvent for MOTION_DETECTED / MOTION_CLEARED, publishes an
     SSE event, and feeds the automation evaluator.
   - POST /internal/availability -> receives nodeId. Resolve it to every Device with that nodeId and
     apply the status to all of them.
     IMPORTANT: emit exactly ONE DEVICE_OFFLINE alert per node transition, not one per device. A
     lighting node hosts four lights; four identical alerts for one unplugged board makes the alerts
     page useless.

5. packages/db/prisma/schema.prisma
   - Add `nodeId String?` to Device, plus @@index([nodeId]).
   - Generate a migration. Do NOT reset the database.

6. apps/iot-simulator/src/index.ts
   - Publish on the new topics.
   - Open THREE separate MQTT connections, one per simulated node (esp32-energy-001,
     esp32-water-env-001, esp32-lighting-001), each with its own LWT on its node availability topic.
     One connection can only carry one Last Will, so node-level offline behaviour is untestable
     without this.
   - Lights publish their state on the `state` channel with retain: true.
   - The PIR device publishes MOTION_DETECTED / MOTION_CLEARED on the `event` channel instead of a
     motion boolean inside telemetry.

7. Tests
   - packages/shared: round-trip every channel, plus malformed topics (wrong prefix, too few
     segments, too many segments, unknown channel, empty ids).
   - apps/iot-gateway: one contract test per channel, plus a rejected-payload case.
   - apps/api: node availability fans out to all its devices and raises exactly one alert.

DO NOT
- Do not touch anything under root/src (the Next.js UI) in this task.
- Do not touch src/services/* or src/data/mock.
- Do not import mqtt anywhere outside apps/iot-gateway and apps/iot-simulator.
- Do not add a dependency to packages/shared. Zod stays its only one.
- Do not rename device ids in this task; that happens in P3.

DEFINITION OF DONE
npm run typecheck && npm run lint && npm run test:backend && npm run build all pass, and with the
simulator running on the new topics the dashboard still shows live values with
NEXT_PUBLIC_ENABLE_MOCK_DATA=false.
```

**Verifikasi manual setelah P1:**
```
docker exec -it huni-mosquitto-1 mosquitto_sub -h localhost -t "home/#" -v
```
Harus terlihat lima channel berbeda dan payload availability yang retained.

---

## P2 — Perbaikan counter kumulatif (kWh dan liter)

**Estimasi:** 1 hari · **Wajib sebelum PZEM asli terpasang**
**Commit:** `fix(telemetry): treat cumulative counters as deltas`

```
You are working in the SATU ATAP monorepo (root = Next.js PWA; apps/api = Fastify + Prisma;
apps/iot-gateway = MQTT; packages/shared = zod schemas; packages/db = Prisma schema and seed).

Read apps/api/src/ingest.ts fully before changing anything.

OBJECTIVE
Fix a data-correctness bug in telemetry aggregation that silently produces wrong consumption
figures.

THE BUG
upsertHourlyAggregates() in apps/api/src/ingest.ts computes avg/min/max/sum/last for every numeric
metric identically. That is correct for instantaneous metrics — power, voltage, current, frequency,
temperature_c, humidity_pct, flow_lpm. It is wrong for cumulative counters.

PZEM-004T reports energy_kwh as a lifetime counter that only ever increases. YF-S201 volume_liters
behaves the same way. Summing 720 samples of a counter across one hour yields a number in the
thousands that means nothing, and every consumption and cost figure derived from it is wrong.

Worked example — a PZEM sending every 5 seconds for one hour:
    samples: 4.72, 4.72, 4.73, 4.73, ... , 4.78
    stored sum  = 4.72 + 4.72 + 4.73 + ... = about 3400     <- meaningless
    stored avg  = about 4.73                                <- meaningless
    real consumption for that hour = 4.78 - 4.72 = 0.06 kWh

The simulator hides this because its counter starts near zero and moves smoothly. A real PZEM
arrives from the factory with a counter already in the hundreds, so the error becomes obvious the
moment hardware is connected — on the first number the client looks at.

FILES IN SCOPE
  packages/shared/src/{schemas.ts,capabilities.ts,index.ts}
  apps/api/src/ingest.ts
  apps/api/src/routes.ts        (energy, water, and dashboard read paths)
  apps/iot-gateway/src/index.ts (boundary rejection only)
  packages/db/prisma/schema.prisma + one migration
  apps/api/src/*.test.ts

REQUIREMENTS

1. Classify metrics in packages/shared:
     export const COUNTER_METRICS = ["energy_kwh", "volume_liters"] as const;
     export const INSTANT_METRICS = [...everything else in the current NUMERIC_METRICS list];
     export function isCounterMetric(key: string): boolean;

2. In apps/api/src/ingest.ts, compute a per-device delta for every counter metric present, BEFORE
   aggregation:
   - Look up the previous raw counter value for (deviceId, metric) with a single indexed query. Do
     not scan the telemetry table.
   - delta = current - previous
   - previous is null (first reading ever)     -> delta = 0
   - delta < 0 (counter reset: module replaced, PZEM reset, firmware reflashed)
                                               -> delta = 0, log a structured warning carrying
                                                  deviceId, metric, previous, current
   - delta above a plausibility ceiling        -> delta = 0, log a structured warning
     Ceilings live in one exported constant map, not inline literals:
       energy_kwh: 5 per reading, volume_liters: 500 per reading
   - Write the result into metrics as `${metric}_delta`, and keep the raw counter unchanged.
     Both are stored.

3. A device must never be allowed to send a `_delta` key itself — those are derived server-side
   only. Reject such payloads at the gateway boundary in apps/iot-gateway, not in the schema, so
   the schema can still validate the enriched object after ingest adds them.

4. Aggregation rules in upsertHourlyAggregates:
   - Counter metrics: store ONLY first and last. Do not compute avg, min, max, or sum — they are
     meaningless for a monotonic counter.
   - Delta metrics: store sum and sampleCount. This is what every consumption figure reads from.
   - Instantaneous metrics: keep the existing avg/min/max/last behaviour. `max` remains the source
     for "peak".
   - Add `first Float?` to TelemetryAggregate. Generate a migration; do not reset the database.

5. Update every read path. Search apps/api/src/routes.ts for the energy, water, and dashboard
   handlers:
   - daily / weekly / monthly electricity consumption = SUM(energy_kwh_delta) over the range
   - electricity cost = that sum * UtilityConfig.electricityTariffPerKwh
   - water consumption  = SUM(volume_liters_delta); cost = (sum / 1000) * waterTariffPerM3
   - peak  = MAX(power) over the range
   - average = AVG(power) over the range
   Never persist a computed cost. Always derive it from the current tariff at read time, so
   changing the tariff immediately changes every displayed figure.

6. Tests in apps/api covering: normal increment, counter reset mid-stream, first reading ever,
   implausible jump, and an assertion that a day's consumption computed from deltas equals
   (last - first) of the raw counter when no reset occurred.

DO NOT
- Do not change the MQTT topic structure in this task.
- Do not change the UI in this task.
- Do not delete the raw counter values; both raw and derived are kept.

DEFINITION OF DONE
All four gate commands pass, and leaving the simulator running for one hour yields a "today" figure
within a few percent of (latest energy_kwh - earliest energy_kwh) for that window.
```

---

## P3 — Schema fields dan seed 12 device

**Estimasi:** 1 hari · **Memblokir firmware**
**Commit:** `feat(db): align schema and seed with Phase 1 hardware`

```
You are working in the SATU ATAP monorepo (root = Next.js PWA; apps/api; apps/iot-gateway;
apps/iot-simulator; packages/shared; packages/db with Prisma).

OBJECTIVE
Align the database and the seed with the actual Phase 1 hardware: 3 ESP32 nodes hosting 12 logical
devices. A node is a board; a device is a logical entity in the database. One board hosts several
devices, and keeping the two separate is what lets Phase 2 swap a PZEM for an industrial meter
without touching the dashboard.

FILES IN SCOPE
  packages/db/prisma/schema.prisma + migration
  packages/db/prisma/seed.ts
  packages/shared/src/schemas.ts
  apps/api/src/routes.ts        (one new endpoint)
  apps/iot-simulator/src/index.ts
  root/src/data/mock/index.ts
  any UI component rendering a brightness control for lights

REQUIREMENTS

1. schema.prisma — add to model Device:
     macAddress  String?
     buildNumber Int?
     config      Json?
   Add a new model:
     model Gateway {
       id        String    @id
       siteId    String
       site      Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
       name      String
       version   String?
       lastSeen  DateTime?
       createdAt DateTime  @default(now())
     }
   Generate a migration. Do NOT reset the database.

2. Device.config holds the values the specification requires to be configurable rather than
   compiled into firmware:
     water_meter  -> { "pulsesPerLiter": 450, "offsetLiters": 0 }
     energy_meter -> { "ctRatio": 1, "offsetKwh": 0 }
   Add one Zod schema per device type in packages/shared and validate on write. Expose
   PATCH /v1/homes/:homeId/devices/:deviceId/config — ADMIN only, audit-logged through the existing
   audit() helper.

3. Rewrite packages/db/prisma/seed.ts. Replace the current 8 generic devices with exactly these 12
   on home-1. All protocol mqtt, all carrying their nodeId:

   nodeId esp32-energy-001
     energy-main        energy_meter        room-1   voltage,current,power,energy,frequency,power_factor
     energy-ac          energy_meter        room-2   same

   nodeId esp32-water-env-001
     water-main         water_meter         room-3   flow,volume        config pulsesPerLiter 450
     water-kitchen      water_meter         room-3   flow,volume        config pulsesPerLiter 450
     env-living-room    environment_sensor  room-1   temperature,humidity
     env-bedroom        environment_sensor  room-2   temperature,humidity
     pir-living-room    motion_sensor       room-1   motion
     pir-bedroom        motion_sensor       room-2   motion

   nodeId esp32-lighting-001
     light-living-room  light               room-1   on_off             isOn false
     light-bedroom      light               room-2   on_off             isOn false
     light-kitchen      light               room-3   on_off             isOn false
     light-spare        light               room-3   on_off             isOn false

4. CRITICAL — lights get the on_off capability ONLY. Remove `brightness` entirely: from the seed,
   from DEFAULT_CAPABILITIES for the light type, from the simulator, from mock data, and from any UI
   component that renders a brightness slider.
   The Phase 1 hardware is a mechanical 4-channel relay. It cannot dim. A brightness control the
   hardware can never honour is exactly the failure mode the specification forbids: software
   implying a physical state it cannot achieve. Remove the control, do not merely hide it.

5. Seed one Gateway row: id "gw-pi-001", name "Raspberry Pi — Rumah Kevin", siteId "site-1".

6. Keep user kevin.santoso@gmail.com / password123 and home-1 working — existing vitest auth tests
   depend on both. Keep home-2 as it is. Keep seed ids stable and idempotent (upsert, not create),
   so re-seeding never breaks an existing database.

7. Replace the seeded automation rule with the two rules the specification uses as its examples, so
   they exist as reference data:
   - "Lampu ruang tamu saat ada gerakan": trigger MOTION_DETECTED on pir-living-room,
     condition TIME_RANGE 18:00-23:00, action TURN_ON light-living-room
   - "Matikan lampu jika sepi": trigger NO_MOTION_FOR 10 minutes on pir-living-room,
     action TURN_OFF light-living-room
   NO_MOTION_FOR is implemented later in P5. For now the evaluator must ignore an unknown trigger
   type and return no match — it must not throw, and it must not disable the rule.

8. Update apps/iot-simulator to publish as these 12 device ids across its 3 node connections.

9. Update root/src/data/mock/index.ts so mock mode shows the same 12 devices with the same ids,
   names, and rooms. The UI must look identical whether mock mode is on or off — a reviewer running
   npm run dev with no Docker should still see a complete, believable dashboard.

DO NOT
- Do not change the MQTT topic structure in this task.
- Do not reset or drop the database.
- Do not leave a brightness control anywhere in the UI.

DEFINITION OF DONE
npm run db:migrate && npm run db:seed succeeds on a fresh database and on an existing one, all four
gate commands pass, and the devices page shows 12 devices grouped correctly in both mock and API
mode.
```

---

## P4 — MQTT authentication, ACL, rate limiting

**Estimasi:** 1 hari · **Memblokir firmware** (device butuh kredensialnya)
**Commit:** `feat(security): mqtt auth, per-device ACL, api rate limiting`

```
You are working in the SATU ATAP monorepo (root = Next.js PWA; apps/api = Fastify; apps/iot-gateway;
apps/iot-simulator; packages/db = Prisma; infrastructure/mosquitto/mosquitto.conf).

OBJECTIVE
Close the two open security items in the Phase 1 specification. MQTT is currently anonymous
(allow_anonymous true) and the HTTP API has no rate limiting.

CONTEXT YOU ALREADY HAVE
packages/db/prisma/schema.prisma already contains a DeviceCredential model with mqttUsername,
mqttPasswordHash, and deviceSecretHash. It is seeded but never used. Use it rather than inventing a
parallel credential store.

FILES IN SCOPE
  infrastructure/mosquitto/mosquitto.conf
  scripts/mqtt-users.ts                    (new)
  packages/db/prisma/seed.ts
  apps/api/src/app.ts
  apps/iot-gateway/src/index.ts
  apps/iot-simulator/src/index.ts
  docker-compose.yml
  package.json                             (one new script)
  .env.example
  .gitignore

REQUIREMENTS

1. mosquitto.conf
   - allow_anonymous false
   - password_file and acl_file pointing at mounted paths
   - keep listener 1883, but bind to the LAN interface rather than 0.0.0.0
   - mount the generated files read-only in docker-compose.yml

2. New script scripts/mqtt-users.ts, exposed as root npm script "mqtt:users".
   It reads DeviceCredential rows from the database and writes into
   infrastructure/mosquitto/generated/ (gitignored):
   - a password file in mosquitto_passwd-compatible format
   - an ACL file

   ACL policy per device username:
     write   home/{homeId}/device/{deviceId}/telemetry
     write   home/{homeId}/device/{deviceId}/state
     write   home/{homeId}/device/{deviceId}/ack
     write   home/{homeId}/device/{deviceId}/event
     write   home/{homeId}/node/{nodeId}/availability
     read    home/{homeId}/device/{deviceId}/command

   A device must not be able to read another device's topics, and must not be able to write to any
   command topic. A compromised sensor must not be able to switch the lights.

   The gateway account gets read on all wildcards and write on command topics only.

3. Seed: generate a distinct random password per device, print each one ONCE to stdout during seed,
   and store only the bcrypt hash. Never log a password again anywhere.

4. Gateway and simulator must authenticate using MQTT_USERNAME and MQTT_PASSWORD from env.
   Distinguish an authentication rejection from a network drop: a network drop retries with
   backoff, an auth rejection fails fast with a clear message and does not retry forever. Silently
   reconnecting against a broker that will never accept you is how a device looks "almost working"
   for hours.

5. Rate limiting on apps/api with @fastify/rate-limit:
     /v1/auth/*      10 requests per minute per IP
     /v1/*           300 per minute per authenticated user
     /internal/*     5000 per minute keyed by the internal key (the gateway batches through here)
   Return 429 with a body matching the existing error shape used elsewhere in routes.ts.

6. Tests
   - a unit test asserting the generated ACL denies cross-device writes and denies command writes
   - an API test asserting /v1/auth/login returns 429 after the limit is exceeded

DO NOT
- Do not expose MQTT to the public internet and do not add a websocket listener.
- Do not put any MQTT credential behind a NEXT_PUBLIC_ prefix. Nothing here may reach the browser.
- Do not commit the generated password or ACL files.

DEFINITION OF DONE
The stack runs end to end with allow_anonymous false. An unauthenticated mosquitto_pub is rejected.
A device credential cannot publish to another device's topic, and cannot publish to any command
topic. All four gate commands pass.
```

> **Setelah P4 selesai, firmware ESP32 aman ditulis.** P5–P8 boleh berjalan paralel dengan perakitan hardware.

---

## P5 — Ekstrak automation engine ke shared

**Estimasi:** 1 hari · Prasyarat P6
**Commit:** `refactor(automation): extract pure rule engine into shared`

```
You are working in the SATU ATAP monorepo. This is a refactor with no behaviour change, plus two new
trigger types. Correctness matters far more than speed here — this engine will soon run in two
places at once.

CONTEXT
apps/api/src/automation.ts currently mixes two very different things:
  - pure rule evaluation: triggerMatches, conditionsPass, inTimeRange, minutesNowJakarta
  - side effects: createCommand (Prisma writes, audit log, SSE publish, gateway HTTP call) and
    evaluateAutomations (loads rules from Prisma, records AutomationExecution)

The pure half must run both in the cloud API and on the edge gateway, from one implementation. Two
copies of rule logic that drift apart is a bug class you will never find.

FILES IN SCOPE
  packages/shared/src/automation.ts   (new)
  packages/shared/src/index.ts
  apps/api/src/automation.ts
  apps/api/src/ingest.ts
  test files moved from apps/api into packages/shared

REQUIREMENTS

1. Create packages/shared/src/automation.ts containing ONLY pure functions. No Prisma import, no
   fetch, no ambient clock read:
     types: Trigger, Condition, Action, AutomationRule, AutomationEvent, EvaluationContext
     inTimeRange(from, to, nowMinutes)
     conditionsPass(conditions, ctx)
     triggerMatches(trigger, event, ctx)
     evaluateRules(rules, event, ctx): returns a PLAN — Array<{ ruleId, actions, dedupeKey }> —
       and never performs the actions itself

   EvaluationContext carries every injected value: nowMinutes, timezone, and a lastMotionAt lookup
   map keyed by deviceId. Time and state must be arguments, never read from the environment, so
   both hosts and the tests can control them exactly.

2. Add the two trigger types the specification needs but the code does not handle today:
   - TIME: { type: "TIME", at: "HH:MM", days?: number[] }
     Matches when a scheduler tick lands on that minute. Evaluation stays pure; the ticking belongs
     to the host process.
   - NO_MOTION_FOR: { type: "NO_MOTION_FOR", deviceId, minutes }
     Matches when ctx.lastMotionAt for that device is older than `minutes`.
     It must not re-fire every tick while the room stays empty. Return a stable dedupeKey per rule
     per idle window so the host can suppress repeats.

3. Unknown trigger types return no match. They must not throw and must not disable the rule — a
   rule written by a newer version of the cloud may reach an older edge agent.

4. Move the existing tests from apps/api into packages/shared and extend them:
   - Asia/Jakarta handling (no DST, so assert the fixed offset explicitly)
   - a time range wrapping past midnight, e.g. 22:00-06:00
   - an empty conditions array passes
   - an unknown trigger type returns no match rather than throwing
   - NO_MOTION_FOR does not re-fire within the same idle window
   - TIME matches on the exact minute and not the minute before or after

5. Rewrite apps/api/src/automation.ts to import from @satu-atap/shared and keep only the
   side-effecting layer: load rules from Prisma, build the context, call evaluateRules, then
   createCommand and write AutomationExecution rows.

6. Behaviour parity: the seeded motion rule must execute exactly as it does today.

DO NOT
- Do not add any dependency to packages/shared. Zod remains its only one. No Prisma, no node:fs,
  no fetch, no date library.
- Do not change the database schema in this task.
- Do not change the MQTT contract in this task.

DEFINITION OF DONE
npm run test:backend passes with the moved and extended tests, apps/api behaves identically to
before, and packages/shared/src/automation.ts contains zero side effects.
```

---

## P6 — Edge agent: mode offline

**Estimasi:** 4 hari · Tugas terbesar di Phase 1
**Commit:** `feat(edge): offline-capable edge agent with outbox and local api`

```
You are working in the SATU ATAP monorepo. This task converts apps/iot-gateway from a thin
MQTT-to-HTTP forwarder into an edge agent that runs on a Raspberry Pi and keeps the house working
when the internet is down.

WHY
Two Phase 1 acceptance criteria currently fail:
  "Internet outage does not break local control"
  "Do not lose sensor readings because of temporary internet failure"
Today the automation engine runs in the cloud API, so an outage stops all rules; and the gateway
posts telemetry fire-and-forget, so a failed POST is logged and the reading is gone forever.

TARGET BEHAVIOUR
  ONLINE    ESP32 -> Mosquitto -> edge agent -> SQLite (pending) -> sync worker -> cloud -> synced
  OFFLINE   ESP32 -> Mosquitto -> edge agent -> SQLite (pending, accumulating)
                                              -> automation still evaluates from cached rules
                                              -> local HTTP API still serves reads and commands
  RECOVERY  sync worker drains the backlog in batches; the cloud upserts idempotently; no duplicates

FILES IN SCOPE
  apps/iot-gateway/**                       (the agent itself, restructured into modules)
  apps/api/src/routes.ts                    (new internal batch and rule-sync endpoints)
  packages/db/prisma/schema.prisma          (one unique constraint + migration)
  root/src/lib/config.ts
  root/src/services/http.ts
  root/src/components/layout/AppShell.tsx   (degraded-mode indicator)
  docker-compose.edge.yml                   (new)
  docs/deployment/                          (new)

REQUIREMENTS

1. Local store — SQLite via better-sqlite3, WAL mode, path from EDGE_DB_PATH.
   Tables:
     outbox(id, kind, payload JSON, created_at, attempts, next_attempt_at, synced_at)
       kind: telemetry | state | event | availability | ack | automation_execution | alert
     rule_cache(rule_id, home_id, payload JSON, updated_at)
     device_state(device_id, home_id, metrics JSON, updated_at)
     last_motion(device_id, occurred_at)
     meta(key, value)                       -- holds the rule sync cursor
   Index outbox on (synced_at, next_attempt_at).

2. Ingest path. Every validated MQTT message is written to SQLite FIRST, then acted on. Nothing goes
   straight to the cloud. Writes are synchronous and transactional. The only loss window we accept is
   a crash between MQTT receipt and disk write, and it must stay that narrow.

3. Automation on the edge. Import evaluateRules from @satu-atap/shared (built in P5). Build the
   context from SQLite: last_motion, device_state, current time in Asia/Jakarta. On a match, create
   the command locally, publish it to MQTT immediately, and enqueue an outbox row so the cloud learns
   about it later.
   Local command ids must be prefixed "edge-" and be deterministic, so the cloud can reconcile them
   idempotently instead of creating duplicates on every retry.

4. Scheduler tick. Every 60 seconds, aligned to the minute boundary. Feeds a TIME event into
   evaluateRules so lighting schedules work with no internet, and drives NO_MOTION_FOR evaluation.
   Suppress repeats using the dedupeKey returned by the shared layer.

5. Rule sync. Every 30 seconds, GET /internal/automations?since=<cursor> from the cloud and upsert
   into rule_cache. Add that endpoint to apps/api. On failure keep serving the existing cache and log
   at `warn`, not `error` — a cloud outage is an expected state on this system, not an incident, and
   logging it as one buries the real incidents.

6. Sync worker.
   - Drain outbox in batches of 500 ordered by created_at ASC.
   - POST to new cloud endpoints: /internal/telemetry/batch, /internal/events/batch,
     /internal/commands/reconcile.
   - Exponential backoff per row: 1s, 2s, 4s ... capped at 60s, with jitter.
   - On 2xx set synced_at. On 4xx the payload is permanently unacceptable: set synced_at, log at
     error with the payload, and stop retrying. Retrying forever against a 400 blocks the whole queue
     behind one bad row.
   - Delete rows whose synced_at is older than 7 days. Never delete pending rows.

7. Cloud-side idempotency. /internal/telemetry/batch must upsert on (deviceId, recordedAt). Add that
   unique constraint via migration.
   This is the single most important line in the task: without it, a retried batch after a partial
   failure double-counts, and every consumption and cost figure inflates silently.

8. Local HTTP API on the edge, port 3100, so the dashboard survives an outage:
     GET  /local/homes/:homeId/dashboard    served from device_state and local aggregates
     GET  /local/homes/:homeId/devices
     POST /local/homes/:homeId/devices/:deviceId/commands
     GET  /local/health                     mqtt, sqlite, cloud reachability, backlog depth
   Authenticate with a shared local token (EDGE_LOCAL_TOKEN), not the cloud JWT — the cloud may be
   unreachable exactly when this endpoint is needed most.

9. Frontend fallback.
   - Add NEXT_PUBLIC_EDGE_URL to root/src/lib/config.ts.
   - In root/src/services/http.ts, if a cloud request fails or exceeds a 2 second timeout, retry once
     against the edge base URL and mark the response as degraded.
   - Show a small persistent "Mode lokal" indicator in AppShell whenever the degraded path is in use.
     Never fail over silently — a user who cannot tell which backend answered cannot trust either.

10. Deployment.
    - docker-compose.edge.yml for the Raspberry Pi: mosquitto, iot-gateway, web. All
      restart: unless-stopped, all built for linux/arm64.
    - docs/deployment/raspberry-pi.md covering static IP, the satuatap.local mDNS hostname,
      first-boot setup, and how to verify each service.

11. Tests
    - Outage survival: 100 readings arrive while the cloud is down; all 100 are pending; the cloud
      returns; all 100 sync exactly once.
    - Automation fires from rule_cache with the cloud unreachable.
    - Idempotent replay: posting the same batch twice yields one row and one unchanged consumption
      figure.
    - Backoff: a row that fails does not block later rows indefinitely.

DO NOT
- The edge agent must never import Prisma or connect to PostgreSQL directly.
- EDGE_LOCAL_TOKEN is server-side only. If the browser needs edge access, proxy it through a Next.js
  route handler.
- Do not import mqtt anywhere under root/src.
- Keep memory use modest; this runs alongside Mosquitto and Next.js on a single board.

DEFINITION OF DONE
With the API container stopped: the simulator keeps feeding data, automation rules keep executing,
the dashboard still loads and can toggle a light through the edge, and the "Mode lokal" indicator is
visible. When the API returns, every buffered reading appears in PostgreSQL exactly once.
```

---

## P7 — Alert threshold dan rollup

**Estimasi:** 2 hari · Butuh P2 dan P6
**Commit:** `feat(analytics): configurable thresholds and period rollups`

```
You are working in the SATU ATAP monorepo (apps/api = Fastify + Prisma; apps/iot-gateway = edge
agent with SQLite; packages/db = Prisma schema).

OBJECTIVE
Complete the analytics and alerting the Phase 1 acceptance criteria require.

FILES IN SCOPE
  packages/db/prisma/schema.prisma + migration
  packages/db/prisma/seed.ts
  apps/api/src/routes.ts
  apps/api/src/rollup.ts          (new)
  apps/iot-gateway/**             (threshold evaluation on the edge)
  test files

REQUIREMENTS

1. Configurable thresholds. Add to schema.prisma:
     model AlertThreshold {
       id         String        @id @default(cuid())
       homeId     String
       home       Home          @relation(fields: [homeId], references: [id], onDelete: Cascade)
       type       AlertType
       metric     String
       op         String        // "gt" | "lt"
       value      Float
       forSeconds Int           @default(0)   // must hold this long before firing
       severity   AlertSeverity
       enabled    Boolean       @default(true)
       @@unique([homeId, type, metric])
     }
   Seed defaults:
     power    gt 3000                    -> HIGH_ELECTRICITY, warning
     flow_lpm gt 15 for 600 seconds      -> POSSIBLE_LEAK, critical
     device offline for 300 seconds      -> DEVICE_OFFLINE, warning
   Full CRUD under /v1/homes/:homeId/alert-thresholds, ADMIN only, audit-logged.

2. Threshold evaluation runs on the EDGE agent, not the cloud, so alerts still fire during an
   outage. Alerts go into the outbox like every other record.
   Implement hysteresis: an alert must not re-fire while one is still open for the same threshold,
   and it auto-resolves once the metric stays back within bounds for forSeconds.
   Without hysteresis a fluctuating sensor produces hundreds of alerts an hour and the alerts page
   becomes something people learn to ignore, which is worse than having no alerts.

3. Abnormal water detection, as the specification requires:
   - continuous flow above threshold for longer than forSeconds -> POSSIBLE_LEAK
   - daily consumption above 200% of the trailing 7-day MEDIAN for that device -> ABNORMAL_WATER
     Use the median, not the mean. One burst day should not quietly raise the bar for the next week.

4. Rollup job in apps/api (new file rollup.ts, scheduled from app.ts). Builds day, week, and month
   rows in TelemetryAggregate from the hourly rows:
   - counter delta metrics: sum
   - instantaneous metrics: avg, min, max; max is recorded as the period peak
   - runs hourly, and recomputes BOTH the current period and the previous one
     This is required, not defensive: an edge backlog means yesterday's readings can arrive today,
     and a rollup that only ever computes forward would leave them permanently uncounted.
   - fully idempotent; rerunning must not change results

5. Extend /v1/homes/:homeId/energy and /water to accept period=day|week|month and return
   consumption, cost, peak, average, and a series suitable for charting.
   Cost always reads the current UtilityConfig at request time. Never store a computed cost.

6. POST /v1/homes/:homeId/alerts/:alertId/ack sets status, acknowledgedById, acknowledgedAt, and
   writes an audit log entry.

7. Tests: hysteresis does not double-fire; median detection ignores a single spike day; the rollup is
   idempotent across reruns; a late-arriving reading correctly updates an already-computed day.

DO NOT
- Do not hardcode any tariff or threshold value in application code.
- Do not change the MQTT contract.

DEFINITION OF DONE
Thresholds are editable through the API; a simulated over-limit reading raises exactly one alert; it
resolves by itself once the metric returns to normal; and daily, weekly, and monthly figures agree
with the underlying hourly rows.
```

---

## P8 — Kelengkapan dashboard

**Estimasi:** 4 hari · Butuh P7
**Commit:** `feat(ui): environment, alerts, devices and system pages`

```
You are working in the SATU ATAP monorepo. The Next.js 15 App Router PWA lives at the repository
root under src/. This task completes the dashboard pages the Phase 1 specification requires.

CURRENT STATE
  Existing pages under src/app/(main)/: dashboard (page.tsx), devices, rooms, energy, water,
  automations, ai, services, payments, notifications, profile, settings, homes, and others.
  Charts use a hand-rolled src/components/charts/BarChart.tsx.
  The API already exposes SSE at GET /v1/homes/:homeId/events, but the UI polls every 15 seconds
  instead of subscribing.
  Services follow a dual-mode pattern in src/services/* — mock or API, chosen by
  NEXT_PUBLIC_ENABLE_MOCK_DATA.

FILES IN SCOPE
  src/app/(main)/environment/page.tsx      (new)
  src/app/(main)/alerts/page.tsx           (new)
  src/app/(main)/system/page.tsx           (new)
  src/app/(main)/devices/page.tsx          (rework)
  src/app/(main)/energy/page.tsx, water/page.tsx
  src/components/charts/**
  src/hooks/useHomeEvents.ts               (new)
  src/services/*, src/data/mock/index.ts
  src/lib/nav.ts

REQUIREMENTS

1. Install Recharts and replace the custom BarChart with a small chart module under
   src/components/charts/ exposing consistent Line, Bar, and Area components that read the app's
   existing Tailwind theme tokens. Charts must be legible in both light and dark mode and must size
   to their container rather than a fixed pixel width.

2. New page /environment
   - Current temperature and humidity per room from env-living-room and env-bedroom
   - Historical chart with a day / week / month range selector
   - Daily min, max, and average per room
   - Motion panel: last detected time per PIR plus a 24-hour activity strip

3. New page /alerts
   - Open alerts first, grouped by severity, then acknowledged, then resolved
   - Each row shows severity chip, title, message, device, room, and timestamp
   - Acknowledge action wired to the ack endpoint, optimistic with rollback on failure
   - A threshold settings section, visible to ADMIN only

4. Rework /devices into real device management
   - Online/offline state, last seen as relative time, firmware version, build number, IP, MAC,
     room, device type, and the node it belongs to
   - Group devices BY NODE. A node going offline takes all its devices with it, so grouping by node
     is what makes the failure legible at a glance.
   - Per-device detail drawer with recent telemetry and the calibration config from P3

5. New page /system — the health dashboard from the specification
   - Status rows for Raspberry Pi, MQTT broker, database, cloud API, and each ESP32 node
   - Outbox backlog depth and last successful sync time, read from the edge /local/health endpoint
   - A prominent banner whenever the app is running in local fallback mode

6. Replace polling with SSE
   - A useHomeEvents(homeId) hook wrapping EventSource against /v1/homes/:homeId/events
   - Reconnect with backoff on drop; fall back to the existing polling only after EventSource fails
     twice
   - Device state, alerts, and dashboard figures update live from the stream
   - Close the connection on unmount. A leaked EventSource per route change will exhaust the
     browser's connection limit within a few minutes of navigation.

7. Extend /energy and /water with the period selector, peak, average, and cost figures from P7.

8. Every new page must work in BOTH mock and API mode, following the existing dual-service pattern.
   Add mock fixtures for anything new.

9. Add the new pages to src/lib/nav.ts so they appear in the sidebar and bottom navigation.

DO NOT
- Do not import mqtt into any file under src/.
- Do not restyle the app; keep the existing visual language, spacing, and component primitives.
- Do not use localStorage for anything that must survive; session handling stays exactly as it is.
- Mobile first — every page must be usable one-handed. This is a PWA.

DEFINITION OF DONE
Every page listed in the specification exists with real content, charts render correctly in both
themes, a device status change appears within two seconds of unplugging a node, and
npm run build passes.
```

---

## Setelah P8

Sisa deliverable spec §25 — wiring documentation, installation guide, test cases, UAT checklist, dan completion report — sebaiknya ditulis manual, bukan lewat prompt. Dokumen serah terima yang di-generate biasanya ketahuan kosong isinya begitu klien membacanya, dan itu justru merusak kepercayaan yang dibangun oleh sistem yang jalan.

Firmware ESP32 (spec §20 dan §21) tidak ada di daftar ini karena dikerjakan berbarengan dengan perakitan hardware, bukan diserahkan ke Cursor sebagai satu blok besar.
