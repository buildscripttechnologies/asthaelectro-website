/* ================================================================
   3D TILT — subtle perspective tilt on service & project cards
================================================================ */
export function initTilt() {
  const cards = document.querySelectorAll('.project-card, .service-card');
  if (!cards.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const TILT  = 5;   // max degrees
  const SCALE = 1.02;

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const rx   = ((e.clientY - cy) / (rect.height / 2)) * -TILT;
      const ry   = ((e.clientX - cx) / (rect.width  / 2)) *  TILT;
      card.style.transform =
        `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${SCALE})`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}
