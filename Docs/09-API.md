# 09 — API Contract

The API is an implementation detail behind repositories/sync services. UI components must not call raw endpoints directly.

## Required capabilities

Authentication:
- register
- login
- refresh/session
- logout
- account deletion

Sync:
- push mutations
- pull changes since cursor
- acknowledge operations
- return server cursor
- report deterministic conflicts

Domain:
- exercises
- workouts
- sessions
- sets
- goals
- body weight
- meals
- hydration
- notifications
- reports

## Sync request

Conceptual shape:

{
  "deviceId": "uuid",
  "operations": [
    {
      "operationId": "uuid",
      "entityType": "set",
      "entityId": "uuid",
      "operation": "upsert",
      "baseVersion": 4,
      "payload": {}
    }
  ],
  "lastServerCursor": "cursor"
}

## Sync response

{
  "accepted": [],
  "conflicts": [],
  "changes": [],
  "nextCursor": "cursor"
}

The actual wire format may differ, but the semantics must remain.

## Error handling

Errors must be machine-readable:
- authentication_error
- authorization_error
- validation_error
- conflict
- rate_limited
- temporary_unavailable
- not_found

Retry only errors classified as retryable.

## Idempotency

Every mutation has an operationId. Retrying an already accepted operation must return the same logical result rather than create duplicates.

## Client sync protocol

FF-006 implements the client-side sync use case behind application ports:
- read the stored cursor from `sync_state`
- read pending `sync_operations`
- send operations with stable `operationId` values
- keep retryable operations pending
- mark accepted operations as completed
- mark non-retryable conflicts as failed
- apply pulled server changes inside a local transaction
- save the returned cursor only after remote changes are applied

Concrete HTTP transport, authentication and entity-specific merge policies are introduced by later issues.
