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

## Acceptance rule

A feature is not complete because the screen works. Its offline, error, loading, synchronization and data integrity behavior must also be tested.
