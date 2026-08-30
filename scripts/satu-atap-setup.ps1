<#
  SATU ATAP - Setup dan Verifikasi Stack Live (P4) - v3
  =====================================================
  Jalankan lewat setup.bat, atau langsung:
      powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\satu-atap-setup.ps1 -FixBinding

  Opsi:
      -SkipSeed        lewati db:seed (password lama di generated/dev-passwords.json tetap dipakai)
      -FixBinding      buka port 1883 ke LAN dan bersihkan BOM di docker-compose.yml
      -NoSaveCreds     jangan salin kredensial ke firmware/secrets

  CATATAN UNTUK EDITOR: file ini sengaja ASCII murni. Windows PowerShell 5.1
  membaca .ps1 tanpa BOM sebagai Windows-1252, sehingga karakter non-ASCII
  merusak parser. Jangan tambahkan karakter di luar ASCII.
#>

[CmdletBinding()]
param(
  [switch]$SkipSeed,
  [switch]$FixBinding,
  [switch]$NoSaveCreds
)

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'

$Results = [ordered]@{}
$Notes   = New-Object System.Collections.Generic.List[string]

function Section([string]$n, [string]$title) {
  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor DarkGray
  Write-Host ("  " + $n + ". " + $title) -ForegroundColor Cyan
  Write-Host ("=" * 72) -ForegroundColor DarkGray
}

function Ok([string]$m)   { Write-Host ("  [ OK ]  " + $m) -ForegroundColor Green }
function Info([string]$m) { Write-Host ("          " + $m) -ForegroundColor Gray }
function Warn([string]$m) { Write-Host ("  [WARN]  " + $m) -ForegroundColor Yellow; $Notes.Add("WARN: " + $m) }
function Fail([string]$m) { Write-Host ("  [FAIL]  " + $m) -ForegroundColor Red;    $Notes.Add("FAIL: " + $m) }

function ShowLines([string]$text, [int]$max = 20) {
  if ([string]::IsNullOrWhiteSpace($text)) { Info "(kosong)"; return }
  $lines = @($text -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 })
  $i = 0
  foreach ($l in $lines) {
    if ($i -ge $max) { Info ("... (" + ($lines.Count - $max) + " baris lagi)"); break }
    Info ("  " + $l)
    $i++
  }
}

function WriteTextNoBom([string]$path, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Resolve-Path $path).Path, $text, $enc)
}

# SQL dikirim lewat STDIN, bukan lewat argumen -c.
# PowerShell 5.1 mencopoti tanda kutip ganda saat meneruskan argumen ke program
# eksternal, sehingga identifier seperti "Home" akan rusak jadi Home dan Postgres
# meng-fold-nya jadi huruf kecil. Lewat stdin tidak ada yang bisa dicopot.
function Psql([string]$sql) {
  $out = $sql | & docker compose exec -T postgres psql -U satuatap -d satuatap -t -A -F '|' 2>&1 | Out-String
  return [pscustomobject]@{ Code = $LASTEXITCODE; Text = $out.Trim() }
}

# Perintah di dalam container dijalankan lewat sh -c sebagai SATU argumen.
function InContainer([string]$service, [string]$shellCommand) {
  $out = & docker compose exec -T $service sh -c $shellCommand 2>&1 | Out-String
  return [pscustomobject]@{ Code = $LASTEXITCODE; Text = $out.Trim() }
}

# ---------------------------------------------------------------------------
Section '0' 'Prasyarat'
# ---------------------------------------------------------------------------

if (-not (Test-Path ".\package.json")) { Fail "Jalankan dari root repo Huni."; exit 1 }
Ok "Berada di root repo"

if ($null -eq (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker CLI tidak ada di PATH."; exit 1
}
& docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "Docker Desktop belum jalan. Nyalakan, tunggu siap, ulangi."; exit 1 }
Ok "Docker aktif"

