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

# Start API server and web UI
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

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore database
3. Create a web app in Firebase and copy the config
4. Update `src/app/firebase.config.ts` with your config

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API + web UI |
| `npm run build` | Build web assets |
| `npm run test` | Run unit tests |
| `npm run cap:sync` | Sync web assets to Android |
| `npm run cap:run` | Build and deploy to Android |

## Architecture

- **Frontend**: Angular 22 with standalone components
- **Backend**: Firebase Firestore
- **Mobile**: Capacitor wrapper for Android
- **Styling**: SCSS with CSS custom properties
