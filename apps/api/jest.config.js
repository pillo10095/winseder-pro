/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json', diagnostics: false }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock @builderbot/provider-baileys — its CJS bundle loads ESM-only
    // baileys which Jest + ts-jest (CJS mode) cannot parse.
    '^@builderbot/provider-baileys$': '<rootDir>/test/__mocks__/@builderbot/provider-baileys.ts',
  },
};
