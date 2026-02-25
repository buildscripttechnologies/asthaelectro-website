/* ================================================================
   HERO ANIMATION — staggered load-time reveal
================================================================ */
export function initHeroAnimation() {
  const elements = document.querySelectorAll('[data-hero-anim]');
  if (!elements.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    elements.forEach(el => el.classList.add('hero-visible'));
    return;
  }

  elements.forEach((el) => {
    const index = parseInt(el.getAttribute('data-hero-anim'), 10);
    const delay = 120 + index * 130; // ms stagger per element
    setTimeout(() => el.classList.add('hero-visible'), delay);
  });
}
