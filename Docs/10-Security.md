# 10 — Security

## Authentication

Use a secure modern authentication mechanism appropriate to the selected backend. Tokens/secrets must not be stored in plain AsyncStorage.

Use platform secure storage for credentials/session secrets.

FF-008 introduces authentication behind application ports:
- `AuthRemoteGateway` owns register, login, refresh and logout calls.
- `SecureSessionStorage` is the only application contract allowed to persist session secrets.
- The web preview implementation is in-memory only and does not use AsyncStorage.
- Native builds back `SecureSessionStorage` with Expo SecureStore and discard
  malformed persisted sessions.

## Authorization

Every server query/mutation must be scoped to the authenticated user.

Never accept user_id as proof of ownership.

FF-009 adds a server-side ownership policy:
- authenticated principal is required before mutating user-owned data
- ownership is derived from the authenticated principal, not from client payload
- client-provided `user_id`, `userId`, `owner_user_id`, and `ownerUserId` cannot claim another user
- mutations against existing records owned by another user are rejected
- mutations against global/system records without user ownership are rejected by default

## Local data

Workout data must remain usable offline. Sensitive data should use platform/database encryption where appropriate.

## Photos

Photos are personal data. Store only the required metadata in the database and use controlled object storage.

FF-025 requests camera access only when the user explicitly chooses the camera;
gallery selection uses the platform picker. Selected images are copied into
app-owned storage on native clients, and database rows contain references and
minimal metadata rather than image contents. Production uploads must use an
authenticated, access-controlled object-storage adapter.

FF-032 additionally permits only JPEG, PNG, WebP, HEIC and HEIF selections up to
10 MB before creating an app-owned copy. The server must still verify uploaded
content independently.

## Privacy

Provide:
- account deletion
- data export
- privacy policy link
- clear explanation of what is synchronized
- no selling/sharing of personal training data by default

## AI export

AI export should be explicit. Do not automatically send health/nutrition/training data to third-party AI providers without user action and clear consent.

## Logs

Never log:
- passwords
- access tokens
- refresh tokens
- private photo URLs when avoidable
- sensitive user payloads

Sync and upload diagnostics are redacted and length-bounded before persistence.
See `24-Security-Audit.md` for the audit result and residual release risks.

## Mobile security

- secure storage
- certificate/network security appropriate to production
- no API secrets in app bundle
- release builds must disable debug secrets/logging
