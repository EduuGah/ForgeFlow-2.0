# 25 - Android Release

Issue: FF-033.

## Artifacts

- `preview` creates a signed APK for direct installation and internal validation.
- `production` creates an AAB for Google Play and increments `versionCode` from
  the remote EAS version source.
- Both profiles use remotely managed EAS credentials. Keystores, passwords and
  service-account files must never be committed.

## One-time EAS setup

1. Authenticate with `npx eas-cli login`.
2. Link or create the Expo project with `npx eas-cli init`.
3. Add `EXPO_PUBLIC_API_BASE_URL` to the EAS `production` environment as a
   plain-text HTTPS URL. Public Expo variables are bundled into the client and
   must never contain credentials.
4. Run the first Android build interactively and allow EAS to generate and
   retain the upload keystore.

The repository intentionally does not contain an Expo `projectId` or an API URL
until the account/project and deployed endpoint are known.

## Validation commands

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com'
npm run release:check
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

Install the preview artifact on a connected device with `adb install -r` or use
the EAS installation prompt. The production AAB is intended for the Play Store
and is not directly installable.

## Device checklist

1. Confirm install, cold start, icon and splash screen.
2. Verify registration, session restoration and logout after process restart.
3. Create and complete a workout offline, restart and confirm SQLite recovery.
4. Exercise camera/gallery permissions and reject unsupported or oversized media.
5. Confirm notifications only after contextual permission.
6. Run the accessibility checklist in `23-Accessibility-Audit.md`.
7. Record cold-start, long-list and active-workout performance.
8. Inspect the final APK/AAB for unexpected `.env`, signing or credential files.

## Security decisions

- `android.allowBackup` is disabled because the local database contains private
  training and nutrition data.
- Release Android builds disable cleartext HTTP traffic.
- The Android overlay permission (`SYSTEM_ALERT_WINDOW`) is explicitly blocked.
- The application rejects production startup without an HTTPS API base URL.
- Signed artifact and deployed-API authorization testing remain mandatory before
  public distribution because the current remote adapters are previews.

## Local build evidence

The FF-033 implementation was smoke-tested with a clean Expo Android prebuild
and `:app:assembleRelease` using SDK 36. The generated APK reported package
`com.forgeflow.app`, version `1.0.0` (`versionCode` 1), `minSdk` 24 and
`targetSdk` 36.

That local artifact is signed with the Android debug certificate and must not be
distributed. The deliverable APK/AAB must come from EAS managed credentials.
Installation and cold-start validation also remain pending until an Android
device or emulator is connected.
