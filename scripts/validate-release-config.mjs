import { readFile } from 'node:fs/promises';

const app = JSON.parse(await readFile(new URL('../app.json', import.meta.url)));
const eas = JSON.parse(await readFile(new URL('../eas.json', import.meta.url)));
const errors = [];
const expo = app.expo ?? {};
const android = expo.android ?? {};
const profiles = eas.build ?? {};

expect(
  expo.version === '1.0.0',
  'expo.version must define the public release version.',
);
expect(
  Number.isInteger(android.versionCode) && android.versionCode > 0,
  'expo.android.versionCode must be a positive integer.',
);
expect(
  android.package === 'com.forgeflow.app',
  'Android application ID changed unexpectedly.',
);
expect(
  android.allowBackup === false,
  'Android backups must be disabled for private app data.',
);
expect(
  android.blockedPermissions?.includes(
    'android.permission.SYSTEM_ALERT_WINDOW',
  ),
  'Android overlay permission must be blocked in release builds.',
);
const buildProperties = expo.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
);
expect(
  buildProperties?.[1]?.android?.usesCleartextTraffic === false,
  'Android release builds must disable cleartext HTTP traffic.',
);
expect(
  profiles.base?.credentialsSource === 'remote',
  'EAS credentials must be managed remotely.',
);
expect(
  profiles.base?.environment === 'production',
  'Release profiles must read the EAS production environment.',
);
expect(
  profiles.preview?.android?.buildType === 'apk',
  'The preview profile must create an installable APK.',
);
expect(
  profiles.production?.android?.buildType === 'app-bundle',
  'The production profile must create a Play Store AAB.',
);
expect(
  profiles.production?.autoIncrement === true &&
    eas.cli?.appVersionSource === 'remote',
  'Production versionCode must auto-increment from the EAS remote source.',
);

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
expect(
  Boolean(apiBaseUrl),
  'EXPO_PUBLIC_API_BASE_URL is required for release validation.',
);
if (apiBaseUrl) {
  try {
    expect(
      new URL(apiBaseUrl).protocol === 'https:',
      'EXPO_PUBLIC_API_BASE_URL must use HTTPS.',
    );
  } catch {
    errors.push('EXPO_PUBLIC_API_BASE_URL must be a valid URL.');
  }
}

const publicVariables = Object.keys(process.env).filter((key) =>
  key.startsWith('EXPO_PUBLIC_'),
);
for (const key of publicVariables) {
  expect(
    !/(SECRET|PASSWORD|PRIVATE|TOKEN|API_KEY|SIGNING)/i.test(key),
    `${key} looks sensitive and must not be embedded in the client bundle.`,
  );
}

if (errors.length > 0) {
  console.error(`Release configuration is invalid:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Release configuration valid: ${expo.version} (${android.versionCode}), ${android.package}.`,
  );
}

function expect(condition, message) {
  if (!condition) errors.push(message);
}
