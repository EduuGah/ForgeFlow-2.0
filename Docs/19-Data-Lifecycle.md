# 19 — Data Lifecycle

## Write path

UI action
→ application use case
→ domain validation
→ local repository transaction
→ local database
→ outbox operation
→ UI immediately reflects local state

The network is not part of the critical path for normal writes.

## Sync path

Connectivity available
→ sync worker
→ take pending operation
→ send operation with operationId
→ server authenticates/authorizes
→ server applies transaction
→ server records idempotency result
→ client receives acknowledgement
→ local operation completed
→ pull remote changes
→ local transaction applies changes
→ update cursor

## Failure path

Network failure:
- keep operation pending
- increment retry metadata
- backoff
- retry later

Validation failure:
- do not retry forever
- preserve local record
- surface a recoverable sync error internally
- log safe diagnostics

Media upload failure:
- keep the local file and meal association available offline
- keep upload state in an independent queue
- retry with exponential backoff from 5 minutes up to 24 hours
- allow the user to request an immediate retry

Hydration writes:
- save entries and optional goal changes locally first
- calculate daily totals from non-deleted local entries
- queue entry and goal mutations independently in the standard outbox
- retain tombstones for offline deletion and deterministic reconciliation

Conflict:
- apply entity-specific policy
- preserve user data
- never silently overwrite important training history

## Deletion

Delete locally by creating a tombstone. Synchronize tombstone. Physical deletion is a later cleanup concern.
