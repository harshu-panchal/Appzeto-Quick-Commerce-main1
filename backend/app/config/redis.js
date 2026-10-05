import Redis from "ioredis";

let _client = null;
let _lastSharedErrorLog = 0;
let _connectionAttempts = 0;

const REDIS_ERROR_LOG_INTERVAL_MS = () =>
  parseInt(process.env.REDIS_ERROR_LOG_INTERVAL_MS || "60000", 10);

/**
 * When false, no Redis connections are created: shared client is null and Bull
 * queues are no-op stubs (use MongoDB orderAutoCancelJob for timeouts).
 *
 * Redis may be disabled in any environment via REDIS_DISABLED=true (or
 * REDIS_ENABLED=false). Prefer Redis in multi-instance production; without it,
 * timeouts fall back to the scheduler job and locks/cache degrade gracefully.
 */
export function isRedisEnabled() {
  const d = process.env.REDIS_DISABLED;
  const e = process.env.REDIS_ENABLED;
  const isProduction = process.env.NODE_ENV === "production";

  // Default: disable Redis in Jest to avoid open handles + noisy retries.
  // Opt-in by setting REDIS_ENABLED=true.
  if (process.env.NODE_ENV === "test" && !(e === "true" || e === "1")) return false;
  if (d === "true" || d === "1") return false;
  if (e === "false" || e === "0") return false;

  // In production with Redis left enabled, require connection config so a
  // misconfigured deploy fails fast instead of silently running degraded.
  if (isProduction) {
    const hasConfig = !!(
      process.env.REDIS_URL ||
      process.env.REDIS_HOST ||
      e === "true" ||
      e === "1"
    );
    if (!hasConfig) {
      throw new Error(
        "Redis is enabled in production but not configured. " +
        "Set REDIS_URL or REDIS_HOST, or set REDIS_DISABLED=true to run without Redis."
      );
    }
  }

  return true;
}

/**
 * Single error handler so ioredis does not emit "Unhandled error event" when
 * Redis is down; logs are rate-limited. Exported so callers who create their
 * own ioredis clients outside this module (e.g. the Socket.IO Redis
 * adapter's duplicated pub/sub connections — duplicate() does NOT inherit
 * the original client's listeners) can attach the same handler instead of
 * leaving a client with zero 'error' listeners.
 */
export function attachRedisErrorHandler(client) {
  if (!client || client.__qcRedisErrorHandler) return;
  client.__qcRedisErrorHandler = true;

  client.on("connect", () => {
    _connectionAttempts = 0;
  });

  client.on("ready", () => {
    // suppress per-connection ready noise
  });

  client.on("error", (err) => {
    const now = Date.now();
    const interval = REDIS_ERROR_LOG_INTERVAL_MS();
    if (now - _lastSharedErrorLog > interval) {
      _lastSharedErrorLog = now;
      const message =
        `[Redis] ${err?.code || err?.message || String(err)} — ` +
        `set REDIS_DISABLED=true to run without Redis.`;
      console.warn(message);
    }
  });

  client.on("close", () => {
    // suppress close noise
  });

  client.on("reconnecting", () => {
    _connectionAttempts++;
  });
}

function standaloneOptions() {
  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 20) return null;
      return Math.min(times * 200, 3000);
    },
  };
}

function urlOptions() {
  return {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 20) return null;
      return Math.min(times * 200, 3000);
    },
  };
}

/**
 * Shared Redis client for caching / rate limits (optional).
 * Returns null when REDIS_DISABLED=true.
 */
export function getRedisClient() {
  if (!isRedisEnabled()) return null;
  if (_client) return _client;

  const url = process.env.REDIS_URL;
  _client = url
    ? new Redis(url, urlOptions())
    : new Redis(standaloneOptions());

  attachRedisErrorHandler(_client);
  return _client;
}

