# 12 — Notification System

## Philosophy

Notifications should make the app feel alive without becoming annoying.

Default mode: intelligent and low-noise.

## Event sources

- workout_completed
- new_pr
- goal_progress
- goal_completed
- goal_behind
- consistency_milestone
- inactivity_threshold
- hydration_reminder
- nutrition_reminder
- report_ready
- achievement_unlocked

## Notification pipeline

Domain event → eligibility rules → dedupe → preference check → quiet hours → rate limit → schedule/send → store notification record.

## Dedupe

Every generated notification should have a deterministic dedupe key where applicable.

Example:
goal_progress:{goalId}:{threshold}:{period}

The same event must not create duplicates when sync or app startup runs multiple times.

## Quiet hours

Respect user-configured quiet hours.

Critical account/security notifications may have different rules from motivational notifications.

## Rate limits

Set conservative defaults and tune with analytics.

The app should never send multiple motivational notifications for the same underlying event.

## Local vs remote

Local notifications can handle device-only reminders.

Remote push can handle server-generated events and cross-device cases.

The architecture must tolerate duplicate delivery from push providers.

## User controls

Users can enable/disable categories and choose a frequency mode.