# Bersihkan BOM yang mungkin ditinggalkan versi skrip sebelumnya.
$composePath = ".\docker-compose.yml"
$composeBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $composePath).Path)
if ($composeBytes.Length -ge 3 -and $composeBytes[0] -eq 0xEF -and $composeBytes[1] -eq 0xBB -and $composeBytes[2] -eq 0xBF) {
  if (-not $FixBinding) { Warn "docker-compose.yml punya BOM UTF-8. Jalankan dengan -FixBinding untuk membersihkan." }
  if ($FixBinding) {
    $txt = [System.IO.File]::ReadAllText((Resolve-Path $composePath).Path)
    if ($txt.Length -gt 0 -and $txt[0] -eq [char]0xFEFF) { $txt = $txt.Substring(1) }
    WriteTextNoBom $composePath $txt
    Ok "BOM dihapus dari docker-compose.yml"
  }
}

& docker compose up -d postgres 2>&1 | Out-Null
Start-Sleep -Seconds 4

# ---------------------------------------------------------------------------
Section '1' 'Seed database dan kredensial MQTT'
# ---------------------------------------------------------------------------

if ($SkipSeed) {
  Info "Dilewati (-SkipSeed). Password lama di generated/dev-passwords.json tetap berlaku."
}
else {
  Info "Menjalankan npm run db:seed."
  $seedOut = & npm run db:seed 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Fail "db:seed gagal:"
    ShowLines $seedOut 40
  }
  else {
    Ok "db:seed selesai"
    Info "Password TIDAK dicetak di sini. Ambil dari generated/dev-passwords.json bila perlu."
  }
}

# Kredensial plaintext dipelihara oleh seed di .secrets/, DI LUAR bind mount
# Mosquitto. Folder generated/ hanya boleh berisi passwd dan acl, supaya password
# mentah tidak ikut terbaca dari dalam container broker.
$devPwPath = ".\.secrets\mqtt-dev-passwords.json"
$devPw = $null
if (Test-Path $devPwPath) {
  try {
    $devPw = Get-Content $devPwPath -Raw | ConvertFrom-Json
    $count = ($devPw.PSObject.Properties | Measure-Object).Count
    Ok ("dev-passwords.json berisi " + $count + " kredensial")
    $Results['devPasswordCount'] = $count
  }
  catch {
    Fail "dev-passwords.json ada tapi tidak bisa dibaca sebagai JSON"
  }
}
else {
  Fail ("Tidak ada " + $devPwPath + ". Jalankan npm run db:seed tanpa -SkipSeed.")
}

if ($devPw -and -not $NoSaveCreds) {
  $secretDir = ".\firmware\secrets"
  New-Item -ItemType Directory -Force -Path $secretDir | Out-Null
  $lines = @("# Kredensial MQTT lokal untuk firmware ESP32. JANGAN di-commit.")
  foreach ($p in $devPw.PSObject.Properties) { $lines += ($p.Name + " = " + $p.Value) }
  Set-Content -Path (Join-Path $secretDir "mqtt-credentials.txt") -Value $lines -Encoding UTF8
  Ok "Disalin ke firmware\secrets\mqtt-credentials.txt"

  $gi = ".\.gitignore"
  $giBody = ""
  if (Test-Path $gi) { $giBody = Get-Content $gi -Raw }
  if ($giBody -notmatch 'firmware/secrets')                { Add-Content $gi "`nfirmware/secrets/`n" ; Ok "firmware/secrets/ ditambahkan ke .gitignore" }
  if ($giBody -notmatch 'infrastructure/mosquitto/generated') { Add-Content $gi "`ninfrastructure/mosquitto/generated/`n"; Ok "generated/ ditambahkan ke .gitignore" }
  if ($giBody -notmatch '\.secrets')                          { Add-Content $gi "`n.secrets/`n"; Ok ".secrets/ ditambahkan ke .gitignore" }
}

# ---------------------------------------------------------------------------
Section '2' 'Konfirmasi homeId dan 12 device'
# ---------------------------------------------------------------------------

$homeQ = Psql 'select id, name from "Home" order by id;'
if ($homeQ.Code -ne 0) { Fail "Query Home gagal:"; ShowLines $homeQ.Text 15 }
else {
  Write-Host "  Home:" -ForegroundColor White
  ShowLines $homeQ.Text 10
  $homeRows = @($homeQ.Text -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 })
  if ($homeRows.Count -gt 0) {
    $Results['homeId'] = ($homeRows[0] -split '\|')[0].Trim()
    Ok ("homeId utama: " + $Results['homeId'])
  }
}

