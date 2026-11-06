# Domain Capsules for ung-do

Domain capsules provide structured context to AI agents working on the ung-do codebase. Each capsule covers a specific aspect of the application.

## Capsule Index

| File                         | Topic                | Description                                                        |
| ---------------------------- | -------------------- | ------------------------------------------------------------------ |
| `00-application-overview.md` | Overview             | What ung-do is, core features, target users, design philosophy     |
| `01-architecture.md`         | Architecture         | Component hierarchy, service layer, data flow, routing             |
| `02-domain-model.md`         | Domain Model         | Core entities (Todo, InventoryItem), relationships, business rules |
| `03-conventions.md`          | Conventions          | TypeScript, Angular, styling, testing, and Firebase conventions    |
| `04-firebase-firestore.md`   | Firebase & Firestore | Setup, auth, CRUD operations, document mapping, error handling     |
| `05-mobile-capacitor.md`     | Mobile & Capacitor   | Build workflow, platform detection, mobile-specific features       |
| `06-notifications.md`        | Notifications        | Mobile and web notification strategies, ID generation, lifecycle   |

## How to Use

### For AI Agents

When working on ung-do, load relevant capsules based on the task:

- **Adding a new feature**: Load `00-application-overview.md`, `01-architecture.md`, `03-conventions.md`
- **Modifying data model**: Load `02-domain-model.md`, `04-firebase-firestore.md`
- **Working on notifications**: Load `06-notifications.md`
- **Mobile-specific changes**: Load `05-mobile-capacitor.md`
- **General code changes**: Load `03-conventions.md`

### For Developers

These capsules serve as living documentation. Update them when:

- Architecture changes
- New conventions are established
- Domain model evolves
- New features are added

## Maintenance

- Keep capsules up-to-date with code changes
- Add new capsules for new major features
- Remove or merge capsules that become obsolete
- Ensure consistency across capsules

## Related Documentation

- `AGENTS.md` - Instructions for coding agents
- `DEVELOPMENT.md` - Development setup guide
- `ROADMAP.md` - Planned features and priorities
- `docs/android-debugging.md` - Android debugging guide
