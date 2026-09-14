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
