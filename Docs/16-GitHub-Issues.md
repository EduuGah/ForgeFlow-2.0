# 16 — Initial GitHub Issue Plan

Create issues in dependency order.

## Foundation

### FF-001 — Project foundation
Set up mobile app, TypeScript, navigation, linting, formatting, testing and environment strategy.

### FF-002 — Architecture boundaries
Create presentation/application/domain/data boundaries and repository interfaces.

### FF-003 — Database migration foundation
Create local SQLite migration system and server PostgreSQL migration system.

### FF-004 — Initial database schema
Implement the core server schema and local mirror for users, profiles, exercises, workouts, workout_exercises, sessions, session_exercises and sets.

### FF-005 — Sync metadata and outbox
Implement local sync_operations and sync_state.

### FF-006 — Sync protocol
Implement idempotent push/pull synchronization with cursors.

### FF-007 — Offline recovery tests
Test offline writes, retry, duplicate operation IDs and reconnect synchronization.

## Authentication

### FF-008 — Authentication
Implement registration, login, session persistence and secure credential storage.

### FF-009 — User ownership/security
Implement server authorization and ownership tests.

## Training

### FF-010 — Exercise library
### FF-011 — Workout CRUD
### FF-012 — Workout execution
### FF-013 — Set logging
### FF-014 — Rest timer
### FF-015 — Workout completion and history
### FF-016 — PR engine
### FF-017 — Training analytics

## Goals and engagement

### FF-018 — Goal engine
### FF-019 — Goal progress
### FF-020 — Achievements
### FF-021 — Notification engine
### FF-022 — Push/local notifications
### FF-023 — Notification preferences

## Nutrition and reports

### FF-024 — Nutrition journal
### FF-025 — Meal photos
### FF-026 — Hydration
### FF-027 — Reports
### FF-028 — Structured AI export

## Quality

### FF-029 — Offline end-to-end suite
### FF-030 — Performance pass
### FF-031 — Accessibility pass
### FF-032 — Security audit
### FF-033 — Release build/Android packaging

## Future

### FF-034 — Friends
### FF-035 — Rankings
### FF-036 — Challenges
### FF-037 — Competitions