function buildBullConnection(config) {
  const client =
    typeof config === "string"
      ? new Redis(config, {
          lazyConnect: true,
          maxRetriesPerRequest: null,
          retryStrategy(times) {
            if (times > 20) return null;
            return Math.min(times * 200, 3000);
          },
        })
      : new Redis({
          ...config,
          lazyConnect: true,
          maxRetriesPerRequest: null,
        });
  attachRedisErrorHandler(client);
  return client;
}

// Shared per-process 'client'/'subscriber' connections for Bull. Found
// 2026-10-05 (see docs/load-testing/pm2-cluster-deployment.md): every
// queue file previously got its own createClient callback with no sharing,
// so N Bull queues in one process meant N×3 Redis connections (client,
// subscriber, bclient each) — 5 queues in this app (3 in orderQueues.js,
// 2 in notification.queue.js) meant 15 connections per process that
// imports them, which is loaded from both API and worker roles. Once
// Redis was actually enabled in production for the first time (previously
// always REDIS_DISABLED=true), this started hitting the Redis plan's
// max-clients limit ("ERR max number of clients reached").
//
// Per Bull's own documented connection model: 'client' and 'subscriber'
// connections are safe to share across multiple Queue instances in the
// same process (neither enters blocking mode). 'bclient' MUST stay unique
// per queue — it issues blocking reads (BRPOPLPUSH), and sharing it across
// queues would make one queue's blocking wait block every other queue
// sharing that connection. This cuts N queues from 3N connections down to
// N+2 (N unique bclients + 1 shared client + 1 shared subscriber).
let _bullClientConnection = null;
let _bullSubscriberConnection = null;

/**
 * Bull passes (type, config) where config is merged from options.redis.
 * Mirrors bull/lib/queue.js's createClient contract and attaches the same
 * error handler used everywhere else in this module.
 */
export function createBullRedisClient(type, config) {
  if (type === "client") {
    if (!_bullClientConnection) _bullClientConnection = buildBullConnection(config);
    return _bullClientConnection;
  }
  if (type === "subscriber") {
    if (!_bullSubscriberConnection) _bullSubscriberConnection = buildBullConnection(config);
    return _bullSubscriberConnection;
  }
  // 'bclient' (or any future/unknown type) — always a fresh connection.
  return buildBullConnection(config);
}

/**
 * Parse REDIS_URL or host/port for Bull.
 */
export function getRedisOptionsForBull() {
  const url = process.env.REDIS_URL;
  if (url) {
    return url;
  }
  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

/**
 * Validate Redis connectivity with PING command
 * @returns {Promise<boolean>} True if Redis responds to PING
 */
export async function validateRedisConnection() {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const result = await client.ping();
    return result === "PONG";
  } catch (error) {
    console.error("[Redis] Validation failed:", error.message);
    return false;
  }
}

/**
 * Wait for Redis connection with exponential backoff retry logic
 * @param {number} maxRetries - Maximum retry attempts (default: 10)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise<void>}
 * @throws {Error} if connection fails after max retries
 */
export async function waitForRedis(maxRetries = 10, baseDelay = 1000) {
  if (!isRedisEnabled()) {
    return;
  }

  const client = getRedisClient();
  if (!client) {
    throw new Error("Redis client is not initialized");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const maxDelay = 30000; // 30 seconds max delay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try to connect if not already connected
      if (client.status !== "ready" && client.status !== "connect") {
        await client.connect();
      }

      // Validate connection with PING
      const isValid = await validateRedisConnection();
      if (isValid) {
        return;
      }
    } catch (error) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        const errorMessage = `Failed to connect to Redis after ${maxRetries} attempts: ${error.message}`;
        if (isProduction) {
          console.warn(`[Redis] ${errorMessage} - Continuing without Redis (set REDIS_DISABLED=true to skip retries).`);
          return;
        } else {
          console.warn(`[Redis] ${errorMessage} - Continuing without Redis`);
          return;
        }
      }

      console.log(
        `[Redis] Connection attempt ${attempt}/${maxRetries} failed: ${error.message}. ` +
        `Retrying in ${delay}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
