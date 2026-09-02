# Lighting + actuator node — `esp32-lighting-001`

The first **command-consuming** node. One ESP32 drives relay channels for six
on/off devices and reports their state back. Same node it runs on the second
building as `esp32-lighting-002`.

| Device | Relay pin | Meaning |
| ------ | --------- | ------- |
| `light-living-room` | GPIO23 | lamp |
| `light-bedroom` | GPIO22 | lamp |
| `light-kitchen` | GPIO21 | lamp |
| `light-spare` | GPIO19 | lamp |
| `lock-front` | GPIO18 | **solenoid door lock** |
| `valve-main` | GPIO17 | **solenoid water valve** |

Sketch: [`esp32-lighting-001/esp32-lighting-001.ino`](esp32-lighting-001/esp32-lighting-001.ino).

## Contract

```
SUBSCRIBE home/home-1/device/<id>/command  {commandId, type: TURN_ON | TURN_OFF}
PUBLISH   home/home-1/device/<id>/ack       {commandId, status, error}
PUBLISH   home/home-1/device/<id>/state     {ts, metrics:{on}}   (retained)
PUBLISH   home/home-1/node/<node>/availability                   (retained + LWT)
```

The dashboard/automation engine sends `TURN_ON`/`TURN_OFF`; the node drives the
relay, acks, and publishes retained state so the UI reflects reality after any
reconnect. Authenticates once as the node (password in `arduino_secrets.h`).

## Actuator safety — read before wiring the lock and valve

These are the parts that touch physical security and water, so the defaults are
chosen to **fail safe**:

- **Boot = safe state.** Every relay is initialised OFF (de-energized) before
  anything connects. `on` means *energized*.
- **Door lock is fail-secure:** relay OFF ⇒ **locked**. Power loss, a crash, or
  WiFi/broker down leaves the door locked, never wide open. `TURN_ON` energizes
  the solenoid to **unlock**.
- **Water valve is fail-closed:** relay OFF ⇒ **closed**. `TURN_ON` opens it.
  Pair with a leak automation (YF-S201 flow spike ⇒ TURN_OFF) so a burst pipe
  self-shuts.
- **Unlock must not depend on the cloud.** In production the unlock rule should
  run on the edge (Raspberry Pi gateway) so it works during an internet outage —
  the same offline path the rest of the stack already uses.
- **Solenoids are inductive.** Use a relay module + a **separate 12V supply** +
  a **flyback diode** across each solenoid. Never drive a solenoid from a GPIO.

Relay modules are usually **active-low** (`RELAY_ACTIVE_LOW = true` in the
sketch); flip it if yours is active-high.

## Flash

1. Library Manager: **PubSubClient** (Nick O'Leary). Board: ESP32 Dev Module.
2. Copy `arduino_secrets.h.example` → `arduino_secrets.h` and fill `SECRET_*`
   (node password key `esp32-lighting-001` from `.secrets`).
3. Wire a 6- or 8-channel relay board to the pins above (lock/valve on their own
   12V rail per the safety notes). Simulator off for these devices.
4. Upload, Serial @115200: expect `[mqtt] ... OK` and `subscribe 6 command topic`.
   Toggle a light from the dashboard and watch `[cmd] ... -> ON/OFF`; verify the
   device flips Online + on/off in the UI.
