@echo off
REM Build APK and copy to download-page folder

echo 🔨 Building Android APK...
echo.

REM Build the APK
call npm run apk:build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 📦 Copying APK to download-page folder...
    
    set "APK_SOURCE=android\app\build\outputs\apk\debug\app-debug.apk"
    set "APK_DEST=download-page\apk\hatod.apk"
    
    if exist "%APK_SOURCE%" (
        copy /Y "%APK_SOURCE%" "%APK_DEST%"
        if %ERRORLEVEL% EQU 0 (
            echo.
            echo ✅ Success! APK built and copied to download-page\apk\hatod.apk
            echo 📱 Ready for deployment to Railway!
        ) else (
            echo ❌ Failed to copy APK!
            exit /b 1
        )
    ) else (
        echo ❌ APK not found after build!
        exit /b 1
    )
) else (
    echo ❌ APK build failed!
    exit /b 1
)

















