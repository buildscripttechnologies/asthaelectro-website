/* ================================================================
   SCROLL REVEAL — IntersectionObserver stagger reveal
   Handles: .reveal  .reveal-left  .reveal-right  .reveal-scale
================================================================ */
export function initReveal() {
  const SELECTOR = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .step-connector';
  const elements = document.querySelectorAll(SELECTOR);
  if (!elements.length) return;

  const notActive = '.reveal:not(.active), .reveal-left:not(.active), .reveal-right:not(.active), .reveal-scale:not(.active), .step-connector:not(.active)';

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const siblings = [...(entry.target.parentElement?.querySelectorAll(notActive) || [])];
        const idx      = siblings.indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('active'), Math.min(idx * 90, 450));
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.10, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}
