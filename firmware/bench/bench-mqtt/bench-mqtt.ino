/*
 * SATU ATAP — Sesi 1: Bench Chain Test (versi P4, dengan autentikasi MQTT)
 * -----------------------------------------------------------------------
 * Sketch ini SENGAJA dibuang setelah kepakai. Tujuannya membuktikan rantai
 *   ESP32 -> WiFi -> MQTT (auth + ACL) -> gateway -> API -> dashboard
 * nyambung, sebelum satu pun sensor dipasang.
 *
 * ESP32 menyamar sebagai device `energy-main` yang sudah ada di seed, memakai
 * kredensial MQTT aslinya. Jadi sesi ini sekaligus menguji autentikasi broker,
 * ACL per-device, jalur ingest, perhitungan delta, dan halaman /energy.
 *
 * PENTING — matikan simulator dulu (`npm run dev:simulator`) selama sesi ini.
 * Kalau simulator dan ESP32 sama-sama publish sebagai energy-main, dua counter
 * yang berbeda akan saling menyalip dan log lo penuh peringatan counter_reset.
 *
 * Library: PubSubClient by Nick O'Leary
 * Board:   ESP32 Dev Module
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>

// ---------------------------------------------------------------------------
// ISI LIMA BARIS INI
// ---------------------------------------------------------------------------

// SSID yang sama dengan yang dipakai laptop. WAJIB 2.4 GHz - ESP32 tidak bisa 5 GHz.
const char* WIFI_SSID     = "ThunderElite";
const char* WIFI_PASSWORD = "Kontrakan7878";

// IP antarmuka Wi-Fi laptop.
//
// PERIKSA INI SEBELUM SETIAP FLASH. Angka ini sudah berubah sekali selama setup
// (192.168.137.31 -> 10.165.52.216) karena laptop berpindah jaringan. Kalau IP-nya
// basi, ESP32 tersambung ke Wi-Fi dengan normal lalu gagal ke broker dengan rc=-2,
// dan gejalanya mudah disalahartikan sebagai masalah firewall atau kredensial.
// Cek cepat: ipconfig, atau jalankan setup.bat yang mencetaknya di bagian 5.
const char* MQTT_HOST     = "192.168.1.5";

// Ambil dari .secrets/mqtt-dev-passwords.json di root repo, kunci "energy-main".
// File itu ditulis ulang setiap npm run db:seed, jadi kalau lo seed ulang,
// salin lagi yang baru ke sini.
const char* MQTT_USERNAME = "energy-main";
const char* MQTT_PASSWORD = "z2ljhdZBoz3tScFoPXZnkfx5";

// ---------------------------------------------------------------------------

const uint16_t MQTT_PORT  = 1883;
const char*    HOME_ID    = "home-1";               // seed memakai home-1, bukan home-001
const char*    NODE_ID    = "esp32-energy-001";
const char*    DEVICE_ID  = "energy-main";
const uint32_t PUBLISH_MS = 5000;

// NTP: firmware butuh waktu nyata supaya telemetry masuk ke jam yang benar
// (bukan menumpuk di satu baris 1970). Offset 0 = UTC, jadi timestamp ISO
// bisa diakhiri 'Z' tanpa perlu hitung zona waktu.
const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.google.com";

char topicTelemetry[96];
char topicCommand[96];
char topicAvailability[96];

WiFiClient   net;
PubSubClient mqtt(net);

uint32_t lastPublish  = 0;
uint8_t  authFailures = 0;

// Counter kumulatif, meniru PZEM: hanya pernah naik, tidak pernah turun.
// Mulai dari angka besar supaya menyerupai modul yang sudah lama terpasang —
// justru kondisi inilah yang dulu membuat bug delta terlihat.
double energyKwh = 148.2500;

// ---------------------------------------------------------------------------

void buildTopics() {
  snprintf(topicTelemetry, sizeof(topicTelemetry),
           "home/%s/device/%s/telemetry", HOME_ID, DEVICE_ID);
  snprintf(topicCommand, sizeof(topicCommand),
           "home/%s/device/%s/command", HOME_ID, DEVICE_ID);
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
  Serial.printf("[wifi] MAC : %s   <-- catat, nanti masuk device registry\n",
                WiFi.macAddress().c_str());
  Serial.printf("[wifi] RSSI: %d dBm\n", WiFi.RSSI());
}

void onMessage(char* topic, byte* payload, unsigned int len) {
  Serial.printf("[mqtt] masuk <- %s : ", topic);
  for (unsigned int i = 0; i < len; i++) Serial.print((char)payload[i]);
  Serial.println();
}

void connectMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);

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
        "{\"status\":\"online\",\"firmware\":\"bench-0.2.0\",\"build\":2,"
        "\"ip\":\"%s\",\"mac\":\"%s\",\"rssi\":%d}",
        WiFi.localIP().toString().c_str(),
        WiFi.macAddress().c_str(),
        WiFi.RSSI());

      mqtt.publish(topicAvailability, online, true);   // retained
      mqtt.subscribe(topicCommand, 1);
      Serial.printf("[mqtt] subscribe: %s\n", topicCommand);
      return;
    }

    int rc = mqtt.state();
    Serial.printf("gagal, rc=%d\n", rc);

    // Bedakan penolakan autentikasi dari gangguan jaringan — mencoba terus
    // ke broker yang tidak akan pernah menerima lo cuma bikin board ini
    // kelihatan "hampir jalan" berjam-jam.
    if (rc == 4 || rc == 5) {
      authFailures++;
      Serial.println("[mqtt] DITOLAK broker. rc=4 password salah, rc=5 tidak diizinkan.");
      Serial.println("       Sudah jalan `npm run db:seed` lalu `npm run mqtt:users`?");
      Serial.println("       Mosquitto sudah di-restart setelah file passwd dibuat?");
      if (authFailures >= 3) {
        Serial.println("[mqtt] berhenti mencoba. Perbaiki kredensial, lalu reset board.");
        while (true) delay(1000);
      }
    } else if (rc == -2) {
      Serial.println("[mqtt] broker tidak terjangkau. Cek IP laptop, binding port 1883,");
      Serial.println("       dan aturan Windows Firewall untuk jaringan Private.");
    }
    delay(3000);
  }
}

// ---------------------------------------------------------------------------

// Sinkronkan jam ESP32 lewat NTP. Dipanggil sekali setelah WiFi konek.
void syncTime() {
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);   // 0,0 = UTC, tanpa DST
  Serial.print("[ntp] sinkron waktu ");
  struct tm tm;
  uint8_t tries = 0;
  // getLocalTime menunggu sampai jam terisi (bukan lagi 1970).
  while (!getLocalTime(&tm, 500) && tries < 20) {  // maksimal ~10 detik
    Serial.print(".");
    tries++;
  }
  if (tries >= 20) {
    Serial.println(" GAGAL - telemetry tetap terkirim, tapi timestamp bisa salah.");
  } else {
    Serial.printf(" OK (%04d-%02d-%02d %02d:%02d:%02d UTC)\n",
                  tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday,
                  tm.tm_hour, tm.tm_min, tm.tm_sec);
  }
}

// Hasilkan timestamp ISO-8601 UTC, mis. "2026-08-29T09:40:00.000Z".
void isoNow(char* out, size_t len) {
  time_t now = time(nullptr);
  struct tm tmUtc;
  gmtime_r(&now, &tmUtc);
  char base[24];
  strftime(base, sizeof(base), "%Y-%m-%dT%H:%M:%S", &tmUtc);
  snprintf(out, len, "%s.000Z", base);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n\n=== SATU ATAP — bench chain test (P4) ===");

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

  // Naik sekitar 0,4-0,7 Wh tiap 5 detik — kira-kira beban rumah 300-500 W.
  energyKwh += 0.0004 + (random(0, 300) / 1000000.0);

  float voltage = 220.0f + random(-40, 40) / 10.0f;
  float current = 2.0f + random(-500, 500) / 1000.0f;
  float power   = voltage * current * 0.92f;

  // Timestamp nyata dari NTP - tiap pesan dapat waktu unik, jadi masuk sebagai
  // baris baru di jam berjalan (bukan menumpuk di satu baris 1970).
  char ts[28];
  isoNow(ts, sizeof(ts));

  char body[300];
  snprintf(body, sizeof(body),
    "{\"ts\":\"%s\",\"metrics\":{"
    "\"voltage\":%.1f,\"current\":%.3f,\"power\":%.1f,"
    "\"energy_kwh\":%.4f,\"frequency\":%.2f,\"power_factor\":%.3f,\"rssi\":%d}}",
    ts, voltage, current, power, energyKwh,
    50.0f + random(-20, 20) / 100.0f,
    0.92f + random(-40, 40) / 1000.0f,
    WiFi.RSSI());

  bool sent = mqtt.publish(topicTelemetry, body);
  Serial.printf("[mqtt] kirim -> %s  energy_kwh=%.4f\n", sent ? "OK " : "GAGAL", energyKwh);
}
