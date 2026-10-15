// src/utils/cache.js
// Simple in-memory cache with TTL (Time To Live)
// For production with multiple servers, swap this with Redis

const cache = new Map();

/**
 * Get a value from cache
 * @param {string} key
 * @returns {any|null}
 */
const getCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() > entry.expiresAt;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

/**
 * Set a value in cache
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds - Time to live in seconds (default: 60s)
 */
const setCache = (key, value, ttlSeconds = 60) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

/**
 * Delete a specific cache key (or keys matching a prefix)
 * @param {string} keyOrPrefix
 */
const invalidateCache = (keyOrPrefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(keyOrPrefix)) {
      cache.delete(key);
    }
  }
};

module.exports = { getCache, setCache, invalidateCache };