# ForgeFlow 2.0

ForgeFlow 2.0 is a mobile-first fitness app for strength training, workout logging, progression analysis, goals, lightweight nutrition tracking, reports, notifications and future social features.

This repository is planned from zero. The previous ForgeFlow is a reference for discovered requirements and lessons, not a technical template.

## Product loop

Plan → Train → Record → Analyze → Improve → Train again.

## Core MVP

- Account/authentication
- Profile
- Exercise library
- Workout creation/editing
- Workout execution
- Set logging
- Optional rest timer
- Weight/repetition tracking
- Warm-up vs working-set distinction
- Weight PR
- Volume PR
- Rep PR
- Workout history
- Progress dashboards/charts/tables
- Goals
- Lightweight nutrition journal
- Water tracking
- Reports/export
- Notification engine
- Offline-first local persistence
- Automatic background synchronization when connectivity returns

## Development rule

AI must implement one issue/prompt at a time, validate the result, and finish with:

- what changed;
- validation performed;
- known limitations;
- exact suggested commit message;
- issue reference/closing syntax when appropriate.

Never implement unrelated future work just because it is technically convenient.

## App foundation

The current app shell is an Expo + React Native + TypeScript project for issue `FF-001`.

### Local setup

```bash
npm install
npm run web
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm test
npm run format:check
```

### Environment

Copy `.env.example` to `.env.local` for local-only values. Only `EXPO_PUBLIC_*` values are visible to the client bundle; do not put secrets there.

### Workout completion preview (FF-015)

The workout screen supports explicit completion and a History tab with session
duration, completed sets, working-set volume and exercise/set details including
notes. Completion is scoped to the requested session and user; repeating a
successful completion does not finish a subsequent active session.

The current composition still uses in-memory repositories. History can be opened
without network access while the app remains running, but reloading or restarting
the app clears preview data. Durable local repositories and atomic session/outbox
writes remain prerequisites for the offline-reopening requirement in issue #15.
This implementation is partial and must not close that issue yet. Historical
names are resolved from the current catalog/templates rather than immutable name
snapshots. Missing names fall back to generic labels while recorded sets remain.
