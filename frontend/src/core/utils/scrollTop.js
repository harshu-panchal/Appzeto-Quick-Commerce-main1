/**
 * Jump to the top of the page instantly. On desktop the Lenis smooth-scroller
 * owns the scroll position and would animate back to where it was after a
 * plain window.scrollTo, so go through Lenis when it is running.
 */
export function scrollPageToTop() {
  if (typeof window === "undefined") return;
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scrollTo === "function") {
    lenis.scrollTo(0, { immediate: true, force: true });
  }
  window.scrollTo(0, 0);
}

/**
 * Smoothly animate to the top of the page.
 */
export function smoothScrollToTop() {
  if (typeof window === "undefined") return;
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scrollTo === "function") {
    lenis.scrollTo(0, { duration: 1.2 });
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }
  document.documentElement?.scrollTo?.({ top: 0, behavior: "smooth" });
  document.body?.scrollTo?.({ top: 0, behavior: "smooth" });
}
