# Water + environment node — `esp32-water-env-001`

One ESP32 hosts **six** logical devices across three low-voltage sensor types
(no mains on this board). Replaces the six simulated devices.

| Sensor | Devices | Channel | Payload |
| ------ | ------- | ------- | ------- |
| YF-S201 flow ×2 | `water-main`, `water-kitchen` | `telemetry` | `{flow_lpm, volume_liters}` |
| DHT22 ×2 | `env-living-room`, `env-bedroom` | `telemetry` | `{temperature_c, humidity_pct}` |
| HC-SR501 PIR ×2 | `pir-living-room`, `pir-bedroom` | `event` | `MOTION_DETECTED` / `MOTION_CLEARED` |

Sketch: [`esp32-water-env-001/esp32-water-env-001.ino`](esp32-water-env-001/esp32-water-env-001.ino).

## Authentication — per node

Same model as the energy node: authenticate once as the node
(`esp32-water-env-001`), password from `.secrets/mqtt-dev-passwords.json` (key
`"esp32-water-env-001"`, rotated on every reseed). The node ACL covers exactly
these six devices' telemetry/event topics.

## Wiring (all low-voltage — safe to breadboard)

```
DHT22 #1 (env-living)     DATA -> GPIO4    VCC 3V3   GND    + 10k pull-up DATA->3V3
DHT22 #2 (env-bedroom)    DATA -> GPIO16   VCC 3V3   GND    + 10k pull-up
YF-S201 #1 (water-main)    OUT -> GPIO25   VCC 5V    GND
YF-S201 #2 (water-kitchen) OUT -> GPIO26   VCC 5V    GND
HC-SR501 #1 (pir-living)   OUT -> GPIO32   VCC 5V    GND
HC-SR501 #2 (pir-bedroom)  OUT -> GPIO33   VCC 5V    GND
```

Pins avoid the ESP32 strapping/flash pins. PIR `OUT` is 3V3 — safe straight to a
GPIO. YF-S201 `OUT` is ~3V3 on 5V modules with the internal pull-up; if yours
swings to a full 5V, add a divider on the flow `OUT` line.

## Build it up easy-first (recommended)

You don't need all six sensors at once — telemetry for whatever is connected
just starts flowing; the rest logs `TIDAK MERESPONS` (harmless). Suggested order:

1. **DHT22 + PIR first** — 3 wires each, safe, instant. Watch `[env]` and
   `[gerak]` lines appear.
2. **YF-S201 next** — needs to sit inline on a water pipe; blow through it or run
   water and watch `flow_lpm` move.

`volume_liters` is cumulative and resets to 0 on reboot — the cloud ingest treats
it as a counter and tolerates the reset, so totals stay correct.

## Flash

1. Library Manager: **PubSubClient** (Nick O'Leary) + **DHT sensor library**
   (Adafruit) — accept the **Adafruit Unified Sensor** dependency. Board: ESP32
   Dev Module.
2. Copy `arduino_secrets.h.example` → `arduino_secrets.h` (gitignored) and fill it:
   `SECRET_WIFI_*`, `SECRET_MQTT_HOST` (laptop/Pi LAN IP), and `SECRET_MQTT_PASSWORD`
   (node password from `.secrets`, key `esp32-water-env-001`).
3. Stack up (`setup.bat`), simulator **off** for these six devices.
4. Upload, Serial Monitor @115200: expect `[mqtt] ... OK`, then `[env]`, `[gerak]`,
   `[air]` lines as each sensor comes online. Verify on `/environment`, `/devices`,
   and the alerts/motion views.
