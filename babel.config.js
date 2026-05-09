module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@app': './src/app',
          '@core': './src/core',
          '@features': './src/features',
          '@modules': './src/modules',
          '@ui': './src/ui',
        },
        extensions: [
          '.ios.ts',
          '.android.ts',
          '.ios.tsx',
          '.android.tsx',
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.json',
        ],
      },
    ],
    // react-native-reanimated/plugin must be listed last.
    'react-native-reanimated/plugin',
  ],
};
