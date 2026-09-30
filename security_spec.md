# Security Specification: ForgeFlow 2.0

## 1. Data Invariants

- Each user owns their private root `/users/{userId}` and all subcollections (`templates`, `history`, `prs`, `goals`, `hydration`, `meals`).
- Users cannot read, write, update, or delete other users' documents.
- Unauthenticated requests are rejected.
- Data written to any collection must have valid IDs, conform to length constraints, and match the authenticated user UID (`request.auth.uid == userId`).
- System-level catchall denies all unintended collection paths.

## 2. The "Dirty Dozen" Threat Payloads

1. **Unauthenticated User Profile Read**: Anonymous/unauthenticated `GET /users/victim-123` -> PERMISSION_DENIED.
2. **Cross-User Profile Hijack**: User `attacker-456` attempting `SET /users/victim-123` -> PERMISSION_DENIED.
3. **Spoofed User ID in Templates**: User `attacker-456` inserting `{ userId: 'victim-123' }` into `/users/victim-123/templates/tmpl-1` -> PERMISSION_DENIED.
4. **Oversized String Injection in Workout Name**: Document write with a 20KB workout name string -> PERMISSION_DENIED.
5. **Unauthorized History Tampering**: User `attacker-456` modifying a completed workout in `/users/victim-123/history/hist-1` -> PERMISSION_DENIED.
6. **False PR Attribution**: Writing PR under another user's subcollection -> PERMISSION_DENIED.
7. **Negative Hydration Value Injection**: Writing `amountMl: -5000` -> PERMISSION_DENIED.
8. **Malicious Caloric Overflow**: Inserting extreme negative or non-numeric values in meals -> PERMISSION_DENIED.
9. **Goal Progress Forgery**: Modifying goals belonging to another user -> PERMISSION_DENIED.
10. **Global Catchall Path Traversal**: Querying `{document=**}` on root -> PERMISSION_DENIED.
11. **Path Variable ID Poisoning**: Document IDs with illegal punctuation or control characters -> PERMISSION_DENIED.
12. **Unverified Token Email Spoofing**: Writing records without valid authentication token -> PERMISSION_DENIED.
