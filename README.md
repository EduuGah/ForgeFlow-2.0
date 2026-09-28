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

### Native local persistence (FF-044)

Android and iOS builds open `forgeflow.db` through Expo SQLite, apply versioned
migrations and seed the system exercise catalog before composing application
services. Current repository contracts persist to normalized tables, including
the sync outbox, so committed workouts and history survive app restarts.
Training writes and their outbox records are atomic. The web preview remains an
in-memory environment and resets when the page reloads.

### Offline end-to-end coverage (FF-029)

The automated offline journey crosses registration, workout creation and
execution, set logging, completion, personal records, goals, nutrition,
hydration, notifications and synchronization. It simulates a network failure,
reopens the persisted SQLite database, verifies the recovered state and then
reconnects twice to prove that pending operations are accepted without data
loss or duplication.

### Performance pass (FF-030)

Workout history loads incrementally in pages of 20, analytics reads only its
current and comparison periods, synchronization processes bounded batches and
native startup skips an unchanged exercise seed. Migration
`0014_performance_indexes` supports the principal history, analytics, set,
record and goal queries on SQLite and PostgreSQL.

### Rest timer (FF-014)

Saving a set with a positive rest duration starts a shared deadline-based timer.
It supports pause, resume, `+15s` and cancellation, and remains accurate across
screen changes or time spent in the background. Native builds schedule a local
completion alert when permission is available; web keeps the in-app completion
state without requesting notification access.

### Workout completion preview (FF-015)

The workout screen supports explicit completion and a History tab with session
duration, completed sets, working-set volume and exercise/set details including
notes. Completion is scoped to the requested session and user; repeating a
successful completion does not finish a subsequent active session.

Native composition now uses durable SQLite repositories, so history can be
opened without network access after restarting the app. The web preview still
resets on reload. Historical names are resolved from the current catalog/templates rather than immutable name
snapshots. Missing names fall back to generic labels while recorded sets remain.

### Training analytics preview (FF-017)

The Progress tab calculates completed workout count, duration, frequency,
working-set volume and repetitions, personal records and per-exercise metrics for
7, 30 or 90 days. It compares each selection with the immediately preceding
period of equal length and exposes serializable timeline/exercise series for
charts and future exports. Native data persists in SQLite; web preview data
resets when the page reloads.

### Goal engine preview (FF-018)

The Goals tab creates every supported goal type, captures its baseline, accepts
an optional deadline and supports editing, pausing, resuming and cancelling.
Training-based goals derive their baseline from completed workout analytics;
body-weight and custom goals accept a manual current value. Native goal data is
durable; the web preview resets when the page reloads.

### Goal progress preview (FF-019)

Goal cards show baseline, current value, target, percentage and projected status.
Training goals refresh from completed workout analytics; body-weight and custom
goals expose manual measurement entry. Deadline projection distinguishes goals
that are on track, behind or expired, and reached targets move to the completed
section at 100%. Progress events and sync operations persist on native builds;
the web preview resets when the page reloads.

### Achievements preview (FF-020)

The Profile tab now evaluates and displays 19 objective achievements for the
first workout and record, consecutive training weeks, workout count, cumulative
working-set volume, completed goals and estimated 1RM growth. Unlocks are
idempotent and each new achievement enters the offline sync outbox. Achievement
and outbox data use durable SQLite storage on native builds; the web preview
resets when the page reloads.

### Notification engine (FF-021)

The central notification pipeline now evaluates eligibility, deterministic
deduplication, category preferences, quiet hours and motivational rate limits
before persisting a pending notification and its offline sync operation. The
standard policy defers notifications created between 22:00 and 08:00 local time
until 08:00, limits motivational events to three in a rolling 24-hour window and
keeps a six-hour interval per category. Action-driven events remain exempt from
the rate limit but are still deduplicated. Actual local/push delivery belongs to
FF-022 and persisted preference editing belongs to FF-023.

### Push and local delivery (FF-022)

ForgeFlow now uses the official Expo Notifications adapter for contextual
permission requests, local scheduling/cancellation, foreground presentation,
Expo/native push token registration and notification-response deep links. The
web preview degrades to an unavailable result without prompting or crashing.
Remote push requires an EAS project ID, FCM/APNs credentials and a development
build; Expo Go on Android cannot receive remote push on current SDKs. Device
registrations are persisted by migration `0009_push_devices` and queued for
offline synchronization.

### Structured AI export preview (FF-028)

The Reports screen can build and display a versioned JSON document that keeps
observed facts separate from calculated metrics and leaves projections and AI
interpretations explicitly ungenerated. Sharing is a separate user action:
native platforms open the system share sheet, while web downloads the JSON for
the user to choose its destination. No provider is contacted automatically.
