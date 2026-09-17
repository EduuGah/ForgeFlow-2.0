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
