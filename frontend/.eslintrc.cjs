module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react-refresh'],
  rules: {
    // React 19 no longer requires React in scope
    'react/react-in-jsx-scope': 'off',

    // Allow default exports for pages
    'import/prefer-default-export': 'off',

    // SVG coordinate props are dynamic — style prop is intentional in ELDLogSheet
    'react/forbid-dom-props': 'off',

    // TypeScript handles prop validation
    'react/require-default-props': 'off',

    // Allow spreading props in composition cases
    'react/jsx-props-no-spreading': ['warn', {
      html: 'enforce',
      custom: 'ignore',
    }],
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
};
