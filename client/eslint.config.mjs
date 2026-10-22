import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * ESLint config for this app — a Vite + React 19 + TypeScript SPA.
 *
 * This previously extended `eslint-config-next`, which is not installed and
 * does not apply: there is no Next.js anywhere in this project (see
 * vite.config.ts and package.json). That made `npm run lint` fail to start at
 * all. Plugins below are registered explicitly rather than through each
 * plugin's own shared config, so the setup doesn't break when a plugin
 * reshuffles its exports between minor versions.
 */
export default tseslint.config(
  {
    // `.vite` is Vite's generated dependency pre-bundle — vendored library
    // source carrying its own eslint directives for plugins this project
    // doesn't install. Linting it produces nothing but noise.
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.vite/**',
      '**/*.tsbuildinfo',
    ],
  },

  // Application source
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Unused args prefixed with _ are a deliberate signal, not an oversight.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Lint is being adopted on a codebase that has never run it. `any` is
      // widespread in older modules and is a typing debt, not a defect, so it
      // is reported without failing the build. Tighten to 'error' once the
      // existing occurrences are typed.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Tests — vitest globals plus jest-dom matchers
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Enforce shadcn/ui primitives: raw form/table elements are only allowed inside components/ui
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/components/ui/**', '**/*.test.tsx', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...['button', 'select', 'textarea', 'table', 'thead', 'tbody', 'tr', 'th', 'td'].map((tag) => ({
          selector: `JSXOpeningElement[name.name='${tag}']`,
          message: `Use the shadcn component from @/components/ui instead of a raw <${tag}>.`,
        })),
        {
          selector: "JSXOpeningElement[name.name='input']:not(:has(JSXAttribute[name.name='type'][value.value=/^(color|checkbox|radio)$/]))",
          message: 'Use <Input /> from @/components/ui/input instead of a raw <input>.',
        },
      ],
    },
  },

  // Config files run in Node, not the browser
  {
    files: ['*.{js,mjs,cjs,ts}', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
