# 08 — Database Design

## Database strategy

ForgeFlow uses two synchronized databases:

1. **Local SQLite**: operational source for the mobile UI and offline writes.
2. **Server PostgreSQL**: canonical cloud store and cross-device synchronization source.

The local schema should closely mirror the server domain model, but may contain local-only sync tables/fields.

## Identity

Every domain entity uses UUIDs generated client-side. This allows an entity to be created offline and later synchronized without requiring a server-generated numeric ID.

## Core entities

### users
- id UUID PK
- email
- display_name
- avatar_url
- timezone
- created_at
- updated_at

### user_profiles
- user_id UUID PK/FK
- height_cm nullable
- current_weight_kg nullable
- training_experience
- primary_goal
- preferred_training_frequency
- notes
- updated_at

### exercises
Global exercise catalog plus user-created records.
- id UUID PK
- owner_user_id nullable
- name
- description
- equipment
- primary_muscle_group
- secondary_muscle_groups
- is_system
- created_at
- updated_at
- deleted_at nullable

### exercise_favorites
- id UUID PK
- user_id
- exercise_id
- created_at

Unique constraint: user_id + exercise_id.

FF-010 introduces `exercise_favorites` through a versioned migration for both
local SQLite and server PostgreSQL. Favorites are local-first records: toggling
a favorite updates local state immediately and enqueues a sync operation for
the favorite record.

### workouts
Workout definitions/templates.
- id UUID PK
- user_id
- name
- description
- sort_order
- is_archived
- created_at
- updated_at
- deleted_at nullable

### workout_exercises
- id UUID PK
- workout_id
- exercise_id
- position
- target_sets nullable
- target_reps_min nullable
- target_reps_max nullable
- target_weight nullable
- default_rest_seconds nullable
- notes
- created_at
- updated_at
- deleted_at nullable

Unique position within workout.

### workout_sessions
An actual workout execution.
- id UUID PK
- user_id
- workout_id nullable
- status: active | completed | abandoned
- started_at
- completed_at nullable
- duration_seconds nullable
- notes
- created_at
- updated_at
- deleted_at nullable

### session_exercises
Snapshot of exercises performed in a session.
- id UUID PK
- session_id
- exercise_id
- position
- created_at
- updated_at
- deleted_at nullable

### sets
The atomic training record.
- id UUID PK
- session_exercise_id
- set_number
- set_type: warmup | working
- weight_kg
- repetitions
- rest_seconds nullable
- completed_at nullable
- notes nullable
- created_at
- updated_at
- deleted_at nullable

Index: session_exercise_id + set_number.

### personal_records
Derived/denormalized records for fast access.
- id UUID PK
- user_id
- exercise_id
- record_type: weight | volume | repetitions | estimated_1rm
- value
- context_weight_kg nullable; required as the comparison context for repetition records
- source_set_id
- achieved_at
- created_at
- updated_at

Each row is a historical PR event. Current records are derived by selecting the
highest value for user, exercise, type and comparison context. A source set can
create at most one event for each type/context combination.

### goals
- id UUID PK
- user_id
- type
- title
- exercise_id nullable
- metric
- baseline_value nullable
- target_value
- deadline nullable
- status
- created_at
- updated_at
- completed_at nullable
- deleted_at nullable

### goal_progress_events
Optional audit/progress history.
- id UUID PK
- goal_id
- measured_value
- progress_percent
- recorded_at
- source_type
- source_id nullable

### body_weight_entries
- id UUID PK
- user_id
- weight_kg
- recorded_at
- note nullable
- created_at
- updated_at
- deleted_at nullable

### meals
- id UUID PK
- user_id
- meal_type
- consumed_at
- kcal
- protein_g nullable
- carbs_g nullable
- fat_g nullable
- photo_id nullable
- notes nullable
- created_at
- updated_at
- deleted_at nullable

### media
- id UUID PK
- user_id
- local_uri nullable
- remote_url nullable
- mime_type
- size_bytes nullable
- upload_status
- checksum nullable
- created_at
- updated_at
- deleted_at nullable

### hydration_entries
- id UUID PK
- user_id
- amount_ml
- recorded_at
- created_at
- updated_at
- deleted_at nullable

### notification_preferences
- id UUID PK
- user_id
- workouts_enabled
- goals_enabled
- prs_enabled
- progress_enabled
- nutrition_enabled
- hydration_enabled
- inactivity_enabled
- quiet_hours_start nullable
- quiet_hours_end nullable
- frequency_mode
- updated_at

### notifications
- id UUID PK
- user_id
- type
- title
- body
- data_json nullable
- dedupe_key
- delivery_status
- read_at nullable
- archived_at nullable
- scheduled_for
- created_at
- expires_at nullable

Unique dedupe strategy is required.

