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

For comparable load contexts, track the highest valid repetition count. The exact comparison policy must be implemented consistently; do not compare arbitrary repetitions across wildly different loads as if they represented the same performance.

## Estimated 1RM

Optional derived metric. It is an estimate, not a real lift. The formula must be centralized in one domain module and covered by tests.

## Goals

Baseline must be captured when a goal is created when the metric supports it. Historical records before goal creation must not accidentally count as new progress.

A goal with no deadline remains active until completed, paused, cancelled or otherwise changed.

Deadline is optional.

## Workout completion

A workout becomes completed only through an explicit completion action or an approved recovery rule. Abandoned active workouts remain recoverable.

## Nutrition

Nutrition entries are tracking records. The app must not infer medical diagnoses.

## Notifications

Notifications must be deduplicated and rate-limited. The same event must not generate repeated notifications because a screen was opened multiple times.

## Time

Store timestamps in UTC where server synchronization is involved. Render dates/times using the user's configured/local timezone. Store the timezone context needed for daily goals and hydration summaries.
