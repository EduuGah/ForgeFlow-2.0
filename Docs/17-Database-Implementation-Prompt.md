# 17 — Database Implementation Prompt

You are implementing ForgeFlow 2.0 from the project documentation.

Your first technical objective is the database foundation. Do not build UI features in this task.

## Context

ForgeFlow is a mobile-first gym tracking app with:
- workouts
- active workout sessions
- sets
- weight/reps
- warm-up vs working sets
- PRs
- goals
- nutrition
- hydration
- reports
- notifications
- future social features

The app must be offline-first. Local SQLite is the operational store on the device. Server PostgreSQL is the canonical synchronized store.

## Non-negotiable requirements

1. Client-generated UUIDs.
2. Versioned migrations.
3. User ownership on every user-owned entity.
4. Soft deletion/tombstones for synchronized mutable records.
5. Local outbox.
6. Sync cursor.
7. Idempotent operation IDs.
8. No duplicate records after retries.
9. Transactional multi-record writes.
10. No Base64 images inside database rows.
11. No UI code in the database layer.
12. Do not invent schema fields not justified by the documentation.
13. Add indexes based on expected access patterns.
14. Add automated tests for constraints and critical sync metadata.

## Scope

Implement:
- server PostgreSQL schema
- local SQLite schema
- migration system for both
- repository interfaces
- sync metadata tables
- seed/system exercise strategy where appropriate
- tests

Do not implement:
- complete workout UI
- complete authentication UI
- analytics dashboards
- social features
- AI integrations

## Required output

At the end, report:
- schema implemented
- migrations created
- tests executed
- files changed
- any assumptions
- risks discovered
- exact commit message

Suggested commit:

feat: establish offline-first database foundation

If the issue is FF-004, include `Closes #<actual issue number>` only in the PR/commit body if the repository workflow requires it. Never invent an issue number.
