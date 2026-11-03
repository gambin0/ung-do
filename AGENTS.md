# Instructions for Coding Agents

This file provides guidance for AI coding agents working on the ung-do project.

## Documentation

Before making changes, consult the project documentation:

- **Development Setup**: [DEVELOPMENT.md](DEVELOPMENT.md) - Prerequisites, quick start, Firebase setup
- **Android Debugging**: [docs/android-debugging.md](docs/android-debugging.md) - ADB commands, build workflow, troubleshooting
- **Roadmap**: [ROADMAP.md](ROADMAP.md) - Planned features and priorities

## Project Structure

- `src/app/todos/` - Main todo application (components, services, models)
- `src/app/todos/todos.ts` - Main todos screen component
- `src/app/todos/todo-item.ts` - Individual todo item component
- `src/app/todos/todo-service.ts` - Firebase Firestore data service
- `src/app/todos/notification-service.ts` - Push/local notification service
- `android/` - Capacitor Android project
- `server/` - Local API server (for development)

## Key Technologies

- Angular 22 with standalone components
- Firebase Firestore for backend
- Capacitor for Android/iOS wrapper
- Tailwind CSS for styling
- Vitest for testing

## Common Tasks

### Build & Run (Web)
```bash
npm run dev  # Starts API server + web UI on :4200
```

### Build & Deploy (Android)
```bash
npm run build
npm run cap:sync
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Testing
```bash
npm test
```

## Code Style

- Use Angular signals for state management
- Follow existing component patterns (standalone components with inline templates)
- Use TypeScript strict mode
- Run `npx prettier --write` before committing
