/* ================================================================
   NAV HIDE — hides navbar on scroll-down, reveals on scroll-up
================================================================ */
export function initNavHide() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let lastY   = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < 100) {
        nav.classList.remove('nav-hidden');
      } else {
        nav.classList.toggle('nav-hidden', y > lastY);
      }
      lastY   = y;
      ticking = false;
    });
    ticking = true;
  }, { passive: true });
}
