@echo off
setlocal
cd /d "%~dp0"

rem cloudflared terpasang lewat winget; PATH belum tentu sudah terisi.
set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if not exist "%CF%" set "CF=cloudflared"

rem Nyalakan dev server kalau port 3100 belum dipakai.
netstat -ano | findstr ":3100" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo Menyalakan dev server di port 3100...
  start "Hostlive dev" cmd /k npm run dev
  timeout /t 5 /nobreak >nul
)

echo Membuka tunnel Cloudflare ke http://localhost:3100 ...
echo URL publik muncul di baris "trycloudflare.com" di bawah. Ctrl+C untuk berhenti.
"%CF%" tunnel --url http://localhost:3100 --no-autoupdate

pause
