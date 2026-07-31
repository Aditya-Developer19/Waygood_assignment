/**
 * tests/mongoSingleton.js
 *
 * Manages a single MongoMemoryServer instance shared across all test files.
 *
 * Why a singleton?
 * When Jest runs tests with --runInBand (sequentially in one process), Node.js
 * module caching ensures this file is only evaluated once. The first test file
 * that calls getUri() starts the MongoDB server. Every subsequent test file
 * reuses the already-running server — no second cold-start needed.
 *
 * Without this, each test file's beforeAll would start its own MongoMemoryServer,
 * which on Windows can take 30–60 seconds for the binary to start — exceeding
 * Jest's default hook timeout.
 */
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer = null;

// Returns the URI for the shared in-memory MongoDB instance.
// Creates and starts the server on the first call; subsequent calls return immediately.
async function getUri() {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  return mongoServer.getUri();
}

// Stops the server. Call this after all test suites have finished.
// With forceExit: true in jest config, the process cleanup handles this automatically,
// but explicit teardown is cleaner.
async function stopServer() {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

module.exports = { getUri, stopServer };
