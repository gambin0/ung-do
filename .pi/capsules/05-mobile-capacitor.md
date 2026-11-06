# Domain Capsule: Mobile & Capacitor

Capacitor 8 wraps the Angular build for **Android only**. There is no `ios/`
platform in this repo; adding one would need `npx cap add ios` and a Mac.

## Configuration (`capacitor.config.ts`)

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ungdo.app',
  appName: 'Ung Do',
  webDir: 'dist/ung-do/browser',
};
```

Plugins in use: `@capacitor/local-notifications` (reminders). Push
notifications are not used.

## Platform detection

```typescript
import { Capacitor } from '@capacitor/core';

const isMobile = ['android', 'ios'].includes(Capacitor.getPlatform());
```

## Build & install (Android)

```bash
npm run build
npm run cap:sync
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Run `npm run cap:sync` after adding or removing a Capacitor plugin so the
Gradle files stay in sync. See `docs/android-debugging.md` and the
`android-build-deploy` skill for troubleshooting.

### Useful ADB commands

```bash
adb devices
adb logcat                                          # console.log shows up here
adb shell am start -n com.ungdo.app/.MainActivity   # launch the app
```

Debug the WebView with Chrome DevTools at `chrome://inspect`.

## Mobile UX

- Drag-and-drop reordering uses Pointer Events with pointer capture on the
  handle (`touch-action: none`), so it works with touch and mouse.
- Touch targets are at least 34–36px.
- `@media (hover: none)` reveals controls that are hover-only on desktop.
- Below 600px (`todo-item.scss`, `_screen.scss`) the native due-date input is
  visually hidden and a button opens the picker instead.
- `inputmode="numeric"` on quantity fields.
- Layout: `.page` uses `min-height: 100dvh`; `.shell` caps width at 560px.

## Permissions

- `INTERNET` is declared in `AndroidManifest.xml`.
- Notification permission (Android 13+) is requested at runtime the first time
  a due date is set (`NotificationService.requestPermission()`).
