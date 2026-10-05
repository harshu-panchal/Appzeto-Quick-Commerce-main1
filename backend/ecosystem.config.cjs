/**
 * PM2 process config for a single-VPS deployment (e.g. Hostinger KVM4).
 *
 * Mirrors the role model already used by Dockerfile/docker-compose.yml
 * (PROCESS_ROLE=api|worker|scheduler, one codebase) — this just gives that
 * same model a non-Docker way to run with the `api` role using more than
 * one CPU core.
 *
 * REQUIRES REDIS ENABLED before running more than 1 `api` instance.
 * Socket.IO's room state (order tracking, notifications) is per-process by
 * default; `backend/app/socket/socketRedisAdapter.js` wires in the
 * official Redis adapter so rooms work correctly across processes, but
 * only if Redis is actually reachable (REDIS_DISABLED must NOT be true,
 * and REDIS_URL/REDIS_HOST must be set). Running clustered without this
 * will silently break real-time order tracking for some users — see that
 * file's comment and docs/load-testing/bottleneck-report.md for the full
 * writeup of why this matters here specifically.
 *
 * `worker` and `scheduler` are intentionally left at 1 instance / fork
 * mode:
 *   - `scheduler` runs cron-style jobs (auto-cancel, payout-batch, wallet
 *     ledger verifier, ...) that are NOT safe to run as multiple
 *     concurrent copies — each would independently trigger the same
 *     scheduled action. This MUST stay a singleton.
 *   - `worker` processes Bull queues, which ARE safe to scale with
 *     multiple concurrent consumers (Bull handles job locking) — 1 is a
 *     conservative default, not a hard limit. Raise it later if queue
 *     throughput (not API latency) turns out to be the bottleneck.
 *
 * Usage:
 *   npm install -g pm2          # if not already installed
 *   cd backend
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 monit                   # watch CPU/memory per instance live
 *   pm2 logs quickcommerce-api
 *
 * PM2_API_INSTANCES env var controls how many `api` instances to run
 * (default: "max", i.e. one per CPU core — os.cpus().length). On a 4-vCPU
 * box you likely want to leave headroom for the worker/scheduler
 * processes and the OS; consider PM2_API_INSTANCES=3 on a KVM4 rather
 * than the full 4, and compare via a load-testing re-run either way (see
 * docs/load-testing/).
 */
module.exports = {
  apps: [
    {
      name: "quickcommerce-api",
      script: "./index.js",
      cwd: __dirname,
      exec_mode: "cluster",
      instances: process.env.PM2_API_INSTANCES || "max",
      env: {
        PROCESS_ROLE: "api",
      },
      env_production: {
        PROCESS_ROLE: "api",
        NODE_ENV: "production",
      },
      max_memory_restart: "800M",
      watch: false,
    },
    {
      name: "quickcommerce-worker",
      script: "./worker.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      env: {
        PROCESS_ROLE: "worker",
      },
      env_production: {
        PROCESS_ROLE: "worker",
        NODE_ENV: "production",
      },
      max_memory_restart: "500M",
      watch: false,
    },
    {
      name: "quickcommerce-scheduler",
      script: "./scheduler.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1, // MUST stay 1 — see file header comment
      env: {
        PROCESS_ROLE: "scheduler",
      },
      env_production: {
        PROCESS_ROLE: "scheduler",
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      watch: false,
    },
  ],
};
