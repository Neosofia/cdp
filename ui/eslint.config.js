import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Data-fetch hooks sync loading/error state when effects run or poll.
    files: ['src/**/use*.ts'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Sheets and views reset local UI state when open targets change.
    files: ['src/components/**/*.tsx', 'src/features/**/*.tsx', 'src/shared/**/*.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