$devQ = Psql 'select "nodeId", id, type from "Device" order by 1, 2;'
if ($devQ.Code -ne 0) { Fail "Query Device gagal:"; ShowLines $devQ.Text 15 }
else {
  $devRows = @($devQ.Text -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 })
  Write-Host "  Device:" -ForegroundColor White
  ShowLines $devQ.Text 15
  $Results['deviceCount'] = $devRows.Count
  if ($devRows.Count -eq 12) { Ok "12 device, sesuai P3" }
  else { Warn ("Jumlah device " + $devRows.Count + ", diharapkan 12") }
}

$brightQ = Psql 'select count(*) from "DeviceCapability" dc join "Device" d on d.id = dc."deviceId" where d.type = ''light'' and dc.capability = ''brightness'';'
if ($brightQ.Code -eq 0) {
  $Results['lightBrightnessCaps'] = $brightQ.Text.Trim()
  if ($brightQ.Text.Trim() -eq '0') { Ok "Tidak ada lampu dengan capability brightness. Benar." }
  else { Warn ($brightQ.Text.Trim() + " lampu masih punya capability brightness.") }
}

# ---------------------------------------------------------------------------
Section '3' 'Generate passwd/ACL dan restart broker'
# ---------------------------------------------------------------------------

# mqtt-users.ts menulis file penanda error ke passwd saat gagal, dan file itu
# kemudian memblokir mosquitto_passwd -c pada setiap run berikutnya. Hapus dulu
# supaya tidak terkunci di lingkaran kegagalan yang sama.
$passwdPath = ".\infrastructure\mosquitto\generated\passwd"
if (Test-Path $passwdPath) {
  $existing = Get-Content $passwdPath -Raw
  if ($existing -match '^\s*#') {
    Warn "passwd lama hanya berisi penanda error dari run yang gagal. Dihapus."
  } else {
    Info "passwd lama dihapus agar mosquitto_passwd -c bisa membuat ulang."
  }
  Remove-Item $passwdPath -Force
}

$mu = & npm run mqtt:users 2>&1 | Out-String
$muCode = $LASTEXITCODE

if (Test-Path $passwdPath) {
  $pwBody  = Get-Content $passwdPath -Raw
  $pwLines = @(Get-Content $passwdPath | Where-Object { $_.Trim().Length -gt 0 })
  if ($pwBody -match '^\s*#') {
    Fail "passwd masih berisi penanda error. Keluaran mqtt:users:"
    ShowLines $mu 30
    $Results['passwdStatus'] = 'PENANDA ERROR'
  }
  elseif ($pwLines.Count -ge 1 -and $pwBody -match '\$\d\$') {
    Ok ("passwd berisi " + $pwLines.Count + " kredensial ter-hash")
    $Results['passwdStatus'] = 'OK (' + $pwLines.Count + ' baris)'
  }
  else {
    Warn "passwd ada tapi isinya tidak terlihat seperti hash. Isi mentah:"
    ShowLines $pwBody 5
    $Results['passwdStatus'] = 'MERAGUKAN'
  }
}
else {
  Fail "passwd tidak dibuat. Keluaran mqtt:users:"
  ShowLines $mu 30
  $Results['passwdStatus'] = 'TIDAK ADA'
}

$aclPath = ".\infrastructure\mosquitto\generated\acl"
if (Test-Path $aclPath) { Ok ("acl ada, " + (Get-Item $aclPath).Length + " byte") }
else { Fail "acl tidak dibuat" }

# Cocokkan konfigurasi broker dengan mount compose supaya salah path ketahuan.
$confBody = Get-Content ".\infrastructure\mosquitto\mosquitto.conf" -Raw
$composeBody = Get-Content $composePath -Raw
$pwLine = ($confBody -split "`r?`n" | Where-Object { $_ -match '^\s*password_file' })
Info ("mosquitto.conf: " + ($pwLine -join ' '))
$mountLine = ($composeBody -split "`r?`n" | Where-Object { $_ -match 'generated:' })
Info ("compose mount : " + ($mountLine -join ' '))

