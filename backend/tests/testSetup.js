/**
 * tests/testSetup.js — shared test helper
 *
 * Provides three helper functions used in beforeAll / afterEach / afterAll blocks.
 *
 * Key design decision: we do NOT disconnect Mongoose between test files.
 * All test files share a single MongoMemoryServer instance (via mongoSingleton.js).
 * connectTestDb() is a no-op if Mongoose is already connected, so calling it
 * from multiple beforeAll blocks is safe. Data isolation is handled by
 * clearDatabase(), which deletes all documents after each test.
 */
const mongoose = require("mongoose");
const { getUri, stopServer } = require("./mongoSingleton");

// Connects Mongoose to the shared in-memory MongoDB instance.
// On the first call, this starts MongoMemoryServer and connects.
// On subsequent calls (from later test files), Mongoose is already connected,
// so we skip the connect() to avoid errors.
async function connectTestDb() {
  if (mongoose.connection.readyState === 0) {
    const uri = await getUri();
    await mongoose.connect(uri);
  }
}

// Deletes all documents from every collection.
// Call this in afterEach so each test starts with an empty database.
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

// Intended for afterAll — disconnects Mongoose and stops the shared server.
// With forceExit: true in jest config this is handled by process cleanup,
// but calling it in the final test file's afterAll is cleaner.
async function disconnectTestDb() {
  await mongoose.disconnect();
  await stopServer();
}

module.exports = {
  connectTestDb,
  clearDatabase,
  disconnectTestDb,
};
