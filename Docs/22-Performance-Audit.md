# 22 - Performance Audit

## Scope

FF-030 reviews the highest-volume local paths: startup, workout history,
analytics, set lookup and synchronization. The pass favors bounded work and
indexed queries over timing assertions that would be unstable across CI hosts.

## Findings and changes

- Workout history previously loaded every session and expanded every detail.
  It now requests completed sessions in pages of 20 and exposes an explicit
  load-more action.
- SQLite applied limits after reading all user sessions. Status, deletion,
  date-range, limit and offset predicates now execute inside SQLite.
- Set, personal-record and goal-progress lookups previously read whole tables
  before filtering. Their IDs and ranges are now bound SQL predicates.
- Analytics previously loaded the user's entire training lifetime. It now
  requests only the selected interval plus the immediately preceding comparison
  interval.
- Synchronization previously had an unbounded default read. Each run now handles
  at most 100 pending operations unless the caller supplies another batch size.
- The system exercise catalog was upserted on every startup. A version marker in
  local sync state skips the 130-row seed until the catalog version changes.

## Indexes

Migration `0014_performance_indexes` adds compound indexes for workout history,
analytics ranges, ordered session exercises and sets, workout template children,
personal records and goal lists. Local and server schemas receive equivalent
indexes.

Repository tests use `EXPLAIN QUERY PLAN` to prove the completed-history query
selects `idx_workout_sessions_user_status_started`. Pagination tests verify
stable, non-overlapping pages, and synchronization tests verify bounded batches.

## UI and memory

Only the current history page is expanded into exercise and set summaries. This
bounds query fan-out and React element creation while preserving full detail for
loaded sessions. The current exercise catalog contains 130 records and remains
within the existing screen's practical range; future catalog growth should move
that surface to a virtualized list during the visual refactor.

## Release validation

The automated suite verifies query shape, bounds and behavior. Frame rate,
native heap, cold-start time and very long workout interaction must also be
measured on the target Android release build because desktop CI cannot provide
representative device timings.
