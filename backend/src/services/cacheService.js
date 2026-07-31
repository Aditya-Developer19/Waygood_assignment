const env = require("../config/env");

// MemoryCacheService — a simple in-process TTL cache backed by a JavaScript Map.
//
// Caching strategy:
//   We cache the results of expensive or frequently-called read-only endpoints
//   (e.g. popular universities, dashboard summary) for a configurable TTL window
//   (default: 300 seconds / 5 minutes, set via CACHE_TTL_SECONDS env var).
//
// Trade-off — staleness vs. speed:
//   During the TTL window, the cached data can be up to 5 minutes behind the
//   database. For the popular-universities list this is acceptable — popularity
//   scores don't change in real time. For the dashboard summary it means counts
//   may lag slightly, but the benefit is that we avoid running 5 parallel Mongo
//   aggregations on every dashboard page load.
//
// Limitation:
//   This cache lives in the Node.js process memory. If you run multiple server
//   instances (e.g. behind a load balancer), each instance has its own cache and
//   they won't share state. For a multi-instance setup, replace this with Redis.
//
// The flush() method is particularly useful in tests — it clears all cached data
// so test runs start with a clean slate and don't interfere with each other.
class MemoryCacheService {
  constructor() {
    // Internal store: key → { value, expiresAt (ms timestamp) }
    this.store = new Map();
  }

  // Returns the cached value for a key if it exists and hasn't expired.
  // Returns null on a miss or if the entry has expired (expired entries are deleted lazily).
  get(key) {
    const record = this.store.get(key);

    if (!record) {
      return null;
    }

    // Lazy expiration — we delete the entry only when someone tries to read it
    // and it's past its TTL. We don't run a background sweep timer.
    if (record.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return record.value;
  }

  // Stores a value with a TTL (in seconds). After the TTL elapses, get() will return null.
  // ttlSeconds defaults to the CACHE_TTL_SECONDS environment variable (or 300 if not set).
  set(key, value, ttlSeconds = env.cacheTtlSeconds) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  // Deletes a single cache entry by key.
  // Useful when data is known to have changed and you want to force a cache refresh.
  delete(key) {
    this.store.delete(key);
  }

  // Clears all cached entries at once.
  // Primarily used in tests to prevent cache state from leaking between test cases.
  flush() {
    this.store.clear();
  }

  // Returns the number of entries currently in the cache (including expired ones
  // that haven't been lazily cleaned up yet). Useful for debugging and test assertions.
  size() {
    return this.store.size;
  }
}

// Export a singleton so all modules share the same cache instance.
module.exports = new MemoryCacheService();
