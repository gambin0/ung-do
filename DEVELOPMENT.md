# Development Setup

## Prerequisites

- **Node.js** 18+ and npm
- **Java JDK** 21 (required for Android builds)
- **Android SDK** (required for Android builds)
- **Firebase** account (for backend)

## Quick Start (Web Only)

```bash
# Install dependencies
npm install

# Start the web UI
npm run dev
```

Open http://localhost:4200

## Android Development

### Environment Variables

Set these before building for Android:

```bash
export ANDROID_HOME=/path/to/android-sdk
export JAVA_HOME=/path/to/jdk-21
```

### Build and Run

```bash
# Build web assets
npm run build

# Sync to Android project
npm run cap:sync

# Build and deploy to emulator/device
npm run cap:run
```

### Debugging & Deployment

For detailed ADB commands, wireless debugging setup, and troubleshooting, see [docs/android-debugging.md](docs/android-debugging.md).

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore database
3. Create a web app in Firebase and copy the config
4. Update `src/app/firebase.config.ts` with your config
5. Enable **Authentication → Sign-in method → Email/Password**
6. Under **Authentication → Users**, add your account and copy its **User UID**
7. Put that UID in `firestore.rules` (the `isOwner()` check)
8. Deploy the rules (or paste them into **Firestore → Rules** in the console):

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules
   ```

### Security model

The Firebase web config in `firebase.config.ts` is public by design; access is
controlled by `firestore.rules`. Only the single owner UID can read or write
`todos`. Anyone can create an email/password account through the Firebase API,
so the rules check the UID, not just "signed in". There is no in-app sign-up.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start web UI on :4200 |
| `npm run build` | Build web assets |
| `npm run test` | Run unit tests |
| `npm run cap:sync` | Sync web assets to Android |
| `npm run cap:run` | Build and deploy to Android |

## Architecture

- **Frontend**: Angular 22 with standalone components
- **Backend**: Firebase Firestore
- **Mobile**: Capacitor wrapper for Android
- **Styling**: SCSS with CSS custom properties
