# 20 — Definition of Done

A ForgeFlow issue is complete only if all applicable criteria are satisfied.

## Product
- behavior matches requirements
- edge cases considered
- empty/loading/error states exist

## Data
- local persistence works
- server persistence works when applicable
- migrations exist
- ownership is enforced

## Offline
- feature works without connectivity when promised
- writes do not depend on network
- reconnect behavior is deterministic

## Sync
- retry safe
- idempotent
- no duplicate entities
- conflicts follow documented policy

## Quality
- TypeScript passes
- lint passes
- relevant unit/integration tests pass
- no unrelated modifications

## Security
- authorization verified
- secrets protected
- personal data handled appropriately

## Documentation
- architectural changes documented
- business rules documented

## Delivery
- branch contains only issue scope
- PR is reviewable
- final message includes validation and exact commit recommendation
