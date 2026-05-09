module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:import/recommended', 'plugin:import/typescript'],
  plugins: ['import'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'warn',
          {prefer: 'type-imports', fixStyle: 'inline-type-imports'},
        ],
      },
    },
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index'],
          'object',
          'type',
        ],
        pathGroups: [
          {pattern: 'react+(|-native)', group: 'external', position: 'before'},
          {pattern: '@(app|core|features|modules|ui)/**', group: 'internal'},
        ],
        pathGroupsExcludedImportTypes: ['react', 'react-native'],
        'newlines-between': 'always',
        alphabetize: {order: 'asc', caseInsensitive: true},
      },
    ],
    'import/no-unresolved': 'off',
    'react-native/no-inline-styles': 'off',
  },
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'coverage/', '*.config.js'],
};
