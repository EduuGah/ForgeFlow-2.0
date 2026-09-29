# 24 - Pre-release Security Audit

Issue: FF-032. Audit date: 2026-09-29.

## Scope

The review covered authentication and session persistence, ownership checks,
offline repositories and synchronization, public environment configuration,
meal-photo ingestion, persisted diagnostics, structured AI export, bundled
secrets and dependency advisories.

## Controls verified or added

- Native access and refresh tokens are stored with Expo SecureStore. Web preview
  storage remains process memory only and is cleared on reload.
- Persisted session JSON is shape-validated; corrupt values are deleted.
- Preview tokens and user identifiers are opaque random values and no sample
  password or personal data is prefilled in the profile form.
- Registration inputs have bounded lengths and reject control characters in
  passwords before reaching an authentication gateway.
- Production configuration requires an HTTPS API URL. Secrets must never use
  the `EXPO_PUBLIC_` prefix because those values are included in client bundles.
- Selected meal images are limited to JPEG, PNG, WebP, HEIC or HEIF and 10 MB
  before app-owned copies are created. Destination extensions derive from the
  validated MIME type rather than the source filename.
- Sync and upload errors are redacted and bounded before persistence. Passwords,
  API keys, bearer values and token-shaped strings are removed.
- Ownership policy derives ownership from the authenticated principal, strips
  client ownership fields and rejects cross-user and global-record mutation.
- Structured AI export is generated locally and leaves the device only after a
  separate, explicit share/download action.
- Repository search found no committed credentials or application `console`
  logging of private payloads.

## Dependency audit

`npm audit --omit=dev` reported no high or critical findings and 13 moderate
transitive advisories. They originate in Expo CLI/config tooling and the React
Navigation query-string chain. The audit-proposed Expo remediation is an
incompatible downgrade to SDK 46, so it is not applied. Recheck after Expo and
React Navigation publish compatible patched dependency trees; do not use
`npm audit fix --force` for this release.

## Residual risks and release gates

- Authentication, synchronization, media upload and authorization adapters are
  still local preview implementations. A production backend must validate every
  token and scope every read/write independently of client data.
- SQLite is app-sandboxed but not encrypted with SQLCipher. Device encryption,
  lock-screen policy and backup behavior must be validated; stronger at-rest
  protection is required before storing regulated health data.
- A remote media adapter must verify content server-side, generate private object
  keys and use short-lived authenticated URLs. Client MIME checks are defense in
  depth, not proof of content.
- Certificate pinning is not implemented. Release networking must use HTTPS and
  the platform trust store, with pinning considered against its operational cost.
- Account deletion, privacy-policy delivery and server data export remain release
  requirements.
- FF-033 must test the signed Android artifact, inspect bundle contents, verify
  backup/debug settings, exercise token expiry/revocation and run device-level
  authorization and upload-abuse checks against the deployed API.

## Release decision

No known critical or high-severity repository finding remains. The project is
appropriate for local preview and continued release preparation, but is not a
production security approval until the remote adapters and FF-033 release gates
are complete.
