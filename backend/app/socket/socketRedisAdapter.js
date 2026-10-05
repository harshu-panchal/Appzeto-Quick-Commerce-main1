/**
 * Socket.IO Redis adapter — REQUIRED before running more than one API
 * process (PM2 cluster mode, multiple Docker replicas, etc.).
 *
 * Why this exists: Socket.IO rooms (`customer:<id>`, `seller:<id>`,
 * `delivery:<id>`, `order:<id>`, `admin:orders`, ...) are held in-memory,
 * per-process, by default. With a single process that's fine. The moment
 * there's more than one process, a client's socket connection lands on
 * exactly one of them — and `io.to('customer:123').emit(...)` called from
 * a DIFFERENT process (e.g. one handling the HTTP request that triggered
 * the event) would silently never reach that client, because the two
 * processes don't share room membership. This is not a hypothetical: this
 * app's `backend/app/services/orderSocketEmitter.js` /
 * `ticketSocketEmitter.js` emit from whichever process handled the
 * triggering HTTP request, not necessarily the one holding the target
 * socket — so without this adapter, real-time order tracking and
 * notifications would silently break for some fraction of users as soon
 * as the app runs on more than one process. Confirmed during a 2026-10-05
 * load-testing investigation (see docs/load-testing/bottleneck-report.md)
 * that no such adapter existed yet, while the clustering fix for a
 * separate latency finding was being drafted — wiring this in first.
 *
 * Requires Redis to be enabled (REDIS_DISABLED=true / no Redis configured
 * means this returns null and Socket.IO falls back to its default
 * single-process in-memory adapter — correct for one process, broken for
 * more than one).
 */
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClient, isRedisEnabled } from "../config/redis.js";
import logger from "../services/logger.js";

/**
 * Returns a Socket.IO adapter factory to pass as `new Server(server, {
 * adapter: ... })`, or null if Redis is disabled (single-process mode).
 *
 * Uses two dedicated connections (pub/sub), duplicated from the shared
 * Redis client's connection config — the Redis protocol requires a
 * connection in subscribe mode to not be used for other commands, so it
 * can't reuse the shared client directly.
 */
export function createSocketIoRedisAdapter() {
  if (!isRedisEnabled()) {
    if (process.env.NODE_APP_INSTANCE !== undefined) {
      // NODE_APP_INSTANCE is set by PM2 for every clustered process —
      // its presence without Redis enabled means Socket.IO rooms will NOT
      // work correctly across instances. Warn loudly rather than fail
      // silently; this is exactly the hard-to-notice-until-production bug
      // this module exists to prevent.
      logger.warn(
        "Running under PM2 (NODE_APP_INSTANCE set) with Redis disabled — " +
        "Socket.IO cross-process broadcast will NOT work; real-time order " +
        "tracking/notifications will silently fail for some users. Enable " +
        "Redis (unset REDIS_DISABLED, set REDIS_URL or REDIS_HOST) before " +
        "running more than one API process.",
      );
    }
    return null;
  }

  const base = getRedisClient();
  if (!base) return null;

  const pubClient = base.duplicate();
  const subClient = base.duplicate();

  return createAdapter(pubClient, subClient);
}

export default { createSocketIoRedisAdapter };
