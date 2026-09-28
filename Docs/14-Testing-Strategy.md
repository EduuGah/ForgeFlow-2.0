# 14 — Testing Strategy

## Unit tests

Pure domain logic:
- volume
- PRs
- goal progress
- streaks
- estimated metrics
- notification eligibility
- sync conflict rules

## Repository tests

- local CRUD
- transaction behavior
- migrations
- outbox creation
- sync state transitions

## Integration tests

- offline write → reconnect → sync
- retry after timeout
- duplicate operation ID
- server conflict
- deletion/tombstone
- photo upload retry

FF-007 adds the first recovery-focused sync tests around the application sync use case:
- offline writes stay pending after network failure and complete after reconnect
- timeout after a server-side apply can be retried with the same operation ID
- duplicate local operation IDs collapse before sync
- pulled server changes advance the cursor and do not duplicate on a later reconnect

## End-to-end

Critical journeys:
1. sign up
2. create workout
3. start workout
4. record sets
5. finish
6. force offline
7. reopen app
8. reconnect
9. verify cloud data
10. verify no duplicates

FF-029 implements this journey as an application-level end-to-end integration
test against the migrated SQLite schema. The scenario registers an account,
creates and executes a workout, records warm-up and working sets, finishes the
session, creates personal records and a goal, records nutrition and hydration,
and creates a notification while the synchronization endpoint is unavailable.
It then exports and closes the database, reopens it through a new connection,
verifies every domain record, reconnects synchronization and confirms that a
second sync sends no operations and creates no duplicate operation IDs.

The test uses an in-process protocol gateway and SQLite WASM so it remains
deterministic in CI. Device UI automation, operating-system process death and a
deployed PostgreSQL/API environment belong to release validation rather than
this repository-level suite.

## Acceptance rule

A feature is not complete because the screen works. Its offline, error, loading, synchronization and data integrity behavior must also be tested.

## Performance regression coverage

FF-030 verifies stable 20-item history pages without overlap, SQLite index use
through `EXPLAIN QUERY PLAN`, 100-operation default sync batches, date-bounded
analytics repository calls and skipped catalog writes on unchanged startup.
Device frame rate, heap and cold-start measurements remain release-build checks.
