import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** React-specific flat config for the Next.js apps. */
export default [
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
