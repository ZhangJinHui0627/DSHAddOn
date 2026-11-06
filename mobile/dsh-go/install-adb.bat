@echo off
chcp 65001 >nul
cd /d "%~dp0"

if "%~1"=="" (
  set "APK=dsh-go-arm64.apk"
) else (
  set "APK=%~1"
)

if not exist "%APK%" (
  echo APK not found: %APK%
  echo Put the DSH Go APK next to this script, or pass its path:
  echo   install-adb.bat path\to\dsh-go-arm64.apk
  pause
  exit /b 1
)

echo Waiting for an Android device over USB / wireless adb...
adb wait-for-device
echo Installing %APK% ...
adb install -r "%APK%"
if errorlevel 1 (
  echo Install returned an error. Check the adb output above.
) else (
  echo Verifying installed package...
  adb shell pm list packages | findstr /i "dsh"
  echo Done.
)
pause
