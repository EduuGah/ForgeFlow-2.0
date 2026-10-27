const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'coverage/**',
      // Deno (Supabase Edge Functions), checked by Supabase on deploy.
      'supabase/functions/**',
    ],
  },
];
