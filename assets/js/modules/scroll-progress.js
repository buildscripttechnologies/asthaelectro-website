/* ================================================================
   SCROLL PROGRESS BAR — thin teal line at top of viewport
================================================================ */
export function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const pct = (scrollTop / (scrollHeight - clientHeight)) * 100;
    bar.style.transform = `scaleX(${pct / 100})`;
  }, { passive: true });
}
