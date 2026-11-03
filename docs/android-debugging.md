# Android Debugging & Deployment Guide

This guide covers the tools, commands, and workflows for debugging and deploying the ung-do Android app.

## Prerequisites

### Java JDK 21
```bash
# Download from Adoptium
wget -q https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse -O /tmp/jdk.tar.gz
tar -xzf /tmp/jdk.tar.gz -C /tmp
mv /tmp/jdk-* ~/jdk-21

# Set environment variables
export JAVA_HOME=~/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

### Android SDK
```bash
# Download command-line tools
mkdir -p ~/Android/Sdk/cmdline-tools/latest
cd ~/Android/Sdk/cmdline-tools/latest
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
unzip -q cmdline-tools.zip
rm cmdline-tools.zip

# Move contents up one level (unzip creates nested cmdline-tools/)
mv cmdline-tools/* . 2>/dev/null
rm -rf cmdline-tools

# Install required packages
export ANDROID_HOME=~/Android/Sdk
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

### Configure Project
```bash
# Create local.properties
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
```

## Build & Deploy Workflow

### 1. Build Web Assets
```bash
npm run build
```

### 2. Sync to Android
```bash
npm run cap:sync
```

### 3. Build APK
```bash
export JAVA_HOME=~/jdk-21
export ANDROID_HOME=~/Android/Sdk
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Install on Device
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### 5. Launch App
```bash
adb shell am start -n com.ungdo.app/.MainActivity
```

## ADB Commands Reference

### Device Management
```bash
adb devices                    # List connected devices
adb reconnect                  # Reconnect all devices
adb tcpip 5555                 # Enable wireless debugging on port 5555
adb connect <ip>:5555          # Connect to device over WiFi
adb usb                        # Switch back to USB debugging
```

### App Management
```bash
adb shell pm list packages | grep ungdo   # Check if app is installed
adb shell am force-stop com.ungdo.app     # Force stop app
adb shell pm clear com.ungdo.app          # Clear app data
adb uninstall com.ungdo.app               # Uninstall app
```

### File Operations
```bash
adb push <local> <remote>      # Copy file to device
adb pull <remote> <local>      # Copy file from device
adb shell ls /sdcard/          # List device files
```

### Logs & Debugging
```bash
adb logcat                     # View all logs
adb logcat -s TagName          # Filter by tag
adb logcat -c                  # Clear logs
adb logcat | grep "ung-do"     # Filter by text
adb bugreport                  # Generate full bug report
```

### Screenshots & Recording
```bash
adb shell screencap -p > screenshot.png       # Take screenshot
adb shell screenrecord /sdcard/video.mp4      # Start recording
adb pull /sdcard/video.mp4                    # Pull recording
```

## Wireless Debugging Setup

1. On device: Settings → Developer options → Wireless debugging
2. Enable "Pair device with pairing code"
3. Note the IP address and port
4. From computer:
```bash
adb pair <ip>:<port>
# Enter pairing code shown on device
adb connect <ip>:<port>
```

## Common Issues & Solutions

### "No valid Android SDK root found"
```bash
export ANDROID_HOME=~/Android/Sdk
# Or create android/local.properties with: sdk.dir=/path/to/sdk
```

### "JAVA_HOME not set"
```bash
export JAVA_HOME=~/jdk-21
export PATH=$JAVA_HOME/bin:$PATH
```

### App not appearing on device
- Check `adb devices` shows your device
- Try `adb install -r -d` (allow version downgrade)
- Check logs: `adb logcat | grep PackageManager`

### Build fails with Gradle errors
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### Permission denied errors
```bash
chmod +x android/gradlew
chmod +x ~/Android/Sdk/cmdline-tools/latest/bin/*
```

## Notification Debugging

### Check scheduled notifications
```bash
adb shell dumpsys notification | grep -A 5 "ung-do"
```

### Test notification permission
```bash
adb shell appops get com.ungdo.app POST_NOTIFICATIONS
```

### Grant notification permission
```bash
adb shell appops set com.ungdo.app POST_NOTIFICATIONS allow
```

## Environment Variables (add to ~/.bashrc)
```bash
export JAVA_HOME=~/jdk-21
export ANDROID_HOME=~/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
```
