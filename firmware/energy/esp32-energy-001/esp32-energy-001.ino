/*
 * SATU ATAP — Node esp32-energy-001 (firmware produksi pertama, Fase D)
 * --------------------------------------------------------------------
 * Satu board ESP32 membaca DUA modul PZEM-004T v3.0 dan mem-publish telemetry
 * untuk dua device logis:
 *   - energy-main  (PZEM #1, panel utama rumah)
 *   - energy-ac    (PZEM #2, jalur AC)
 *
 * Payload-nya PERSIS seperti apps/iot-simulator: satu board menggantikan
 * simulator, bukan menambah jalur baru. Kontrak MQTT:
 *   home/home-1/device/<deviceId>/telemetry
 *   home/home-1/node/esp32-energy-001/availability   (retained + LWT)
 *
 * AUTENTIKASI — beda dari sketch bench.
 * Bench dulu login sebagai satu device (energy-main). Board sungguhan meng-host
 * banyak device, jadi ia login SEKALI sebagai NODE. Akun node punya ACL yang
 * mengizinkan menulis topik untuk semua device yang ia host (lihat
 * scripts/mqtt-acl.ts + tabel NodeCredential). Username = nodeId.
 *
 * Ambil password dari .secrets/mqtt-dev-passwords.json di root repo, kunci
 * "esp32-energy-001". File itu ditulis ulang setiap `npm run db:seed`, jadi
 * kalau seed ulang, salin lagi yang baru ke sini.
 *
 * Library (Library Manager):
 *   - PubSubClient          by Nick O'Leary
 *   - PZEM004Tv30           by Jakub Mandula
 * Board: ESP32 Dev Module.
 *
 * WIRING (TTL, 5V ke VCC PZEM, level UART sudah 3V3-safe di modul v3.0):
 *   PZEM #1 (energy-main)  TX -> GPIO16 (ESP32 RX1),  RX -> GPIO17 (ESP32 TX1)
 *   PZEM #2 (energy-ac)    TX -> GPIO27 (ESP32 RX2),  RX -> GPIO26 (ESP32 TX2)
 *   Semua GND disatukan. Sisi AC PZEM (L/N + coil CT) mengikuti manual PZEM.
 *   CATATAN board WROVER: GPIO16/17 dipakai PSRAM — pindah UART1 ke pin lain
 *   (mis. 25/33) kalau pakai WROVER. WROOM-32 aman dengan 16/17.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <PZEM004Tv30.h>
#include <time.h>

// ---------------------------------------------------------------------------
// ISI BAGIAN INI
// ---------------------------------------------------------------------------

// SSID 2.4 GHz — ESP32 tidak bisa 5 GHz.
const char* WIFI_SSID     = "ThunderElite";
const char* WIFI_PASSWORD = "Kontrakan7878";

// IP antarmuka Wi-Fi laptop/Pi yang menjalankan broker Mosquitto.
// PERIKSA SEBELUM SETIAP FLASH — berubah tiap ganti jaringan. Kalau basi, ESP32
// konek Wi-Fi normal tapi gagal ke broker dengan rc=-2. Cek cepat: setup.bat
// mencetaknya, atau `ipconfig`.
const char* MQTT_HOST     = "192.168.1.5";

// Akun NODE (bukan device). Password dari .secrets/mqtt-dev-passwords.json,
// kunci "esp32-energy-001".
const char* MQTT_USERNAME = "esp32-energy-001";
const char* MQTT_PASSWORD = "GANTI-DENGAN-PASSWORD-NODE-DARI-SECRETS";

// ---------------------------------------------------------------------------

const uint16_t MQTT_PORT   = 1883;
const char*    HOME_ID     = "home-1";
const char*    NODE_ID     = "esp32-energy-001";
const char*    FIRMWARE    = "energy-1.0.0";
const uint32_t PUBLISH_MS  = 5000;                 // samakan dengan ENERGY_INTERVAL_MS simulator

// Dua device pada board ini, sejajar dengan urutan array PZEM di bawah.
const char* DEVICE_IDS[2]  = { "energy-main", "energy-ac" };

// Pin UART untuk tiap PZEM. { RX_esp32, TX_esp32 }.
const int PZEM_PINS[2][2]  = { { 16, 17 }, { 27, 26 } };

// NTP: butuh waktu nyata supaya telemetry masuk ke jam yang benar (bukan
// menumpuk di satu baris 1970). Offset 0 = UTC → timestamp ISO berakhiran 'Z'.
const char* NTP_SERVER_1   = "pool.ntp.org";
const char* NTP_SERVER_2   = "time.google.com";

// ---------------------------------------------------------------------------

WiFiClient   net;
PubSubClient mqtt(net);

// PZEM #1 di UART1, PZEM #2 di UART2. Serial0 dipakai USB debug.
PZEM004Tv30 pzem[2] = {
  PZEM004Tv30(Serial1, PZEM_PINS[0][0], PZEM_PINS[0][1]),
  PZEM004Tv30(Serial2, PZEM_PINS[1][0], PZEM_PINS[1][1]),
};

char topicTelemetry[2][96];
char topicAvailability[96];

uint32_t lastPublish  = 0;
uint8_t  authFailures = 0;

// ---------------------------------------------------------------------------

void buildTopics() {
  for (int i = 0; i < 2; i++) {
    snprintf(topicTelemetry[i], sizeof(topicTelemetry[i]),
             "home/%s/device/%s/telemetry", HOME_ID, DEVICE_IDS[i]);
  }
  snprintf(topicAvailability, sizeof(topicAvailability),
           "home/%s/node/%s/availability", HOME_ID, NODE_ID);
}

void connectWifi() {
  Serial.printf("\n[wifi] menyambung ke %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {   // maksimal 20 detik
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n[wifi] GAGAL — cek SSID, password, dan pastikan band 2.4 GHz.");
    Serial.println("[wifi] restart dalam 5 detik...");
    delay(5000);
    ESP.restart();
  }

  Serial.println(" OK");
  Serial.printf("[wifi] IP  : %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("[wifi] MAC : %s\n", WiFi.macAddress().c_str());
  Serial.printf("[wifi] RSSI: %d dBm\n", WiFi.RSSI());
}

// Sinkronkan jam ESP32 lewat NTP. Dipanggil sekali setelah WiFi konek.
void syncTime() {
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);   // 0,0 = UTC, tanpa DST
  Serial.print("[ntp] sinkron waktu ");
  struct tm tm;
  uint8_t tries = 0;
  while (!getLocalTime(&tm, 500) && tries < 20) {  // maksimal ~10 detik
    Serial.print(".");
    tries++;
  }
  if (tries >= 20) {
    Serial.println(" GAGAL — telemetry tetap terkirim, tapi timestamp bisa salah.");
  } else {
    Serial.printf(" OK (%04d-%02d-%02d %02d:%02d:%02d UTC)\n",
                  tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday,
                  tm.tm_hour, tm.tm_min, tm.tm_sec);
  }
}

// Timestamp ISO-8601 UTC, mis. "2026-08-30T09:40:00.000Z".
void isoNow(char* out, size_t len) {
  time_t now = time(nullptr);
  struct tm tmUtc;
  gmtime_r(&now, &tmUtc);
  char base[24];
  strftime(base, sizeof(base), "%Y-%m-%dT%H:%M:%S", &tmUtc);
  snprintf(out, len, "%s.000Z", base);
}

void connectMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);

  while (!mqtt.connected()) {
    Serial.printf("[mqtt] menyambung ke %s:%u sebagai %s ... ",
                  MQTT_HOST, MQTT_PORT, MQTT_USERNAME);

    // clientId = NODE_ID. LWT retained: kalau board mati, broker publish offline.
    bool ok = mqtt.connect(
      NODE_ID,
      MQTT_USERNAME, MQTT_PASSWORD,
      topicAvailability, 1, true,
      "{\"status\":\"offline\"}"
    );

    if (ok) {
      authFailures = 0;
      Serial.println("OK");

      char online[224];
      snprintf(online, sizeof(online),
        "{\"status\":\"online\",\"firmware\":\"%s\",\"ip\":\"%s\",\"mac\":\"%s\",\"rssi\":%d}",
        FIRMWARE,
        WiFi.localIP().toString().c_str(),
        WiFi.macAddress().c_str(),
        WiFi.RSSI());
      mqtt.publish(topicAvailability, online, true);   // retained
      return;
    }

    int rc = mqtt.state();
    Serial.printf("gagal, rc=%d\n", rc);

    if (rc == 4 || rc == 5) {
      authFailures++;
      Serial.println("[mqtt] DITOLAK broker. rc=4 password salah, rc=5 tidak diizinkan.");
      Serial.println("       Password node dari .secrets/mqtt-dev-passwords.json (kunci nodeId)?");
      Serial.println("       Sudah `npm run db:seed` lalu `npm run mqtt:users`, lalu restart Mosquitto?");
      if (authFailures >= 3) {
        Serial.println("[mqtt] berhenti mencoba. Perbaiki kredensial, lalu reset board.");
        while (true) delay(1000);
      }
    } else if (rc == -2) {
      Serial.println("[mqtt] broker tidak terjangkau. Cek IP host, binding port 1883,");
      Serial.println("       dan aturan Windows Firewall untuk jaringan Private.");
    }
    delay(3000);
  }
}

// Baca satu PZEM lalu publish telemetry-nya. Kembalikan false kalau modul tidak
// merespons (semua NaN) — biar tidak mengirim JSON "nan" yang ditolak skema.
bool publishDevice(int i, const char* ts) {
  float voltage   = pzem[i].voltage();
  float current   = pzem[i].current();
  float power     = pzem[i].power();
  float energyKwh = pzem[i].energy();      // kumulatif kWh — cocok untuk energy_kwh
  float frequency = pzem[i].frequency();
  float pf        = pzem[i].pf();

  if (isnan(voltage) || isnan(energyKwh)) {
    Serial.printf("[pzem] %s TIDAK MERESPONS (cek wiring UART & catu daya PZEM)\n",
                  DEVICE_IDS[i]);
    return false;
  }

  // power_factor dibatasi 0..1 oleh skema; PZEM sesekali balas sedikit di luar.
  if (isnan(pf)) pf = 0.0f;
  if (pf < 0.0f) pf = 0.0f;
  if (pf > 1.0f) pf = 1.0f;
  if (isnan(current))   current = 0.0f;
  if (isnan(power))     power = 0.0f;
  if (isnan(frequency)) frequency = 0.0f;

  char body[300];
  snprintf(body, sizeof(body),
    "{\"ts\":\"%s\",\"metrics\":{"
    "\"voltage\":%.2f,\"current\":%.3f,\"power\":%.1f,"
    "\"energy_kwh\":%.4f,\"frequency\":%.2f,\"power_factor\":%.3f,\"rssi\":%d}}",
    ts, voltage, current, power, energyKwh, frequency, pf, WiFi.RSSI());

  bool sent = mqtt.publish(topicTelemetry[i], body);
  Serial.printf("[mqtt] %-11s %s  energy_kwh=%.4f  power=%.1fW\n",
                DEVICE_IDS[i], sent ? "OK " : "GAGAL", energyKwh, power);
  return sent;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n\n=== SATU ATAP — node esp32-energy-001 (2x PZEM-004T) ===");

  buildTopics();
  connectWifi();
  syncTime();
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected())             connectMqtt();
  mqtt.loop();

  uint32_t now = millis();
  if (now - lastPublish < PUBLISH_MS) return;
  lastPublish = now;

  char ts[28];
  isoNow(ts, sizeof(ts));
  for (int i = 0; i < 2; i++) publishDevice(i, ts);
}
