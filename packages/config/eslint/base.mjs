import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * Base flat ESLint config shared by every workspace.
 * TypeScript strict; `any` is an error (doc 14 §2 allows it only with an `// expl:` justification,
 * applied as an inline disable on the specific line).
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/storybook-static/**',
      '**/*.config.{js,cjs,mjs,ts}',
      '**/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator=/[*/]/] > MemberExpression[property.name=/amount|price|total|balance/i]",
          message:
            'Raw float arithmetic on money is forbidden — use the Money value object (doc 14 §2).',
        },
      ],
      eqeqeq: ['error', 'always'],
    },
  },
);
