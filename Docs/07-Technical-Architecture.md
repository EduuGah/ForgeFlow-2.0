# 07 — Technical Architecture

## Architecture style

Use a local-first / offline-first architecture.

Recommended direction:
- React Native + Expo for Android-first mobile development
- TypeScript
- SQLite on-device for durable local data
- a server-side PostgreSQL database as the canonical synchronized store
- a typed API or synchronization layer between app and server
- object storage for photos
- push notification service for native notifications

The exact libraries may be finalized after a technical spike, but the architectural requirement is not negotiable: the app must work from local state when offline.

## Core layers

### Presentation
Screens, components, navigation, forms.

### Application
Use cases:
- create workout
- start workout
- record set
- finish workout
- create goal
- add meal
- generate report
- sync

### Domain
Pure business rules:
- volume
- PR detection
- goal progress
- streaks
- estimated metrics
- notification eligibility

### Data
Repositories abstract:
- local SQLite
- remote API
- sync queue
- file upload

UI must not directly manipulate SQLite tables or network requests.

## Source boundaries

Implemented source directories follow the same layer map:
- `src/presentation`: React Native screens, navigation, visual components and theme.
- `src/application`: use cases and repository ports consumed by the UI.
- `src/domain`: pure entities, value types and business rules.
- `src/data`: repository implementations/adapters behind application ports.
- `src/composition`: dependency composition for the running app.

Presentation may depend on application contracts, application may depend on
domain types, and data may implement application ports. Domain code must remain
independent from React, Expo, SQLite and network clients.

## Sync architecture

All user-owned writes happen locally first.

Each mutable entity has:
- globally unique UUID
- created_at
- updated_at
- deleted_at/tombstone where applicable
- sync status locally
- revision/version metadata where needed

Writes create/update the local row and enqueue an outbox operation.

When online:
1. sync engine reads pending operations;
2. sends idempotent mutations;
3. server validates authorization and business constraints;
4. server acknowledges the operation;
5. client marks it synchronized;
6. server changes are pulled;
7. local database is updated in a transaction.

Sync runs automatically on:
- app launch
- connectivity restoration
- foreground resume
- periodic background opportunity where platform permits

No manual sync button is required for normal users.

## Idempotency

Every sync operation must have a client-generated operation ID.

The server must safely accept retries of the same operation without duplicating data.

## Conflicts

Do not use a single global last-write-wins rule blindly.

Entity policies:
- append-only workout sets: preserve both valid records; identity prevents duplicates
- immutable completed workout records: reject unsafe destructive overwrite
- editable workout templates: latest revision with explicit conflict metadata
- profile/settings: field-level or latest-version strategy
- goals: latest revision with deterministic version check
- deletions: tombstones until all relevant clients have acknowledged

If an unsafe conflict cannot be automatically resolved, preserve local data and mark a recoverable sync conflict rather than silently deleting information.

## Offline media

Photos are local pending uploads first. The database stores metadata and a local file reference. Upload queue retries independently. Do not store large Base64 blobs inside SQLite or PostgreSQL rows.

## Security

- per-user authorization on every server operation
- never trust user_id supplied by client
- server derives authenticated user identity from session/token
- validate all input
- rate-limit sensitive endpoints
- secure token/session storage on device
- encrypt sensitive local data where appropriate
- never ship secrets in the mobile bundle
- logs must not contain credentials or sensitive personal content
