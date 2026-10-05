/**
 * Loads backend/.env before anything else in the process.
 *
 * Why this file exists (bug fix, 2026-10-05): index.js used to call
 * dotenv.config() itself, but at the bottom of its own import list. ES
 * module imports are hoisted and evaluated before any of an importing
 * module's own top-level code runs — so every other import in index.js
 * (including ./app/middleware/securityMiddlewares.js, whose rate limiters
 * read process.env.GLOBAL_RATE_LIMIT_MAX/AUTH_RATE_LIMIT_MAX/
 * OTP_RATE_LIMIT_MAX/etc. at module-evaluation time to build their
 * `createRateLimiter(...)` config) finished evaluating — and therefore
 * already captured whatever was or wasn't in process.env — before
 * dotenv.config() ever ran. The result: rate-limiter overrides (and any
 * other env var read at another module's top level) in backend/.env were
 * silently ignored; only real shell/process environment variables, set
 * before `node index.js` starts, actually worked. Found while load-testing
 * ecomm.appzeto.com with k6 (see docs/load-testing/application-inventory.md
 * "rate limiting" for the full writeup and reproduction).
 *
 * Fix: this module's only job is calling dotenv.config(), and index.js
 * imports it as the FIRST import in the file, before express or any other
 * app module — so its dotenv.config() side effect runs before any other
 * module's top-level code can read process.env. worker.js/scheduler.js
 * already avoided this bug by calling dotenv.config() themselves before a
 * dynamic `await import("./index.js")`; this gives index.js — the direct
 * `node index.js` / Docker CMD / PM2 entry point — the same guarantee
 * without requiring every deployment method to go through a wrapper.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ../../.env relative to this file (backend/app/config/loadEnv.js -> backend/.env)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
