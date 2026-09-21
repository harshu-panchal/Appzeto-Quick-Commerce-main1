/**
 * Recovery for stale lazy-loaded chunks.
 *
 * Every deploy renames the hashed JS chunks. A tab (or cached index.html) from the previous
 * deploy then requests a chunk that no longer exists, and the dynamic import fails. Reloading
 * fetches the new index.html and the new chunk names, so we reload — but only once per short
 * window, so a genuinely broken chunk can't cause an infinite reload loop.
 */
const RELOAD_KEY = 'chunk_reload_at';
const RELOAD_WINDOW_MS = 15000;

const CHUNK_ERROR_PATTERN =
    /dynamically imported module|importing a module script failed|failed to fetch dynamically|error loading dynamically|loading chunk .* failed|unable to preload css|is not a valid javascript mime type/i;

export function isChunkLoadError(error) {
    const message = typeof error === 'string' ? error : error?.message || '';
    return CHUNK_ERROR_PATTERN.test(message) || error?.name === 'ChunkLoadError';
}

/** Reloads the page unless we already did so moments ago. Returns whether a reload was started. */
export function reloadOnceForNewDeploy() {
    try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last < RELOAD_WINDOW_MS) return false;
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
        // sessionStorage unavailable (private mode etc.): reload anyway, can't loop-guard.
    }
    window.location.reload();
    return true;
}

export function installChunkErrorRecovery() {
    // Fired by Vite when a dynamic import's chunk (or its CSS) fails to load.
    window.addEventListener('vite:preloadError', (event) => {
        if (reloadOnceForNewDeploy()) event.preventDefault();
    });
}
