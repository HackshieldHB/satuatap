/*
 * SATU ATAP — Node esp32-water-env-001 (Fase D, firmware node #2)
 * ---------------------------------------------------------------
 * Satu board ESP32 meng-host ENAM device logis dari tiga jenis sensor:
 *   Air (YF-S201, hall flow)   -> water-main, water-kitchen   -> telemetry {flow_lpm, volume_liters}
 *   Suhu/lembap (DHT22)        -> env-living-room, env-bedroom -> telemetry {temperature_c, humidity_pct}
 *   Gerak (HC-SR501 PIR)       -> pir-living-room, pir-bedroom -> event {MOTION_DETECTED|MOTION_CLEARED}
 *
 * Payload PERSIS seperti apps/iot-simulator — board ini menggantikan simulator
 * untuk keenam device tsb, bukan menambah jalur baru.
 *
 * AUTENTIKASI: login SEKALI sebagai NODE (username = esp32-water-env-001).
 * Password dari .secrets/mqtt-dev-passwords.json, kunci "esp32-water-env-001"
 * (ditulis ulang tiap `npm run db:seed` — salin ulang kalau seed lagi).
 *
 * Library (Library Manager):
 *   - PubSubClient            by Nick O'Leary
 *   - DHT sensor library      by Adafruit  (+ dependensi Adafruit Unified Sensor)
 * Board: ESP32 Dev Module (WROOM-32).
 *
 * WIRING (semua low-voltage, TIDAK ada mains di board ini):
 *   DHT22 #1 (env-living)   DATA -> GPIO4    VCC 3V3   GND   (pull-up 10k DATA->3V3)
 *   DHT22 #2 (env-bedroom)  DATA -> GPIO16   VCC 3V3   GND   (pull-up 10k)
 *   YF-S201 #1 (water-main)   OUT -> GPIO25   VCC 5V    GND
 *   YF-S201 #2 (water-kitchen)OUT -> GPIO26   VCC 5V    GND
 *   HC-SR501 #1 (pir-living)  OUT -> GPIO32   VCC 5V    GND
 *   HC-SR501 #2 (pir-bedroom) OUT -> GPIO33   VCC 5V    GND
 *   PIR keluar 3V3 di pin OUT — aman ke GPIO ESP32. Flow sensor OUT juga ~3V3
 *   pada modul bertegangan 5V dgn pull-up internal; kalau modulmu 5V penuh,
 *   pasang pembagi tegangan pada jalur OUT flow.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>
#include "arduino_secrets.h"   // di-gitignore; salin dari arduino_secrets.h.example

// ---------------------------------------------------------------------------
// Kredensial di arduino_secrets.h (TIDAK masuk git). Cek IP host tiap flash.
// ---------------------------------------------------------------------------

const char* WIFI_SSID     = SECRET_WIFI_SSID;
const char* WIFI_PASSWORD = SECRET_WIFI_PASSWORD;
const char* MQTT_HOST     = SECRET_MQTT_HOST;

// Akun NODE. Username = nodeId; password node dari .secrets.
const char* MQTT_USERNAME = "esp32-water-env-001";
const char* MQTT_PASSWORD = SECRET_MQTT_PASSWORD;

// ---------------------------------------------------------------------------

const uint16_t MQTT_PORT = 1883;
const char*    HOME_ID   = "home-1";
const char*    NODE_ID   = "esp32-water-env-001";
const char*    FIRMWARE  = "water-env-1.0.0";

const uint32_t WATER_MS  = 5000;    // samakan dengan WATER_INTERVAL_MS simulator
const uint32_t ENV_MS    = 10000;   // ENVIRONMENT_INTERVAL_MS

// Device id per kategori (urutan sejajar dengan pin di bawah).
const char* WATER_IDS[2] = { "water-main", "water-kitchen" };
const char* ENV_IDS[2]   = { "env-living-room", "env-bedroom" };
const char* PIR_IDS[2]   = { "pir-living-room", "pir-bedroom" };

const int DHT_PINS[2]  = { 4, 16 };
const int FLOW_PINS[2] = { 25, 26 };
const int PIR_PINS[2]  = { 32, 33 };

// YF-S201: ~450 pulsa per liter (F[Hz] = 7.5 x Q[L/min]).
const float PULSES_PER_LITER = 450.0f;

const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.google.com";

// ---------------------------------------------------------------------------

WiFiClient   net;
PubSubClient mqtt(net);

#define DHTTYPE DHT22
DHT dht[2] = { DHT(DHT_PINS[0], DHTTYPE), DHT(DHT_PINS[1], DHTTYPE) };

// Penghitung pulsa flow diisi dari ISR — wajib volatile.
volatile uint32_t flowPulses[2] = { 0, 0 };
void IRAM_ATTR isrFlow0() { flowPulses[0]++; }
void IRAM_ATTR isrFlow1() { flowPulses[1]++; }

// volume_liters kumulatif per device. Reset ke 0 saat board reboot — ingest
// memperlakukan volume_liters sebagai counter dan menoleransi reset (delta
// dihitung ulang), jadi total di cloud tidak rusak.
double volumeLiters[2] = { 0.0, 0.0 };

bool pirState[2] = { false, false };

char topicWater[2][96];
char topicEnv[2][96];
char topicPir[2][96];
char topicAvailability[96];

uint32_t lastWater = 0;
uint32_t lastEnv   = 0;
uint8_t  authFailures = 0;

// ---------------------------------------------------------------------------

void buildTopics() {
  for (int i = 0; i < 2; i++) {
    snprintf(topicWater[i], sizeof(topicWater[i]),
             "home/%s/device/%s/telemetry", HOME_ID, WATER_IDS[i]);
    snprintf(topicEnv[i], sizeof(topicEnv[i]),
             "home/%s/device/%s/telemetry", HOME_ID, ENV_IDS[i]);
    snprintf(topicPir[i], sizeof(topicPir[i]),
             "home/%s/device/%s/event", HOME_ID, PIR_IDS[i]);
  }
  snprintf(topicAvailability, sizeof(topicAvailability),
           "home/%s/node/%s/availability", HOME_ID, NODE_ID);
}

void connectWifi() {
  Serial.printf("\n[wifi] menyambung ke %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
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

void syncTime() {
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);
  Serial.print("[ntp] sinkron waktu ");
  struct tm tm;
  uint8_t tries = 0;
  while (!getLocalTime(&tm, 500) && tries < 20) {
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
        FIRMWARE, WiFi.localIP().toString().c_str(),
        WiFi.macAddress().c_str(), WiFi.RSSI());
      mqtt.publish(topicAvailability, online, true);
      return;
    }

    int rc = mqtt.state();
    Serial.printf("gagal, rc=%d\n", rc);
    if (rc == 4 || rc == 5) {
      authFailures++;
      Serial.println("[mqtt] DITOLAK broker. rc=4 password salah, rc=5 tidak diizinkan.");
      Serial.println("       Password node dari .secrets (kunci nodeId)? Sudah mqtt:users + restart Mosquitto?");
      if (authFailures >= 3) {
        Serial.println("[mqtt] berhenti mencoba. Perbaiki kredensial, lalu reset board.");
        while (true) delay(1000);
      }
    } else if (rc == -2) {
      Serial.println("[mqtt] broker tidak terjangkau. Cek IP host, port 1883, firewall.");
    }
    delay(3000);
  }
}

// --- publikasi per kategori -------------------------------------------------

// Air: hitung flow dari pulsa sejak siklus terakhir, akumulasi volume.
void publishWater(const char* ts, uint32_t elapsedMs) {
  for (int i = 0; i < 2; i++) {
    noInterrupts();
    uint32_t pulses = flowPulses[i];
    flowPulses[i] = 0;
    interrupts();

    double liters = pulses / PULSES_PER_LITER;
    volumeLiters[i] += liters;
    double flowLpm = liters * (60000.0 / (double)elapsedMs);

    char body[200];
    snprintf(body, sizeof(body),
      "{\"ts\":\"%s\",\"metrics\":{\"flow_lpm\":%.2f,\"volume_liters\":%.2f}}",
      ts, flowLpm, volumeLiters[i]);
    bool sent = mqtt.publish(topicWater[i], body);
    Serial.printf("[air]  %-13s %s flow=%.2f L/min vol=%.2f L\n",
                  WATER_IDS[i], sent ? "OK " : "GAGAL", flowLpm, volumeLiters[i]);
  }
}

// Suhu/lembap: DHT22 balas NaN kalau gagal baca — skip agar JSON tetap valid.
void publishEnv(const char* ts) {
  for (int i = 0; i < 2; i++) {
    float t = dht[i].readTemperature();
    float h = dht[i].readHumidity();
    if (isnan(t) || isnan(h)) {
      Serial.printf("[env] %s TIDAK MERESPONS (cek DATA/pull-up/catu DHT22)\n", ENV_IDS[i]);
      continue;
    }
    if (h < 0.0f) h = 0.0f;
    if (h > 100.0f) h = 100.0f;   // humidity_pct dibatasi 0..100 oleh skema

    char body[200];
    snprintf(body, sizeof(body),
      "{\"ts\":\"%s\",\"metrics\":{\"temperature_c\":%.1f,\"humidity_pct\":%.1f}}",
      ts, t, h);
    bool sent = mqtt.publish(topicEnv[i], body);
    Serial.printf("[env]  %-13s %s %.1f C  %.1f%%\n",
                  ENV_IDS[i], sent ? "OK " : "GAGAL", t, h);
  }
}

// Gerak: kirim event HANYA saat status berubah (edge), bukan tiap loop.
void handleMotion(const char* ts) {
  for (int i = 0; i < 2; i++) {
    bool now = digitalRead(PIR_PINS[i]) == HIGH;
    if (now == pirState[i]) continue;
    pirState[i] = now;

    char body[120];
    snprintf(body, sizeof(body),
      "{\"ts\":\"%s\",\"event\":\"%s\"}",
      ts, now ? "MOTION_DETECTED" : "MOTION_CLEARED");
    bool sent = mqtt.publish(topicPir[i], body);
    Serial.printf("[gerak] %-12s %s %s\n",
                  PIR_IDS[i], sent ? "OK " : "GAGAL", now ? "TERDETEKSI" : "hilang");
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n\n=== SATU ATAP — node esp32-water-env-001 (air + suhu + gerak) ===");

  for (int i = 0; i < 2; i++) {
    dht[i].begin();
    pinMode(FLOW_PINS[i], INPUT_PULLUP);
    pinMode(PIR_PINS[i], INPUT);
  }
  attachInterrupt(digitalPinToInterrupt(FLOW_PINS[0]), isrFlow0, RISING);
  attachInterrupt(digitalPinToInterrupt(FLOW_PINS[1]), isrFlow1, RISING);

  buildTopics();
  connectWifi();
  syncTime();
  connectMqtt();
  lastWater = lastEnv = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected())             connectMqtt();
  mqtt.loop();

  char ts[28];
  isoNow(ts, sizeof(ts));

  // Gerak dievaluasi tiap loop supaya responsif (event on-change).
  handleMotion(ts);

  uint32_t now = millis();
  if (now - lastWater >= WATER_MS) {
    publishWater(ts, now - lastWater);
    lastWater = now;
  }
  if (now - lastEnv >= ENV_MS) {
    publishEnv(ts);
    lastEnv = now;
  }
}
