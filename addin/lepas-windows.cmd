@echo off
rem Toolkit Pajak - lepas add-in Word & Excel (Windows)
reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\Developer" /v "3a0e1e62-ba39-4f65-8158-0fc68111938a" /f >nul 2>&1
if exist "%LOCALAPPDATA%\ToolkitPajak\manifest.xml" del "%LOCALAPPDATA%\ToolkitPajak\manifest.xml"
echo Toolkit Pajak sudah dilepas. Tutup dan buka lagi Word dan Excel.
pause
