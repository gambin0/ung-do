# ung-do Feature Roadmap

## Completed
- [x] Core todo CRUD (create, read, update, delete)
- [x] Filter by status (all/active/completed)
- [x] Drag-and-drop reordering (mouse + keyboard)
- [x] Persistent ordering in Firestore (`order` field)
- [x] Modern UI with Tailwind CSS + Angular Material
- [x] Email/password sign-in; Firestore rules restricted to the owner account
- [x] Inventory screen with categories and automatic "Restock" to-dos at 1 or 0

## In Progress
- [x] Time-based reminders with browser push notifications (core: due dates, overdue display, notifications)

## Planned Features

### Reminders & Notifications
- [ ] Time-based alerts: Set a task with a specific time, get notified when due
- [ ] Recurring tasks: "Take vitamins daily", "Water plants every Monday"
- [ ] Overdue highlighting: Tasks that should have been done glow red
- [ ] Daily digest: Morning prompt showing what's due today

### Exercise & Activity
- [ ] Exercise templates: One-tap quick adds like "5 min stretching"
- [ ] Activity streaks: Track consecutive days of exercise
- [ ] Built-in timer: Simple stopwatch for timed exercises
- [ ] Exercise category: Tag tasks as "exercise" with separate view

### Memory & Organization
- [ ] Smart suggestions: "You haven't done X in 3 days"
- [ ] Quick capture: Super-fast way to jot down thoughts
- [ ] Notes on tasks: Add context so you remember why
- [ ] Location-based reminders: "Call mom when I get home"

### Productivity Boosters
- [ ] Pomodoro timer: Built-in 25-min focus sessions
- [ ] Priority levels: Urgent/normal/low with visual distinction
- [ ] Time estimates: "This should take 15 min"

## Backlog (under consideration)
- [ ] Voice input: speak to add to-dos and update inventory — options, costs and
      open decisions in [docs/voice-input.md](docs/voice-input.md)
