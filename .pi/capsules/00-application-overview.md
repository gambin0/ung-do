# Domain Capsule: Application Overview

## What is ung-do?

ung-do is a personal task and inventory management application. It combines a to-do list with an inventory tracking system that automatically generates restock to-dos when items run low.

## Core Value Proposition

- **Task management**: Create, complete, and organize to-dos with due dates
- **Inventory tracking**: Track stock levels of items (pantry, supplies, etc.)
- **Smart restocking**: Automatic to-do creation when inventory hits low thresholds
- **Cross-device sync**: Firebase Firestore backend keeps data in sync
- **Mobile-ready**: Capacitor wrapper for Android (no iOS platform yet)

## Key Features

1. **To-Do List**
   - Add/edit/delete tasks
   - Due dates with time
   - Drag-and-drop reordering (pointer events for mobile)
   - Keyboard reordering (Alt+Arrow keys)
   - Filters: All, Active, Completed
   - Progress bar showing completion percentage
   - Overdue/upcoming date badges

2. **Inventory Management**
   - Add items with name, quantity, optional category
   - +/- buttons for quick quantity adjustments
   - Inline editing of item details
   - Category grouping with alphabetical sorting
   - Low/out-of-stock badges
   - Automatic restock to-do creation at threshold (quantity ≤ 1)

3. **Notifications**
   - Due date reminders
   - Mobile: Capacitor Local Notifications (works in background)
   - Web: Browser Notification API fallback (only while the app is open)
   - Restock to-dos have no due date, so they don't trigger notifications

## User Flow

1. User signs in with email/password (single owner account, created in the Firebase console; Firestore rules reject every other account)
2. Default view is the to-do list
3. User can switch to inventory via main nav
4. Adding inventory items at low quantities creates restock to-dos
5. Raising a low item's quantity above 1 checks off its restock to-do (checking off the to-do does not change inventory)

## Technology Stack

- **Frontend**: Angular 22 with standalone components
- **State Management**: Angular Signals
- **Backend**: Firebase Firestore
- **Auth**: Firebase Email/Password Auth
- **Mobile**: Capacitor 8
- **Styling**: Tailwind CSS 4 + Angular Material 22
- **Forms**: Signal Forms (`@angular/forms/signals`) for new forms
- **Testing**: Vitest 5
- **Build**: Angular CLI 22

## Target Users

Individuals who want to manage personal tasks and track household/inventory items in one place, with automatic reminders for restocking.

## Design Philosophy

- Clean, modern UI with subtle animations
- Mobile-first responsive design
- Fast and responsive (optimistic UI updates)
- Accessible (WCAG AA, keyboard navigation, screen reader support)
- Minimal friction (inline editing, quick actions)
