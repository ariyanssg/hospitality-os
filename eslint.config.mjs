import base from '@vela/config/eslint/base';
import boundaries from '@vela/config/eslint/boundaries';
import noRawColor from '@vela/config/eslint/no-raw-color';

/** Root ESLint flat config. App/package-specific configs extend these. */
export default [
  ...base,
  ...boundaries,
  ...noRawColor,
  {
    // NestJS resolves constructor dependencies from `design:paramtypes`, which requires the injected
    // classes to be VALUE imports. `consistent-type-imports` would rewrite them to `import type` and
    // silently break DI — so it is disabled for the API.
    files: ['apps/api/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    // Operational CLI scripts legitimately print to stdout.
    files: ['tooling/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];