# mosquitto_passwd membuat file dengan mode 0600 milik root. Itu benar secara
# keamanan, tapi broker berjalan sebagai user mosquitto (uid 1883), sehingga ia
# tidak bisa membacanya dan gagal start dengan "Unable to open pwfile".
# Longgarkan ke 0644 lewat container, karena chmod dari sisi Windows tidak
# diterjemahkan ke mode POSIX di dalam mount.
if (Test-Path $passwdPath) {
  $genAbs = (Resolve-Path ".\infrastructure\mosquitto\generated").Path -replace '\\', '/'
  & docker run --rm -v ("" + $genAbs + ":/x") eclipse-mosquitto:2 chmod 0644 /x/passwd 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Ok "Mode passwd disetel 0644 agar terbaca oleh user mosquitto" }
  else { Warn "Gagal menyetel mode passwd. Broker mungkin tidak bisa membacanya." }
}

# WAJIB --force-recreate. Mosquitto membaca password_file HANYA saat start, dan
# `docker compose up -d` pada container yang sudah jalan dengan definisi yang tidak
# berubah adalah no-op. Tanpa ini, broker tetap memakai tabel password lama (atau
# kosong) meski passwd di disk sudah diperbarui, dan semua login ditolak dengan
# CONNACK 5 seolah-olah kredensialnya salah.
& docker compose up -d --force-recreate mosquitto 2>&1 | Out-Null
Start-Sleep -Seconds 5
# Container baru, jadi seluruh isi log ini memang milik start yang barusan.
$mLog = & docker compose logs --tail=25 mosquitto 2>&1 | Out-String
Write-Host "  Log Mosquitto:" -ForegroundColor White
ShowLines $mLog 15

$mErrLines = @($mLog -split "`r?`n" | Where-Object { $_ -match 'Unable to open|Error|error found|Invalid|Warning' })
if ($mErrLines.Count -gt 0) {
  Fail "Mosquitto melaporkan error saat start."
  $Results['mosquittoStart'] = 'ERROR'
  # Diagnosis ikut masuk ringkasan. Kalau hanya ringkasan yang ditempel, penyebabnya
  # tetap terbaca tanpa perlu menempel seluruh log.
  $joined = ($mErrLines | Select-Object -First 4) -join ' || '
  $Results['mosquittoError'] = $joined
}
else {
  Ok "Mosquitto start tanpa error"
  $Results['mosquittoStart'] = 'OK'
}

# ---------------------------------------------------------------------------
Section '4' 'Uji autentikasi dan ACL'
# ---------------------------------------------------------------------------

$pw = $null
if ($devPw -and $devPw.PSObject.Properties['energy-main']) {
  $pw = $devPw.'energy-main'
  Ok "Password energy-main diambil otomatis dari dev-passwords.json"
}
else {
  $pw = Read-Host "  Tempel password energy-main (Enter untuk melewati)"
}

