@echo off
REM Build Android APK from command line (Windows)

echo 🔨 Building Android APK...

cd android

REM Build debug APK
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ APK built successfully!
    echo 📱 Location: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo To install on your device:
    echo   adb install android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo ❌ Build failed!
    exit /b 1
)

