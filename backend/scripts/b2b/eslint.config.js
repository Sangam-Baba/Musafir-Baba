// @ts-check
/**
 * ESLint for the B2B code only (src/b2b, tests/b2b, scripts/b2b) — docs/plan/10-coding-standards.md §13.
 * The rest of the backend is not linted by this config (legacy code is not reformatted).
 * Hard architecture rules (no transactions, no imports outside src/b2b, prefixes …) are in
 * scripts/b2b/code-rules.js (`npm run b2b:guards`).
 */
import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';

const NO_DEFAULT_EXPORT = { selector: 'ExportDefaultDeclaration', message: 'Use named exports (10-coding-standards.md §3).' };

export default [
  {
    files: ['src/b2b/**/*.js', 'tests/b2b/**/*.js', 'scripts/b2b/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        TextDecoder: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: { jsdoc },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      ...js.configs.recommended.rules,
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implicit-coercion': ['error', { allow: ['!!'] }],
      'no-restricted-syntax': ['error', NO_DEFAULT_EXPORT],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 15],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'jsdoc/valid-types': 'off', // its parser doesn't know `readonly`; tsc validates all types (typecheck:b2b)
      'jsdoc/check-param-names': 'error',
      'jsdoc/no-undefined-types': 'off', // types are checked by tsc (npm run typecheck:b2b)
    },
  },
  { files: ['tests/b2b/vitest.config.js', 'scripts/b2b/eslint.config.js'], rules: { 'no-restricted-syntax': 'off' } }, // tool configs need a default export
  {
    files: ['src/b2b/**/*.js'],
    rules: {
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'jsdoc/require-jsdoc': ['error', { publicOnly: true, require: { FunctionDeclaration: true } }],
      'jsdoc/require-param-type': 'error',
    },
  },
];
