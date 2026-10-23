/**
 * Two test projects, split by whether the suite needs a database.
 *
 *   unit        — pure logic (utils, the report registry, grading, conflict
 *                 rules). No Mongo setup at all, so these run in milliseconds
 *                 and pass with no cluster reachable.
 *   integration — anything that touches models or drives the API through
 *                 supertest. Connects to MONGODB_URI (db swapped to SMS_Test)
 *                 via jest.setup.js.
 *
 * Before this split every suite paid for the Atlas connection, so `pnpm test`
 * hung for minutes when the cluster was unreachable — even for suites that
 * import nothing but a util. Run `ppnpm test:unit` to skip the database
 * entirely.
 */
export default {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      transform: {},
      // No setupFilesAfterEnv: this project must never open a connection.
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.js',
        // Top-level __tests__ files are pure; __tests__/integration is not.
        '<rootDir>/__tests__/*.test.js'
      ]
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      transform: {},
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: [
        '<rootDir>/tests/*.test.js',
        '<rootDir>/__tests__/integration/**/*.test.js'
      ]
    }
  ],
  globalSetup: './jest.globalSetup.cjs'
};
