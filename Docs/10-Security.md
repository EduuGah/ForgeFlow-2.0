# 10 — Security

## Authentication

Use a secure modern authentication mechanism appropriate to the selected backend. Tokens/secrets must not be stored in plain AsyncStorage.

Use platform secure storage for credentials/session secrets.

FF-008 introduces authentication behind application ports:
- `AuthRemoteGateway` owns register, login, refresh and logout calls.
- `SecureSessionStorage` is the only application contract allowed to persist session secrets.
- The preview implementation is in-memory only and does not use AsyncStorage.
- A production adapter must back `SecureSessionStorage` with platform secure storage before release builds.

## Authorization

Every server query/mutation must be scoped to the authenticated user.

Never accept user_id as proof of ownership.

## Local data

Workout data must remain usable offline. Sensitive data should use platform/database encryption where appropriate.

## Photos

Photos are personal data. Store only the required metadata in the database and use controlled object storage.

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

## Mobile security

- secure storage
- certificate/network security appropriate to production
- no API secrets in app bundle
- release builds must disable debug secrets/logging