### achievements
- id UUID PK
- user_id
- achievement_type
- metadata_json
- achieved_at
- created_at

### sync_operations
Local-only table:
- operation_id UUID PK
- entity_type
- entity_id
- operation_type
- payload_json
- created_at
- attempt_count
- last_attempt_at nullable
- last_error nullable
- status: pending | processing | failed | completed

### sync_state
Local-only:
- scope/key
- server_cursor nullable
- last_success_at nullable
- last_error nullable

## Referential integrity

Server foreign keys must protect user ownership and valid references.

Never allow a client to reference another user's entities.

## Deletion

Prefer soft deletion/tombstones for synchronized mutable entities. Physical deletion can happen only after retention/sync guarantees are satisfied.

## Transactions

Multi-table writes such as finishing a workout and persisting its sets must be transactional locally.

Server-side operations that change several related records must also be transactional.

## Indexing

At minimum index:
- user_id
- user_id + updated_at
- workout_id
- session_id
- exercise_id + achieved_at
- goal user/status
- notifications user/read_at/created_at
- sync operation status/created_at

The exact PostgreSQL indexes should be verified with real query plans after implementation.

## Database migration rule

Every schema change requires a versioned migration. Never edit production tables manually as a normal development workflow.

## Migration foundation

Migration execution is split from concrete database clients:
- `src/data/migrations/migrationRunner.ts` validates and applies ordered migration definitions.
- `src/data/migrations/sqliteMigrationExecutor.ts` adapts the runner to the Expo SQLite async API shape.
- `src/data/migrations/postgresMigrationExecutor.ts` adapts the runner to a PostgreSQL client with `query`.

Both local and server databases keep an internal `schema_migrations` ledger with:
- `id`
- `name`
- `checksum`
- `applied_at`

The runner refuses checksum drift and unknown applied migrations so schema changes remain deterministic. FF-003 only establishes the migration system; entity tables are introduced by later schema issues.

## Initial schema migration

FF-004 introduces the first local and server schema migrations for the core training model:
- `users`
- `user_profiles`
- `exercises`
- `workouts`
- `workout_exercises`
- `workout_sessions`
- `session_exercises`
- `sets`

Both SQLite and PostgreSQL migrations use the same table names and relationship shape. Local SQLite stores UUIDs and timestamps as `TEXT`, boolean flags as checked integers, and `secondary_muscle_groups` as JSON text. Server PostgreSQL stores UUIDs as `UUID`, timestamps as `TIMESTAMPTZ`, boolean flags as `BOOLEAN`, and `secondary_muscle_groups` as `TEXT[]`.

FF-004 intentionally does not add local sync metadata tables. `sync_operations` and `sync_state` remain reserved for FF-005.

## Sync metadata migration

FF-005 introduces local-only sync metadata:
- `sync_operations`: the durable outbox for idempotent offline writes.
- `sync_state`: per-scope cursor and last sync result storage.

`sync_operations.operation_id` is the idempotency key sent to the server. Pending operation lookup is indexed by `status + created_at`, and entity lookup is indexed by `entity_type + entity_id`.

`sync_state` uses `scope + key` as its primary key so different synchronization streams can keep independent cursors. The first protocol implementation is introduced later by FF-006.

## Goals migration

FF-018 adds migration `0005_goals` to both SQLite and PostgreSQL. The `goals`
table supports all goal types and metrics defined by the product requirements,
enforces non-negative baseline and target values, and constrains lifecycle
statuses. Foreign keys connect goals to users and optional exercises. Indexes on
`user_id + status` and `exercise_id` support the primary goal lists and
exercise-scoped lookups.

FF-019 adds migration `0006_goal_progress_events` to SQLite and PostgreSQL. Each
event stores the goal, measured value, progress percentage, timestamp, source
type and optional source entity. Percentages are constrained to 0-100, goal
deletion cascades to its history, and `goal_id + recorded_at` is indexed for
latest-value and audit-history queries.

## Achievements migration

FF-020 adds migration `0007_achievements` to SQLite and PostgreSQL. The table
stores the user, stable achievement type, unlock timestamp and metric metadata.
The unique `user_id + achievement_type` constraint prevents duplicate unlocks,
the user foreign key cascades deletion, and `user_id + achieved_at` supports the
Profile history. SQLite stores metadata as serialized text while PostgreSQL uses
JSONB.

## Notifications migration

FF-021 adds migration `0008_notifications` to SQLite and PostgreSQL. A unique
`user_id + dedupe_key` constraint makes event processing idempotent across app
startup and synchronization retries. `delivery_status` starts as `pending`, and
`scheduled_for` preserves quiet-hour
deferral for FF-022 delivery, while indexes on `user_id + created_at` and
`user_id + read_at + created_at` support rate-limit evaluation and the future
notification center. SQLite stores event data as serialized text and PostgreSQL
uses JSONB.
