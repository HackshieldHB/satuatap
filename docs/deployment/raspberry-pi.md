# Raspberry Pi — SATU ATAP edge

Phase 1 runs Mosquitto, the edge agent (`iot-gateway`), and the Next.js PWA on a
single Raspberry Pi (linux/arm64). The house keeps working when the internet is
down: ESP32 boards talk to the local broker, the agent evaluates rules from
SQLite, and the dashboard falls back to `/local/*`.

## Hardware

- Raspberry Pi 4 (2 GB+) or Pi 5, 64-bit Raspberry Pi OS
- Static Ethernet or reserved DHCP lease
- Docker Engine + Compose plugin

## First boot

1. Flash Raspberry Pi OS Lite (64-bit). Enable SSH and set a user.
2. Give the Pi a static IP on the LAN (router reservation is enough), e.g. `192.168.1.10`.
3. Install Docker:

   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker "$USER"
   ```

4. Clone the repo and copy environment files:

   ```bash
   cd /opt
   sudo git clone <repo> satuatap && cd satuatap
   cp .env.example .env
   ```

5. Generate Mosquitto users after the cloud seed (or copy `infrastructure/mosquitto/generated`
   plus `.secrets/mqtt-dev-passwords.json` from a machine that already ran `npm run db:seed`
   and `npm run mqtt:users`).

6. Start the edge stack:

   ```bash
   docker compose -f docker-compose.edge.yml up -d --build
   ```

## mDNS hostname

Install Avahi so phones can open `http://satuatap.local`:

```bash
sudo apt-get update
sudo apt-get install -y avahi-daemon
sudo hostnamectl set-hostname satuatap
```

Confirm: `ping satuatap.local` from another machine on the LAN.

## Verify each service

```bash
docker compose -f docker-compose.edge.yml ps
curl -s http://127.0.0.1:3100/health
curl -s -H "x-edge-token: $EDGE_LOCAL_TOKEN" http://127.0.0.1:3100/local/health
mosquitto_sub -h 127.0.0.1 -u gateway -P "$MQTT_PASSWORD" -t "home/#" -C 3
```

- Mosquitto: ESP32 nodes stay connected (`home/+/node/+/availability` retained `online`).
- Edge agent: `/local/health` reports `sqlite: up` and a backlog of `0` when the cloud is reachable.
- Web: open `http://satuatap.local`. If the cloud API is stopped, the dashboard still loads and
  shows **Mode lokal**; toggling a light publishes a command on MQTT immediately.

## Notes

- Host MQTT on the LAN so ESP32 firmware can reach it; do not publish the broker to the internet.
- `EDGE_LOCAL_TOKEN` stays server-side. The browser talks to `/api/edge`, which the Next.js
  container proxies to the agent.
- SQLite lives in the `edge_db` volume. Do not delete pending outbox rows.
