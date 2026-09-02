# SATU ATAP — Rencana POC (2 Miniatur Bangunan)

Tujuan: demo ke klien dengan **dua miniatur gedung**, memperlihatkan Satu Atap sebagai
**satu platform untuk seluruh gedung** — bukan sekadar dashboard IoT. Dua pilar harus
siap saat hari-H:

1. **Pilar IoT / Utilitas** — monitoring listrik, air, lingkungan, kontrol lampu/aktuator,
   biaya Rupiah, alert, otomasi, dan **ketahanan saat internet putus** (edge/Pi).
2. **Pilar Komunitas / Commerce** — penghuni pesan makanan/jajan/air → **kios lantai bawah
   antar** ke unit → bayar **QRIS (simulasi) / cash**; plus fitur komunitas (pengumuman,
   tamu, laporan) dan rewards.

Kedua pilar berjalan di atas hierarki yang sudah ada: `Organization → Site → Building →
Floor → Home(unit)`.

---

## Status sekarang (baseline)

**Sudah jadi & ter-backend:** stack IoT penuh (API + Postgres + MQTT), 3 tipe node ESP32
(energy 2×PZEM, water-env 6 sensor, lighting), **akun MQTT per-node**, edge gateway offline
(outbox SQLite + sync), model multi-tenant lengkap, tarif/biaya (`UtilityConfig`, IDR),
alert+threshold, otomasi, AI insights, halaman building/community. Node **energy sudah
di-flash & online di hardware**.

**Masih mock (UI ada, backend belum):** marketplace, cart, orders, payments, store, services,
rewards — semua dari `@/data/mock`. **Tidak ada** model `Order/Product/Vendor/Payment`. QRIS
belum ada.

**Gap utama untuk POC:** (a) Gedung-2/home-2 belum punya device/node (baru rangka); (b) belum
ada switcher gedung / tampilan banding; (c) commerce belum nyata; (d) ketahanan-offline belum
kelihatan sebagai momen demo.

---

## Topologi POC (usulan — perlu konfirmasi)

| Miniatur | Building | Unit (Home) | Node IoT | Kios |
| -------- | -------- | ----------- | -------- | ---- |
| Gedung A | `building-1` "Gedung A" | `home-1` (mis. Unit 9A, lantai 9) | esp32-energy-001, -water-env-001, -lighting-001 | kios-a (lantai 1) |
| Gedung B | `building-2` "Gedung B" | `home-2` (mis. Unit 3B, lantai 3) | esp32-energy-002, -water-env-002, -lighting-002 | kios-b (lantai 1) |

Tiap gedung punya beberapa lantai (mis. 1–10) supaya cerita "lantai 9 pesan → kios lantai 1
antar" terdemonstrasi; unit yang dipakai demo cukup 1–2 per gedung. **Keputusan hardware yang
memengaruhi seed & firmware:** berapa board ESP32 per miniatur (1, 2, atau 3 node)? Device
tetap di-seed penuh; hardware mengisi sesuai yang terpasang (seperti home-1 sekarang).

---

## Rencana per fase

### Fase 1 — Fondasi (melayani 2 pilar): Gedung-2 nyata
- Seed `building-2` + lantai; pasang `home-2` ke building/floor.
- Seed node + device home-2 (mirror home-1, id ber-suffix `-002` / `-b`) + `NodeCredential`.
- (Opsi) simulator bisa diarahkan ke home-2 untuk demo tanpa nunggu semua hardware.

### Fase 2 — Commerce backend
- Model `Vendor` (kios, discope per building) + `Product` + `Order` (+ `OrderItem`) +
  status `PLACED → PREPARING → DELIVERING → COMPLETED`.
- API: list produk (per gedung), buat order, ubah status, riwayat.
- Wire UI mock (marketplace/cart/orders) ke API. Routing order by `floor/unit`.
- Pembayaran: **QRIS simulasi** (tampilkan QR → tandai paid) + **cash (COD)**.

### Fase 3 — Layar kios (sisi vendor)
- View pemenuhan: order masuk real-time → siapkan → tandai diantar.
- Demo dua layar: app penghuni ↔ layar kios.

### Fase 4 — Polish demo
- Switcher gedung (Gedung A/B) + halaman banding A↔B (energy/air/biaya/alert).
- Indikator ketahanan-offline: `Cloud: OFFLINE — N data dibuffer` → sync saat online.
- Poin rewards saat order (loop komunitas).

### Fase 5 — Hardware
- Flash node Gedung-2 (arahkan ke home-2).
- Aktuator: lighting (relay 4ch), **kunci pintu solenoid**, **keran solenoid** (relay + 12V +
  dioda flyback). Keputusan: door lock fail-safe/secure; unlock jalan offline via Pi; keran
  fail-closed + auto-tutup saat bocor.

---

## Kebutuhan hardware (perkiraan, per POC)

- ESP32 dev board: sampai **6** (3 node × 2 gedung) — minimal 2 (1 node/gedung) untuk demo tipis.
- Per gedung: 2× PZEM-004T (+CT), 2× YF-S201, 2× DHT22, 2× HC-SR501, 1× relay 4ch (lampu),
  relay + solenoid lock + solenoid valve + PSU 12V + dioda flyback.
- Raspberry Pi 5 (edge, opsional untuk demo offline yang meyakinkan) — jalankan Mosquitto +
  iot-gateway; arahkan `MQTT_HOST` firmware ke IP Pi.
- Tablet/kiosk untuk menampilkan dashboard & layar kios.

## Catatan pembayaran (penting)
QRIS asli butuh payment gateway (Midtrans/Xendit) + registrasi merchant + uang nyata/KYC/
regulasi → **fase produksi, bukan POC**. Untuk POC pakai **QRIS simulasi/sandbox**; kredensial
pembayaran asli tidak dipasang.

## Skrip demo (narasi pitch)
1. Buka dashboard Gedung A → listrik/air live, biaya Rupiah, semua node online.
2. Switch ke Gedung B → banding konsumsi & biaya dua gedung dari satu layar.
3. **Cabut internet** → gedung tetap jalan (dashboard lokal, otomasi tetap nyala) → colok →
   data tersinkron. (Pembeda utama.)
4. Picu skenario: bocor air → keran auto-tutup + alert; gerak → lampu nyala.
5. Penghuni "lantai 9" pesan air/jajan → order muncul di **layar kios** → bayar QRIS simulasi →
   status jalan sampai "diantar". Dapat poin rewards.

## Keputusan terbuka
- Jumlah board ESP32 per miniatur (memengaruhi Fase 1 & 5).
- Granularitas topologi (berapa lantai/unit yang di-seed untuk demo routing).
- Pakai Pi 5 untuk demo offline, atau laptop dulu.
