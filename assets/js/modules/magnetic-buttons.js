/* ================================================================
   MAGNETIC BUTTONS — subtle pull effect on hero CTAs
================================================================ */
export function initMagneticButtons() {
  const btns = document.querySelectorAll('.hero-actions .mag-btn');
  if (!btns.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  btns.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) * 0.36;
      const dy   = (e.clientY - cy) * 0.26;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}
