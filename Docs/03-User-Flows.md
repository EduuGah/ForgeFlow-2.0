# 03 — User Flows

## First use

Download → Open → Create account → Basic profile → Create first workout → Start workout → Record first set → Complete workout → See summary.

## Normal workout

Open app → Home/next workout → Start → Active workout → Exercise → Set → Save → Optional rest → Next set → Finish → Workout summary → PR/goal feedback → History.

## Offline workout

Open app offline → Existing local data remains available → Start workout → Record data locally → Finish → Data is marked pending sync → Connectivity returns → Sync engine uploads changes → Server acknowledges → Local sync state becomes synced.

The user does not need to manually press "sync".

## Goal

Create goal → Capture baseline → Set target → Optional deadline → Track automatically → Notify meaningful progress → Complete when business rule is satisfied.

## Nutrition

Open nutrition → Add meal → Select type → Capture photo → Enter kcal/macros → Save locally → Review daily total → Include in report.

## Report

Select period → Generate report from local/server-confirmed data → Export structured JSON/CSV/PDF as appropriate → User may send to professional or AI.

## Conflict principle

The app must avoid silently losing user data. Sync conflicts are resolved by deterministic entity-specific rules defined in the database/sync documentation.
