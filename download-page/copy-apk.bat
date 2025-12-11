@echo off
REM Copy APK to download-page folder for deployment

echo 📦 Copying APK to download-page folder...

set "APK_SOURCE=..\android\app\build\outputs\apk\debug\app-debug.apk"
set "APK_DEST=apk\hatod.apk"

if exist "%APK_SOURCE%" (
    copy /Y "%APK_SOURCE%" "%APK_DEST%"
    if %ERRORLEVEL% EQU 0 (
        echo ✅ APK copied successfully to download-page\apk\hatod.apk
        echo.
        echo The APK is now ready for deployment!
    ) else (
        echo ❌ Failed to copy APK!
        exit /b 1
    )
) else (
    echo ❌ APK not found at: %APK_SOURCE%
    echo Please build the APK first using: npm run apk:build
    exit /b 1
)


