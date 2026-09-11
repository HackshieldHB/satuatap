/*
 * SATU ATAP — Node esp32-tank-001 (capability baru: tank_level)
 * -------------------------------------------------------------
 * Satu board ESP32 meng-host SATU device logis:
 *   Level tandon (HC-SR04 ultrasonic) -> tank-rooftop
 *       -> telemetry {level_pct, distance_cm}
 *
 * Payload PERSIS seperti apps/iot-simulator (node esp32-tank-001) — board ini
 * menggantikan simulator untuk device tsb, bukan menambah jalur baru.
 *
 * KONSEP: HC-SR04 mengukur JARAK dari sensor (dipasang di tutup tandon,
 * menghadap ke bawah) ke permukaan air. Makin penuh tandon, makin dekat air,
 * makin kecil jaraknya. level_pct dihitung di firmware dari dua kalibrasi:
 *   FULL_DISTANCE_CM  = jarak saat tandon PENUH  (air paling dekat ke sensor)
 *   TANK_HEIGHT_CM    = tinggi kolom air berguna (penuh - kosong)
 * -> EMPTY_DISTANCE = FULL_DISTANCE_CM + TANK_HEIGHT_CM
 * -> level_pct = (EMPTY_DISTANCE - jarak) / TANK_HEIGHT_CM * 100, di-clamp 0..100
 * Nilai ini sejajar dengan seed config { tankHeightCm: 30, fullDistanceCm: 4 }.
 *
 * AUTENTIKASI: login SEKALI sebagai NODE (username = esp32-tank-001).
 * Password dari .secrets/mqtt-dev-passwords.json, kunci "esp32-tank-001"
 * (ditulis ulang tiap `npm run db:seed` — salin ulang kalau seed lagi).
 *
 * Library (Library Manager): PubSubClient by Nick O'Leary. HC-SR04 TIDAK butuh
 * library — cukup pulseIn bawaan.
 * Board: ESP32 Dev Module (WROOM-32).
 *
 * WIRING (semua low-voltage, TIDAK ada mains di board ini):
 *   HC-SR04 VCC  -> 5V (VIN)     HC-SR04 butuh 5V agar TRIG andal
 *   HC-SR04 GND  -> GND
 *   HC-SR04 TRIG -> GPIO5        (output 3V3 dari ESP32 -> aman)
 *   HC-SR04 ECHO -> pembagi tegangan -> GPIO18
 *       ECHO keluar 5V! JANGAN colok langsung ke GPIO (maks 3.3V).
 *       Pembagi: ECHO --[1k]--+--> GPIO18
 *                             [2k]
 *                              +--> GND      (5V * 2k/3k = 3.3V)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include "arduino_secrets.h"   // di-gitignore; salin dari arduino_secrets.h.example

// ---------------------------------------------------------------------------
// Kredensial di arduino_secrets.h (TIDAK masuk git). Cek IP host tiap flash.
// ---------------------------------------------------------------------------

const char* WIFI_SSID     = SECRET_WIFI_SSID;
const char* WIFI_PASSWORD = SECRET_WIFI_PASSWORD;
const char* MQTT_HOST     = SECRET_MQTT_HOST;

// Akun NODE. Username = nodeId; password node dari .secrets.
const char* MQTT_USERNAME = "esp32-tank-001";
const char* MQTT_PASSWORD = SECRET_MQTT_PASSWORD;

// ---------------------------------------------------------------------------

const uint16_t MQTT_PORT = 1883;
const char*    HOME_ID   = "home-1";
const char*    NODE_ID   = "esp32-tank-001";
const char*    FIRMWARE  = "tank-1.0.0";
const char*    TANK_ID   = "tank-rooftop";

const uint32_t TANK_MS   = 8000;   // samakan dengan TANK_INTERVAL_MS simulator

// Pin HC-SR04.
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

// Kalibrasi tandon — samakan dengan seed config device tank-rooftop.
const float FULL_DISTANCE_CM = 4.0f;    // jarak sensor->air saat PENUH
const float TANK_HEIGHT_CM   = 30.0f;   // tinggi kolom air berguna
const float EMPTY_DISTANCE_CM = FULL_DISTANCE_CM + TANK_HEIGHT_CM;

// Batas fisik pembacaan (buang gema liar). HC-SR04 andal ~2..400 cm.
const float MIN_VALID_CM = 2.0f;
const float MAX_VALID_CM = 400.0f;

const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.google.com";

// ---------------------------------------------------------------------------

WiFiClient   net;
PubSubClient mqtt(net);

char topicTelemetry[96];
char topicAvailability[96];

uint32_t lastTank = 0;
uint8_t  authFailures = 0;

// ---------------------------------------------------------------------------

void buildTopics() {
  snprintf(topicTelemetry, sizeof(topicTelemetry),
           "home/%s/device/%s/telemetry", HOME_ID, TANK_ID);
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

// --- pembacaan HC-SR04 ------------------------------------------------------

// Satu ping: jarak (cm) atau -1 kalau timeout/di luar rentang valid.
float readDistanceOnce() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(3);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // pulseIn timeout 30 ms ~ 5 m pulang-pergi. 0 = tak ada gema.
  unsigned long us = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (us == 0) return -1.0f;
  float cm = (float)us * 0.0343f / 2.0f;   // kecepatan suara 343 m/s
  if (cm < MIN_VALID_CM || cm > MAX_VALID_CM) return -1.0f;
  return cm;
}

// Median dari beberapa ping — buang gema liar/percikan air.
float readDistanceMedian() {
  const int N = 5;
  float s[N];
  int n = 0;
  for (int i = 0; i < N; i++) {
    float d = readDistanceOnce();
    if (d > 0) s[n++] = d;
    delay(40);
  }
  if (n == 0) return -1.0f;
  // insertion sort kecil
  for (int i = 1; i < n; i++) {
    float key = s[i];
    int j = i - 1;
    while (j >= 0 && s[j] > key) { s[j + 1] = s[j]; j--; }
    s[j + 1] = key;
  }
  return s[n / 2];
}

void publishTank(const char* ts) {
  float distance = readDistanceMedian();
  if (distance < 0) {
    Serial.println("[tank] TIDAK ada gema valid — sensor lepas / tandon terlalu dalam?");
    return;   // lewati siklus ini; jangan kirim data palsu
  }

  float level = (EMPTY_DISTANCE_CM - distance) / TANK_HEIGHT_CM * 100.0f;
  if (level < 0) level = 0;
  if (level > 100) level = 100;

  char body[160];
  snprintf(body, sizeof(body),
    "{\"ts\":\"%s\",\"metrics\":{\"level_pct\":%.1f,\"distance_cm\":%.1f}}",
    ts, level, distance);
  mqtt.publish(topicTelemetry, body);
  Serial.printf("[tank] level=%.1f%%  jarak=%.1f cm\n", level, distance);
}

// ---------------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== SATU ATAP node esp32-tank-001 (HC-SR04 tank_level) ===");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  buildTopics();
  connectWifi();
  syncTime();
  connectMqtt();
}

void loop() {
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  uint32_t now = millis();
  if (now - lastTank >= TANK_MS) {
    lastTank = now;
    char ts[28];
    isoNow(ts, sizeof(ts));
    publishTank(ts);
  }
}
