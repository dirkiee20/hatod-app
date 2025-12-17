#!/bin/bash
# Copy APK to download-page folder for deployment

echo "📦 Copying APK to download-page folder..."

APK_SOURCE="../android/app/build/outputs/apk/debug/app-debug.apk"
APK_DEST="apk/hatod.apk"

if [ -f "$APK_SOURCE" ]; then
    cp "$APK_SOURCE" "$APK_DEST"
    if [ $? -eq 0 ]; then
        echo "✅ APK copied successfully to download-page/apk/hatod.apk"
        echo ""
        echo "The APK is now ready for deployment!"
    else
        echo "❌ Failed to copy APK!"
        exit 1
    fi
else
    echo "❌ APK not found at: $APK_SOURCE"
    echo "Please build the APK first using: npm run apk:build"
    exit 1
fi
















