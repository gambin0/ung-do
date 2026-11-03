---
name: android-build-deploy
description: Build the ung-do Android app and deploy to connected phone via ADB. Use when the user wants to test changes on their Android device.
allowed-tools: Bash(npm:*)
license: MIT
compatibility: Requires Java JDK 21, Android SDK, and ADB with connected device.
metadata:
  author: ung-do
  version: "1.0"
---

Build and deploy the ung-do Android app to a connected phone.

**Steps**

1. **Build web assets**
   ```bash
   npm run build
   ```

2. **Sync to Android**
   ```bash
   npm run cap:sync
   ```

3. **Build APK**
   ```bash
   export JAVA_HOME=/home/charles/jdk-21
   export ANDROID_HOME=/home/charles/Android/Sdk
   cd android
   ./gradlew assembleDebug
   ```

4. **Install on device**
   If installation fails with signature mismatch, uninstall first:
   ```bash
   adb uninstall com.ungdo.app
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

5. **Launch app**
   ```bash
   adb shell am start -n com.ungdo.app/.MainActivity
   ```

**Environment Variables**
- `JAVA_HOME=/home/charles/jdk-21`
- `ANDROID_HOME=/home/charles/Android/Sdk`

**Troubleshooting**
- "JAVA_HOME not set" - Export JAVA_HOME as above
- "INSTALL_FAILED_UPDATE_INCOMPATIBLE" - Uninstall existing app first
- "adb: device not found" - Check USB connection and USB debugging
