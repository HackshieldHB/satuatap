# Hardware

> **FUTURE HARDWARE INTEGRATION — NOT CONNECTED IN CURRENT PHASE**

Software devices in seed/simulator use MQTT contracts. Later mapping:

```text
ESP32 #1
  → PZEM-004T          → EnergyMeter capabilities (voltage, current, power, energy, …)

ESP32 #2
  → YF-S201            → WaterMeter (flow, volume)
  → DHT22              → EnvironmentSensor (temperature, humidity)
  → HC-SR501 PIR       → MotionSensor (motion)

ESP32 #3
  → 4-channel relay    → LightingController / switch (on_off)

Raspberry Pi
  → optional edge gateway / local MQTT bridge — not the SATU ATAP application server
```

Do not branch application code on SKU names (`pzem`, `yf-s201`). Map SKUs to capabilities in firmware, then publish the same MQTT payloads as `apps/iot-simulator`.
