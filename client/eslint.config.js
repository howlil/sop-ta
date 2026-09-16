import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'

const legacyCoreAliases = [
  '@/api/*',
  '@/components/*',
  '@/hooks/*',
  '@/lib/*',
  '@/utils/*',
  '@/config/*',
  '@/stores/*',
]

const featureRestrictedImports = [
  'error',
  {
    patterns: [
      {
        group: [...legacyCoreAliases, '@/pages/*', '@/routes/*'],
        message:
          'Feature modules must use canonical app/features/shared ownership imports and must not depend on pages or routes.',
      },
    ],
  },
]

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      '.tanstack/**',
      'node_modules/**',
      'src/routeTree.gen.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        DOMException: 'readonly',
        HeadersInit: 'readonly',
        React: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
        globalThis: 'readonly',
        import: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    settings: {
      react: { version: '19.2' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-array-index-key': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': featureRestrictedImports,
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/pages/*', '@/routes/*'],
              message:
                'Shared modules must stay domain-agnostic. Move domain-specific behavior into its owning feature.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: [
      'src/features/**/*.test.{ts,tsx}',
      'src/features/**/*.spec.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': featureRestrictedImports,
    },
  },
]
