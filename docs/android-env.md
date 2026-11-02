# Android Build Environment

## SDK and JDK Locations

- **Android SDK**: `/home/charles/android-sdk`
- **JDK 17**: `/home/charles/jdk-17`
- **JDK 21**: `/home/charles/jdk-21.0.2+13` (required for Android builds)
- **ADB**: `/home/charles/android-sdk/platform-tools/adb`

## Environment Variables

```bash
export ANDROID_HOME=/home/charles/android-sdk
export JAVA_HOME=/home/charles/jdk-21.0.2+13
```

## Build Commands

```bash
# Sync web assets to Android
npm run cap:sync

# Build and deploy to emulator
npm run cap:run
```

## Notes

- JDK 21 is required (JDK 17 fails with "invalid source release: 21")
- Emulator device ID: `cd0e35c0`
- Package name: `com.ungdo.app`
