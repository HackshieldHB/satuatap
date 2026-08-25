# MQTT

Broker (local Docker): `mqtt://127.0.0.1:1883` bound to localhost only.

Topics:

```text
satuatap/{homeId}/{deviceId}/telemetry
satuatap/{homeId}/{deviceId}/status
satuatap/{homeId}/{deviceId}/cmd
satuatap/{homeId}/{deviceId}/ack
```

## Telemetry payload

```json
{
  "ts": "2026-08-25T05:00:00.000Z",
  "metrics": {
    "voltage": 220.4,
    "current": 2.13,
    "power": 469.4,
    "energy_kwh": 4.72
  }
}
```

Unknown metric keys are **rejected**.

## Status

```json
{ "status": "online", "firmware": "1.0.0", "rssi": -55 }
```

Gateway registers MQTT LWT on `satuatap/gateway/status`.

## Command (cloud → device)

```json
{
  "commandId": "clxxx",
  "type": "TURN_ON",
  "params": {},
  "idempotencyKey": "..."
}
```

## ACK (device → cloud)

```json
{ "commandId": "clxxx", "status": "SUCCEEDED", "error": null }
```

The browser never receives MQTT credentials. Use the HTTP API / SSE instead.