if ([string]::IsNullOrWhiteSpace($pw)) { Warn "Uji autentikasi dilewati." }
elseif ($pw -match "'") { Warn "Password memuat kutip tunggal, uji dilewati." }
elseif ($Results['mosquittoStart'] -ne 'OK') { Warn "Mosquitto tidak sehat, uji dilewati." }
else {
  $hid = 'home-1'
  if ($Results['homeId']) { $hid = $Results['homeId'] }
  $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $payload = '{"ts":"' + $ts + '","metrics":{"voltage":220.4,"current":2.13,"power":469.4,"energy_kwh":148.25,"frequency":50.0,"power_factor":0.92}}'
  $tOwn   = "home/$hid/device/energy-main/telemetry"
  $tOther = "home/$hid/device/light-living-room/command"

  $a = InContainer 'mosquitto' "mosquitto_pub -h localhost -u energy-main -P '$pw' -t '$tOwn' -m '$payload'"
  if ($a.Code -eq 0) {
    Ok "4a publish ke topic sendiri: BERHASIL (benar)"
    $Results['test_4a_own_publish'] = 'BERHASIL'
  }
  elseif ($a.Code -eq 5) {
    # Exit 5 = CONNACK "not authorised". Koneksinya sendiri ditolak, jadi ini soal
    # autentikasi, bukan izin topic. Penyebab paling sering: broker belum membaca
    # ulang passwd setelah diregenerasi.
    Fail "4a DITOLAK saat CONNECT (exit 5) - ini autentikasi, bukan ACL."
    Info "Broker kemungkinan belum memuat passwd yang baru. Coba:"
    Info "  docker compose up -d --force-recreate mosquitto"
    ShowLines $a.Text 8
    $Results['test_4a_own_publish'] = 'DITOLAK saat CONNECT (auth, bukan ACL)'
  }
  else {
    Fail ("4a publish ke topic sendiri DITOLAK (exit " + $a.Code + "):")
    ShowLines $a.Text 8
    $Results['test_4a_own_publish'] = ('DITOLAK exit ' + $a.Code)
  }

  # 4b - uji ACL dengan MENGAMATI AKIBATNYA, bukan menanyai pelakunya.
  #
  # Kenapa tidak cukup melihat exit code mosquitto_pub: di MQTT 3.1.1, publish yang
  # ditolak ACL dibuang diam-diam oleh broker. Klien tetap menerima PUBACK dan keluar
  # dengan kode 0, persis seperti publish yang diterima. Exit code tidak bisa
  # membedakan keduanya, jadi tes berbasis exit code selalu lolos dan tidak menguji
  # apa pun.
  #
  # Yang dilakukan di sini: akun gateway (berhak membaca semua topic) dipasang sebagai
  # saksi pada topic perintah lampu. Lalu energy-main mencoba menulis ke topic itu.
  # Kalau ACL bekerja, saksi tidak menerima apa pun.
  $gwPw = $env:MQTT_PASSWORD
  if ([string]::IsNullOrWhiteSpace($gwPw)) { $gwPw = 'local-dev-mqtt-gateway' }

  $probe = "mosquitto_sub -h localhost -u gateway -P '$gwPw' -t '$tOther' -W 5 -C 1 > /tmp/probe.txt 2>&1 & " +
           "sleep 1; " +
           "mosquitto_pub -h localhost -u energy-main -P '$pw' -t '$tOther' -m PROBE-ACL; " +
           "sleep 4; " +
           "cat /tmp/probe.txt"
  $b = InContainer 'mosquitto' $probe
  $seen = $b.Text

  if ($seen -match 'PROBE-ACL') {
    Fail "4b ACL BOCOR: energy-main berhasil menulis ke topic perintah lampu."
    Info "Sensor yang dikompromikan bisa menyalakan lampu. Periksa acl_file dan blok user di dalamnya."
    $Results['test_4b_acl_cross_publish'] = 'BOCOR - pesan sampai ke saksi'
  }
  elseif ($seen -match 'Connection Refused|not authori') {
    Warn "4b tidak konklusif: akun saksi (gateway) tidak bisa connect."
    ShowLines $seen 8
    $Results['test_4b_acl_cross_publish'] = 'TIDAK KONKLUSIF - saksi gagal connect'
  }
  else {
    Ok "4b ACL bekerja: publish silang dibuang broker, saksi tidak menerima apa pun."
    $Results['test_4b_acl_cross_publish'] = 'DIBLOKIR (benar)'
  }

  # 4c - kontrol positif. Tanpa ini, hasil 4b tidak berarti: kalau saksi memang tidak
  # pernah bisa menerima apa pun, "tidak menerima" bukan bukti ACL bekerja.
  $ctrl = "mosquitto_sub -h localhost -u gateway -P '$gwPw' -t '$tOwn' -W 5 -C 1 > /tmp/ctrl.txt 2>&1 & " +
          "sleep 1; " +
          "mosquitto_pub -h localhost -u energy-main -P '$pw' -t '$tOwn' -m PROBE-OK; " +
          "sleep 4; " +
          "cat /tmp/ctrl.txt"
  $c = InContainer 'mosquitto' $ctrl
  if ($c.Text -match 'PROBE-OK') {
    Ok "4c kontrol positif: jalur yang diizinkan memang sampai ke saksi."
    $Results['test_4c_control_allowed_path'] = 'SAMPAI (benar)'
  }
  else {
    Warn "4c kontrol positif GAGAL. Hasil 4b jadi tidak bisa dipercaya."
    ShowLines $c.Text 8
    $Results['test_4c_control_allowed_path'] = 'TIDAK SAMPAI - 4b tidak valid'
  }

  $d = InContainer 'mosquitto' "mosquitto_pub -h localhost -u energy-main -P 'password-yang-salah' -t '$tOwn' -m x"
  if ($d.Code -ne 0) { Ok "4d password salah: DITOLAK (benar)"; $Results['test_4d_bad_password'] = 'DITOLAK' }
  else { Fail "4d password salah DITERIMA. allow_anonymous mungkin masih true."; $Results['test_4d_bad_password'] = 'DITERIMA (BAHAYA)' }
}

