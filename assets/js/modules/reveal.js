/* ================================================================
   SCROLL REVEAL — IntersectionObserver stagger reveal
================================================================ */
export function initReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const siblings = [...(entry.target.parentElement?.querySelectorAll('.reveal:not(.active)') || [])];
        const idx      = siblings.indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('active'), Math.min(idx * 80, 400));
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}
