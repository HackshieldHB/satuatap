# Node `esp32-tank-001` — Level Tandon (HC-SR04)

Capability **baru**: `tank_level`. Satu board ESP32 + satu HC-SR04 mengukur level
tandon dan mem-publish `{level_pct, distance_cm}` ke device logis `tank-rooftop`.
Payload identik dengan `apps/iot-simulator` (node `esp32-tank-001`), jadi board
ini menggantikan simulator untuk device itu — tanpa perubahan backend.

## Cara kerja

HC-SR04 dipasang di tutup tandon menghadap ke bawah. Ia mengukur **jarak** ke
permukaan air. Makin penuh → air makin dekat → jarak makin kecil. Firmware
mengubah jarak menjadi persen dari dua angka kalibrasi:

| Kalibrasi | Arti | Default (diorama) |
|---|---|---|
| `FULL_DISTANCE_CM` | jarak sensor→air saat tandon **penuh** | `4` cm |
| `TANK_HEIGHT_CM` | tinggi kolom air berguna (penuh→kosong) | `30` cm |

`level_pct = (FULL+TINGGI − jarak) / TINGGI × 100`, di-clamp 0–100. Angka ini
sejajar dengan `config` seed device `tank-rooftop` (`tankHeightCm`,
`fullDistanceCm`) — ubah keduanya jika tandon aslimu beda ukuran.

## Wiring

```
HC-SR04            ESP32
  VCC  ──────────── 5V (VIN)      HC-SR04 perlu 5V agar TRIG andal
  GND  ──────────── GND
  TRIG ──────────── GPIO5         (3V3 dari ESP32 → aman untuk input HC-SR04)
  ECHO ──[1k]──┬─── GPIO18        ECHO keluar 5V — WAJIB pembagi tegangan
              [2k]
               └─── GND           5V × 2k/(1k+2k) = 3.3V
```

> ⚠️ Jangan colok `ECHO` langsung ke GPIO. Pin ESP32 maks 3.3V; tanpa pembagi
> tegangan board bisa rusak perlahan. 1k+2k (atau 1k+2k2) sudah cukup.

## Flashing

1. **Library**: Library Manager → pasang **PubSubClient** (Nick O'Leary).
   HC-SR04 tidak butuh library.
2. **Board**: `ESP32 Dev Module` (WROOM-32).
3. **Secrets**: salin `arduino_secrets.h.example` → `arduino_secrets.h` (gitignored) dan isi:
   - `SECRET_WIFI_SSID` / `SECRET_WIFI_PASSWORD` — WiFi **2.4 GHz**.
   - `SECRET_MQTT_HOST` — IP LAN laptop/Pi (dicetak `setup.bat`; cek ulang, berubah tiap jaringan).
   - `SECRET_MQTT_PASSWORD` — password node dari `.secrets/mqtt-dev-passwords.json`, kunci **`esp32-tank-001`**.
     Muncul setelah `npm run db:seed`. **Reseed menulis ulang** — salin ulang bila seed lagi, lalu jalankan `npm run mqtt:users` + restart Mosquitto.
4. Upload. Buka Serial Monitor **115200** — harus muncul `wifi OK`, `ntp OK`,
   `mqtt OK`, lalu baris `[tank] level=.. jarak=.. cm` tiap ~8 detik.

## Verifikasi cepat (tanpa dashboard)

Dari sisi broker, cek node online + telemetry masuk:

```bash
docker exec huni-mosquitto-1 mosquitto_sub -u gateway -P local-dev-mqtt-gateway \
  -t 'home/home-1/node/esp32-tank-001/availability' \
  -t 'home/home-1/device/tank-rooftop/telemetry' -v
```

Harus terlihat `{"status":"online",...}` (retained) dan payload `level_pct`.
Setelah api+gateway+web jalan, gauge **Tandon Air** muncul di halaman **Air**.

## Kalibrasi di lapangan

1. Isi tandon **penuh**, catat `jarak` dari Serial → itu `FULL_DISTANCE_CM`.
2. Kosongkan (atau ukur dasar), `TANK_HEIGHT_CM` = jarak_kosong − `FULL_DISTANCE_CM`.
3. Update dua konstanta di `.ino` **dan** `config` seed agar konsisten, re-flash.
