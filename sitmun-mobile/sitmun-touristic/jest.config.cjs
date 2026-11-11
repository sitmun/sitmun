/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  clearMocks: true,
  restoreMocks: true,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/)?(@angular|@ionic|@stencil|ionicons|@capacitor|rxjs|capacitor-native-settings)|.*\\.mjs$)',
  ],
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
