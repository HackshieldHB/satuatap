@echo off
REM ---------------------------------------------------------------------------
REM  SATU ATAP - Setup & Verifikasi Stack Live
REM
REM  Klik dua kali file ini, atau jalankan dari terminal:
REM      setup.bat
REM
REM  Isinya cuma memanggil scripts\satu-atap-setup.ps1 dengan ExecutionPolicy
REM  yang dilonggarkan untuk satu proses ini saja - setelan PowerShell di mesin
REM  lo tidak diubah.
REM ---------------------------------------------------------------------------

cd /d "%~dp0"

if not exist "scripts\satu-atap-setup.ps1" (
  echo.
  echo   scripts\satu-atap-setup.ps1 tidak ditemukan.
  echo   Jalankan setup.bat dari root repo Huni.
  echo.
  pause
  exit /b 1
)

echo.
echo   Menjalankan setup Satu Atap...
echo   Jendela ini akan tetap terbuka setelah selesai supaya ringkasannya bisa disalin.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\satu-atap-setup.ps1" -FixBinding

echo.
echo   ---------------------------------------------------------------------
echo   Selesai. Salin blok ringkasan di atas (di antara dua penanda kuning),
echo   lalu tempel ke chat.
echo   ---------------------------------------------------------------------
echo.
pause