# ---------------------------------------------------------------------------
Section '5' 'Jangkauan broker dari LAN'
# ---------------------------------------------------------------------------

$composeBody = Get-Content $composePath -Raw
if ($composeBody -match '127\.0\.0\.1:1883:1883') {
  Warn "Port 1883 terikat ke 127.0.0.1. ESP32 di WiFi TIDAK bisa masuk."
  $Results['mqttBinding'] = 'tertutup'
  if ($FixBinding) {
    $new = $composeBody -replace '127\.0\.0\.1:1883:1883', '1883:1883'
    WriteTextNoBom $composePath $new
    & docker compose up -d mosquitto 2>&1 | Out-Null
    Ok "Binding dibuka ke 1883:1883"
    $Results['mqttBinding'] = 'dibuka'
  }
}
else {
  Ok "Port 1883 terbuka ke LAN"
  $Results['mqttBinding'] = 'terbuka'
}

$ips = @()
try {
  $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
           Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
           Select-Object InterfaceAlias, IPAddress)
}
catch { }
Write-Host "  Antarmuka IPv4:" -ForegroundColor White
$ipSummary = @()
foreach ($ip in $ips) {
  Info ("  " + $ip.IPAddress + "   (" + $ip.InterfaceAlias + ")")
  $ipSummary += ($ip.IPAddress + " [" + $ip.InterfaceAlias + "]")
}
$Results['lanIPs'] = ($ipSummary -join ' ; ')
Info "Pakai IP dari antarmuka yang satu jaringan dengan ESP32."

$fw = $null
try { $fw = Get-NetFirewallRule -DisplayName "*1883*" -ErrorAction SilentlyContinue } catch { }
if ($fw) { Ok "Ada aturan firewall untuk 1883"; $Results['firewall1883'] = 'ADA' }
else {
  Warn "Belum ada aturan firewall untuk 1883. Sebagai Administrator, jalankan:"
  Info 'New-NetFirewallRule -DisplayName "MQTT 1883 Satu Atap dev" -Direction Inbound -Protocol TCP -LocalPort 1883 -Profile Private -Action Allow'
  $Results['firewall1883'] = 'TIDAK ADA'
}

# ---------------------------------------------------------------------------
Section '6' 'Ringkasan - tempel bagian ini ke chat'
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "----- SALIN MULAI DARI SINI -----" -ForegroundColor Yellow
Write-Host "SATU ATAP setup report v8"
foreach ($k in $Results.Keys) {
  $v = [string]$Results[$k]
  if ($v.Length -gt 300) { $v = $v.Substring(0, 300) + " ...(dipotong)" }
  Write-Host ($k + " = " + $v)
}
Write-Host ""
Write-Host "Catatan:"
if ($Notes.Count -eq 0) { Write-Host "  (bersih)" } else { foreach ($n in $Notes) { Write-Host ("  " + $n) } }
Write-Host "----- SALIN SAMPAI SINI -----" -ForegroundColor Yellow

Write-Host ""
Write-Host "Tidak ada password di ringkasan. Aman ditempel." -ForegroundColor Green
Write-Host "Terakhir: buka http://localhost:3000/energy dan pastikan angkanya bergerak." -ForegroundColor Cyan
