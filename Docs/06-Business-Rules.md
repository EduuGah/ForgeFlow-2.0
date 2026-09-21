# 06 — Business Rules

## Sets

A set has:
- set number
- type: warmup | working
- weight
- repetitions
- optional rest seconds
- completion state
- timestamp

Warm-up sets are excluded from the primary PR and progression calculations unless a future metric explicitly says otherwise.

## Volume

Set volume = weight × repetitions.

Workout volume = sum of valid set volumes.

Do not count incomplete/invalid sets.

## PR — weight

Highest valid working-set weight for an exercise.

A new record is created only when the new value is strictly greater than the previous record.

## PR — volume

Highest valid working-set volume for an exercise.

Volume = weight × repetitions.

## PR — repetitions

For comparable load contexts, track the highest valid repetition count. ForgeFlow
compares repetition records at the exact same load in kilograms. Records at
different loads remain separate events.

## Estimated 1RM

Derived metric using the Epley formula: `weight × (1 + repetitions / 30)`.
One repetition returns the lifted weight. Values are rounded to two decimal places
and must always be labeled as estimates. The formula is centralized in the
training domain and covered by tests.

## PR history

Only completed, non-deleted working sets can create records. Warm-up sets never
create records. Weight, set volume, comparable-load repetitions and estimated 1RM
use strict improvement: an equal value does not create another event. Every new
record keeps its source set and achievement timestamp so previous records remain
available in history.

## Training analytics

Analytics periods include both the start and end timestamps. Period comparisons
use the immediately preceding window with the same duration and do not overlap.
Workout count and duration use completed, non-deleted sessions. Volume,
repetitions, maximum load and exercise progression use only completed,
non-deleted working sets; warm-up sets remain visible in workout history but are
excluded from these metrics. Frequency is completed workouts per seven days in
the selected period. A percentage comparison is undefined when the previous
period has a zero baseline. Daily chart buckets follow the user's device-local
calendar date so late-evening workouts do not appear on the following UTC day.

## Goals

Baseline must be captured when a goal is created when the metric supports it.
Historical records before goal creation must not accidentally count as new
progress. Exercise weight, repetitions and volume, monthly workout count, total
volume and personal-record count use the user's completed training history.
Workout-frequency goals use the completed workouts from the previous 30 days.
Body-weight and custom goals require a user-provided baseline.

The goal type, metric, linked exercise and baseline are immutable after creation.
The title, target and optional deadline can be edited without resetting progress.
New goals start active. Active goals can be paused or cancelled; paused goals can
be resumed or cancelled. Cancelled goals cannot return to an active state.

A goal with no deadline remains active until completed, paused, cancelled or otherwise changed.

Deadline is optional and represents the end of the selected calendar date,
independent of the user's timezone.

Goal progress is measured from baseline to target and clamped between 0% and
100%. The same formula supports increasing and decreasing goals by using the
direction from baseline to target. Reaching or crossing the target completes the
goal before deadline/pace evaluation and records `completed_at`. Completed,
expired, paused and cancelled goals do not accept new progress.

For a goal with a deadline, expected progress is the percentage of time elapsed
between creation and deadline. Actual progress equal to or above expected
progress is `on_track`; lower progress is `behind`. A tolerance of 0.01 percentage
point prevents processing latency immediately after creation from marking a new
goal behind. Passing the deadline without reaching the target marks it expired.
A goal without a deadline remains active until it reaches its target or its
lifecycle is changed explicitly.

Automatic training goals are recalculated after workout completion and when the
goal list refreshes. Body-weight and custom goals accept explicit measurements.
Identical value, percentage and status results are deduplicated; meaningful
changes create an immutable progress event with source and timestamp.

## Achievements

Achievements are derived from persisted facts and never from editable counters.
Each achievement type can unlock only once per user. Re-evaluation after a
workout, a goal completion or Profile load must be idempotent and every new
unlock must enter the offline sync outbox before it is saved locally.

The approved thresholds are: first workout and first personal record; weekly
streaks of 3, 7 and 12; workout counts of 10, 25, 50 and 100; cumulative
working-set volume of 10,000, 50,000, 100,000 and 500,000 kg; completed-goal
counts of 1, 5 and 10; and estimated 1RM growth of 5%, 10% and 25% relative to
the first estimated 1RM record for the same exercise. Weekly streaks count
distinct consecutive UTC calendar weeks beginning on Monday. A gap starts a new
sequence, and multiple workouts in one week count once.

## Workout completion

A workout becomes completed only through an explicit completion action or an approved recovery rule. Abandoned active workouts remain recoverable.

## Nutrition

Nutrition entries are tracking records. The app must not infer medical diagnoses.

## Notifications

Notifications must be deduplicated and rate-limited. The same event must not generate repeated notifications because a screen was opened multiple times.

Each event carries a deterministic dedupe key. Processing order is eligibility,
deduplication, category preference, quiet-hour scheduling, rate limiting and
only then persistence plus offline sync. Quiet hours run from 22:00 to 08:00 in
the configured UTC offset; events are deferred to 08:00, not discarded.

Motivational notifications are limited to three per rolling 24 hours and one per
category every six hours. Action-driven workout completion, new personal record,
goal completion, achievement unlock and report-ready notifications bypass the
rate limit but never bypass deduplication or category preferences.

## Time

Store timestamps in UTC where server synchronization is involved. Render dates/times using the user's configured/local timezone. Store the timezone context needed for daily goals and hydration summaries.
