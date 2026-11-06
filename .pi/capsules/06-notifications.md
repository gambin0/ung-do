# Domain Capsule: Notifications

## Overview

The notification system provides due date reminders for to-dos. It uses different strategies for mobile and web platforms.

## Platform Detection

```typescript
import { Capacitor } from '@capacitor/core';

const isMobile = ['android', 'ios'].includes(Capacitor.getPlatform());
```

## Mobile Notifications (Capacitor)

### Technology

- `@capacitor/local-notifications` plugin
- Works in background (not just foreground)
- Requires runtime permission on Android 13+

### Permission Flow

```typescript
async requestPermission(): Promise<NotificationPermission> {
  if (this.isMobile) {
    const status = await LocalNotifications.requestPermissions();
    const granted = status.display === 'granted';
    this.permission.set(granted ? 'granted' : 'denied');
    return granted ? 'granted' : 'denied';
  }
  // ... web fallback
}
```

### Scheduling

```typescript
await LocalNotifications.schedule({
  notifications: [
    {
      id: notificationId(todo.id),
      title: 'ung-do reminder',
      body: todo.title,
      schedule: { at: dueDate },
    },
  ],
});
```

### Immediate Notification

```typescript
await LocalNotifications.schedule({
  notifications: [
    {
      id: notificationId(todo.id),
      title: 'ung-do reminder',
      body: todo.title,
    },
  ],
});
```

### Cancellation

```typescript
await LocalNotifications.cancel({
  notifications: [{ id: notificationId(todo.id) }],
});
```

## Web Notifications (Browser API)

### Technology

- Browser `Notification` API
- Only works when page is open (foreground or background tab)
- Requires user permission

### Permission Flow

```typescript
const result = await Notification.requestPermission();
// Returns: 'granted', 'denied', or 'default'
```

### Firing Notification

```typescript
const notification = new Notification('ung-do reminder', {
  body: todo.title,
  icon: '/favicon.ico',
  tag: `todo-${todo.id}`, // Deduplication tag
});

notification.onclick = () => {
  window.focus();
  notification.close();
};
```

### Periodic Checking

```typescript
// Called every 60 seconds
checkDueTodos(todos: Todo[]): void {
  if (this.isMobile) return;
  if (typeof Notification === 'undefined') return;
  if (this.permission() !== 'granted') return;

  const now = Date.now();
  for (const todo of todos) {
    if (todo.completed) continue;
    if (!todo.dueAt) continue;
    if (this.notifiedIds.has(todo.id)) continue;

    const dueTime = new Date(todo.dueAt).getTime();
    if (dueTime <= now) {
      this.fireWebNotification(todo);
      this.notifiedIds.add(todo.id);
    }
  }
}
```

## Notification ID Strategy

### Hash-Based IDs

See `notificationId()` and `legacyNotificationId()` in
`src/app/todos/notification-service.ts`. The Firestore string ID is hashed to a
stable 32-bit int (Capacitor requires int32 IDs). Current IDs live in
`[100_000, 2^31 - 1)`; older builds used `abs(hash) % 100_000`, so scheduling
also cancels the legacy ID to avoid duplicates.

### Why Hash-Based?

- Stable IDs for the same todo
- No need to store notification IDs in Firestore
- Collision-resistant (uses nearly the full positive int32 range)
- Legacy IDs from older builds are cancelled when rescheduling

## Notification Lifecycle

### Scheduling

1. User sets due date on todo
2. `updateDue()` called → `scheduleTodoNotification()`
3. If due date is in past → fire immediately
4. If due date is in future → schedule for that time

### Cancellation

1. User completes todo → `toggle()` called → `cancelTodoNotification()`
2. User changes due date → `updateDue()` called → cancel old, schedule new
3. User deletes todo → `remove()` called → `cancelTodoNotification()`

### Firing

1. Scheduled time arrives (mobile) or periodic check finds due todo (web)
2. Notification displayed to user
3. User can tap notification to focus app (web only)

## Edge Cases

### Already Past Due

- If due date is in the past when set, fire immediately
- User sees notification right away

### Completed Before Due

- Notification cancelled when todo is completed
- No notification fires

### Due Date Changed

- Old notification cancelled
- New notification scheduled (or fired if past due)

### Multiple Notifications

- Web: `notifiedIds` set prevents duplicate notifications
- Mobile: Notification ID is stable, so rescheduling replaces old one

## Testing

### Mobile Testing

- Use Android emulator or physical device
- Set due date to 1 minute in future
- Wait for notification
- Check notification appears in notification shade

### Web Testing

- Open app in browser
- Grant notification permission
- Set due date to past
- Check notification appears
- Check `notifiedIds` prevents duplicates

### Unit Testing

- Mock `LocalNotifications` for mobile tests
- Mock `Notification` API for web tests
- Test ID generation and collision resistance
- Test permission flow

## Known Limitations

### Mobile

- Requires app to be installed
- Notification may be delayed if device is in power-saving mode
- Android 13+ requires runtime permission

### Web

- Only works when page is open
- Browser may throttle background tabs
- Notification icon may not show in all browsers
- No deep linking from notification to specific todo
