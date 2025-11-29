#!/bin/bash
# Build Android APK from command line

echo "🔨 Building Android APK..."

cd android

# Build debug APK
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ APK built successfully!"
    echo "📱 Location: android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "To install on your device:"
    echo "  adb install android/app/build/outputs/apk/debug/app-debug.apk"
else
    echo "❌ Build failed!"
    exit 1
fi

