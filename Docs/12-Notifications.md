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

FF-021 defines the standard quiet period as 22:00 through 08:00 in the user's
configured UTC offset. Eligible notifications created in that interval are
persisted and scheduled for 08:00 rather than discarded. The engine supports
quiet periods that cross midnight.

Critical account/security notifications may have different rules from motivational notifications.

## Rate limits

Set conservative defaults and tune with analytics.

The app should never send multiple motivational notifications for the same underlying event.

The standard FF-021 policy allows at most three motivational notifications in a
rolling 24-hour window and requires six hours between motivational notifications
in the same category. Workout completion, new PR, goal completion, achievement
unlock and report-ready events are action-driven: they bypass this rate limit
but retain event-level deduplication.

The engine returns an explicit result for every event: created, ineligible,
duplicate, preference disabled or rate limited. Created notifications remain
pending through `scheduled_for`; FF-022 owns local/push delivery.

## Local vs remote

Local notifications can handle device-only reminders.

Remote push can handle server-generated events and cross-device cases.

The architecture must tolerate duplicate delivery from push providers.

## User controls

Users can enable/disable categories and choose a frequency mode.

FF-021 consumes an immutable preference snapshot so category choices are
respected without coupling the engine to a settings UI. FF-023 will persist and
edit those preferences.
