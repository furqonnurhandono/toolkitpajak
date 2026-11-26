@echo off
rem Toolkit Pajak - pasang add-in Word & Excel (Windows)
rem Klik dua kali file ini. Tidak perlu hak admin.
setlocal
set "DIR=%LOCALAPPDATA%\ToolkitPajak"
if not exist "%DIR%" mkdir "%DIR%"
if exist "%~dp0manifest.xml" (
  copy /Y "%~dp0manifest.xml" "%DIR%\manifest.xml" >nul || goto gagal
) else (
  echo Mengunduh manifest.xml ...
  curl -fsSL -o "%DIR%\manifest.xml" "https://furqonnurhandono.github.io/toolkitpajak/addin/manifest.xml" || goto gagal
)
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\Developer" /v "3a0e1e62-ba39-4f65-8158-0fc68111938a" /t REG_SZ /d "%DIR%\manifest.xml" /f >nul || goto gagal
echo.
echo Toolkit Pajak sudah terpasang.
echo Tutup SEMUA jendela Word dan Excel, lalu buka lagi.
echo Tombol "Kutip UU" ada di tab Home.
echo.
pause
exit /b 0
:gagal
echo.
echo Pemasangan gagal. Kemungkinan dibatasi kebijakan TIK di komputer ini.
echo.
pause
exit /b 1
