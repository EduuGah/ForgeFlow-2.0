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

Conflict:
- apply entity-specific policy
- preserve user data
- never silently overwrite important training history

## Deletion

Delete locally by creating a tombstone. Synchronize tombstone. Physical deletion is a later cleanup concern.
