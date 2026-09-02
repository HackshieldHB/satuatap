/*
 * SATU ATAP — Node esp32-lighting-001 (Fase D, firmware node #3: AKTUATOR)
 * ------------------------------------------------------------------------
 * Node PERTAMA yang MENERIMA perintah (bukan cuma publish). Menggerakkan relay
 * untuk enam device on/off:
 *   light-living-room / light-bedroom / light-kitchen / light-spare  (lampu)
 *   lock-front   → solenoid kunci pintu   (FAIL-SECURE: relay OFF = terkunci)
 *   valve-main   → solenoid keran air     (FAIL-CLOSED: relay OFF = tertutup)
 *
 * Kontrak MQTT (sama untuk tiap device):
 *   SUBSCRIBE  home/home-1/device/<id>/command   → {commandId, type: TURN_ON|TURN_OFF}
 *   PUBLISH    home/home-1/device/<id>/ack        → {commandId, status, error}
 *   PUBLISH    home/home-1/device/<id>/state      → {ts, metrics:{on}}  (retained)
 *   PUBLISH    home/home-1/node/<node>/availability (retained + LWT)
 *
 * AUTENTIKASI: login SEKALI sebagai NODE (username esp32-lighting-001).
 * Password dari arduino_secrets.h (di-gitignore).
 *
 * KEAMANAN AKTUATOR (baca firmware/lighting/README.md):
 *  - Semua relay diinisialisasi ke keadaan AMAN saat boot (mati). Untuk kunci
 *    fail-secure ini berarti pintu TERKUNCI saat listrik/board mati; untuk keran
 *    fail-closed berarti keran TERTUTUP. Jangan ubah tanpa memikirkan gagal-aman.
 *  - Solenoid = beban induktif: WAJIB pakai modul relay + catu 12V terpisah +
 *    dioda flyback. JANGAN menggerakkan solenoid langsung dari pin ESP32.
 *  - "on" = relay energized. Untuk lock, on = TERBUKA; untuk valve, on = MENGALIR.
 *
 * Library: PubSubClient by Nick O'Leary.  Board: ESP32 Dev Module (WROOM-32).
 * Relay 6 kanal (atau 8ch). Pin menghindari strapping/flash ESP32.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include "arduino_secrets.h"   // di-gitignore; salin dari arduino_secrets.h.example

// ---------------------------------------------------------------------------

const char* WIFI_SSID     = SECRET_WIFI_SSID;
const char* WIFI_PASSWORD = SECRET_WIFI_PASSWORD;
const char* MQTT_HOST     = SECRET_MQTT_HOST;
const char* MQTT_USERNAME = "esp32-lighting-001";
const char* MQTT_PASSWORD = SECRET_MQTT_PASSWORD;

const uint16_t MQTT_PORT = 1883;
const char*    HOME_ID   = "home-1";
const char*    NODE_ID   = "esp32-lighting-001";
const char*    FIRMWARE  = "lighting-1.0.0";

// Modul relay umumnya AKTIF-RENDAH (LOW = relay ON). Ubah bila modulmu aktif-tinggi.
const bool RELAY_ACTIVE_LOW = true;

// Satu baris per device on/off yang di-host node ini.
struct Actuator {
  const char* deviceId;
  uint8_t     pin;
  bool        on;        // status logis terakhir
  char        topicCmd[96];
  char        topicState[96];
  char        topicAck[96];
};

Actuator actuators[] = {
  { "light-living-room", 23, false, "", "", "" },
  { "light-bedroom",     22, false, "", "", "" },
  { "light-kitchen",     21, false, "", "", "" },
  { "light-spare",       19, false, "", "", "" },
  { "lock-front",        18, false, "", "", "" },  // fail-secure
  { "valve-main",        17, false, "", "", "" },  // fail-closed
};
const int NUM_ACT = sizeof(actuators) / sizeof(actuators[0]);

const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.google.com";

char topicAvailability[96];

WiFiClient   net;
PubSubClient mqtt(net);
uint8_t authFailures = 0;

// ---------------------------------------------------------------------------

void applyRelay(Actuator& a) {
  bool level = a.on ? (RELAY_ACTIVE_LOW ? LOW : HIGH) : (RELAY_ACTIVE_LOW ? HIGH : LOW);
  digitalWrite(a.pin, level);
}

void buildTopics() {
  for (int i = 0; i < NUM_ACT; i++) {
    snprintf(actuators[i].topicCmd, sizeof(actuators[i].topicCmd),
             "home/%s/device/%s/command", HOME_ID, actuators[i].deviceId);
    snprintf(actuators[i].topicState, sizeof(actuators[i].topicState),
             "home/%s/device/%s/state", HOME_ID, actuators[i].deviceId);
    snprintf(actuators[i].topicAck, sizeof(actuators[i].topicAck),
             "home/%s/device/%s/ack", HOME_ID, actuators[i].deviceId);
  }
  snprintf(topicAvailability, sizeof(topicAvailability),
           "home/%s/node/%s/availability", HOME_ID, NODE_ID);
}

void connectWifi() {
  Serial.printf("\n[wifi] menyambung ke %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) { delay(500); Serial.print("."); tries++; }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n[wifi] GAGAL — cek SSID/password, pastikan 2.4 GHz. Restart 5s...");
    delay(5000);
    ESP.restart();
  }
  Serial.printf(" OK  IP %s  RSSI %d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

void syncTime() {
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);
  struct tm tm;
  uint8_t tries = 0;
  while (!getLocalTime(&tm, 500) && tries < 20) tries++;
  Serial.println(tries >= 20 ? "[ntp] gagal (timestamp bisa salah)" : "[ntp] OK");
}

void isoNow(char* out, size_t len) {
  time_t now = time(nullptr);
  struct tm tmUtc;
  gmtime_r(&now, &tmUtc);
  char base[24];
  strftime(base, sizeof(base), "%Y-%m-%dT%H:%M:%S", &tmUtc);
  snprintf(out, len, "%s.000Z", base);
}

void publishState(Actuator& a) {
  char ts[28];
  isoNow(ts, sizeof(ts));
  char body[120];
  snprintf(body, sizeof(body), "{\"ts\":\"%s\",\"metrics\":{\"on\":%s}}",
           ts, a.on ? "true" : "false");
  mqtt.publish(a.topicState, body, true);   // retained
}

// Ekstrak nilai string sederhana dari JSON: "key":"value".
bool jsonString(const char* json, const char* key, char* out, size_t len) {
  char needle[48];
  snprintf(needle, sizeof(needle), "\"%s\"", key);
  const char* p = strstr(json, needle);
  if (!p) return false;
  p = strchr(p + strlen(needle), ':');
  if (!p) return false;
  p++;
  while (*p == ' ' || *p == '"') p++;
  size_t i = 0;
  while (*p && *p != '"' && *p != ',' && *p != '}' && i < len - 1) out[i++] = *p++;
  out[i] = '\0';
  return true;
}

void onMessage(char* topic, byte* payload, unsigned int len) {
  char buf[256];
  unsigned int n = len < sizeof(buf) - 1 ? len : sizeof(buf) - 1;
  memcpy(buf, payload, n);
  buf[n] = '\0';

  for (int i = 0; i < NUM_ACT; i++) {
    if (strcmp(topic, actuators[i].topicCmd) != 0) continue;
    Actuator& a = actuators[i];

    char type[24] = "";
    char commandId[48] = "";
    jsonString(buf, "type", type, sizeof(type));
    jsonString(buf, "commandId", commandId, sizeof(commandId));

    bool ok = true;
    if (strcmp(type, "TURN_ON") == 0)       a.on = true;
    else if (strcmp(type, "TURN_OFF") == 0) a.on = false;
    else ok = false;

    if (ok) applyRelay(a);

    char ack[160];
    snprintf(ack, sizeof(ack),
      "{\"commandId\":\"%s\",\"status\":\"%s\",\"error\":%s}",
      commandId,
      ok ? "SUCCEEDED" : "FAILED",
      ok ? "null" : "\"unsupported_command\"");
    mqtt.publish(a.topicAck, ack);
    if (ok) publishState(a);
    Serial.printf("[cmd] %-16s %s -> %s\n", a.deviceId, type, a.on ? "ON" : "OFF");
    return;
  }
}

void connectMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);

  while (!mqtt.connected()) {
    Serial.printf("[mqtt] konek %s:%u sebagai %s ... ", MQTT_HOST, MQTT_PORT, MQTT_USERNAME);
    bool ok = mqtt.connect(NODE_ID, MQTT_USERNAME, MQTT_PASSWORD,
                           topicAvailability, 1, true, "{\"status\":\"offline\"}");
    if (ok) {
      authFailures = 0;
      Serial.println("OK");
      char online[224];
      snprintf(online, sizeof(online),
        "{\"status\":\"online\",\"firmware\":\"%s\",\"ip\":\"%s\",\"mac\":\"%s\",\"rssi\":%d}",
        FIRMWARE, WiFi.localIP().toString().c_str(), WiFi.macAddress().c_str(), WiFi.RSSI());
      mqtt.publish(topicAvailability, online, true);
      // Subscribe tiap command topic + umumkan state awal (aman/mati).
      for (int i = 0; i < NUM_ACT; i++) {
        mqtt.subscribe(actuators[i].topicCmd, 1);
        publishState(actuators[i]);
      }
      Serial.printf("[mqtt] subscribe %d command topic\n", NUM_ACT);
      return;
    }
    int rc = mqtt.state();
    Serial.printf("gagal rc=%d\n", rc);
    if (rc == 4 || rc == 5) {
      if (++authFailures >= 3) { Serial.println("[mqtt] kredensial salah, reset board."); while (true) delay(1000); }
    }
    delay(3000);
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n\n=== SATU ATAP — node esp32-lighting-001 (aktuator relay) ===");

  // Inisialisasi SEMUA relay ke keadaan AMAN (mati) SEBELUM apa pun tersambung.
  for (int i = 0; i < NUM_ACT; i++) {
    pinMode(actuators[i].pin, OUTPUT);
    actuators[i].on = false;
    applyRelay(actuators[i]);
  }

  buildTopics();
  connectWifi();
  syncTime();
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected())             connectMqtt();
  mqtt.loop();
}
