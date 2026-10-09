module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|native-base|react-native-svg)'
  ],
};
