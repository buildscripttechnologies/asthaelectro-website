/* ================================================================
   DOT GRID — Interactive Linear/Vercel-style hero canvas
================================================================ */
export function initDotGrid() {
  const canvas = document.getElementById('dot-grid');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const hero   = canvas.parentElement;
  let W, H, dots = [];
  let mouseX = -9999, mouseY = -9999;
  let animId;

  const SPACING      = 32;
  const BASE_R       = 1.0;
  const PEAK_R       = 2.4;
  const BASE_ALPHA   = 0.13;
  const PEAK_ALPHA   = 0.85;
  const MOUSE_RADIUS = 190;
  const LERP         = 0.10;
  const DOT_COLOR    = '94, 240, 208'; // teal rgb values

  function resize() {
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    buildDots();
  }

  function buildDots() {
    dots = [];
    const cols = Math.ceil(W / SPACING) + 1;
    const rows = Math.ceil(H / SPACING) + 1;
    const ox   = (W % SPACING) / 2;
    const oy   = (H % SPACING) / 2;

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        dots.push({
          x: ox + c * SPACING,
          y: oy + r * SPACING,
          alpha:  BASE_ALPHA,
          radius: BASE_R,
        });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const d of dots) {
      const dx   = d.x - mouseX;
      const dy   = d.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const t = Math.max(0, 1 - dist / MOUSE_RADIUS);
      const targetAlpha  = BASE_ALPHA  + (PEAK_ALPHA  - BASE_ALPHA)  * t * t;
      const targetRadius = BASE_R      + (PEAK_R      - BASE_R)      * t * t;

      d.alpha  += (targetAlpha  - d.alpha)  * LERP;
      d.radius += (targetRadius - d.radius) * LERP;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${DOT_COLOR}, ${d.alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }, { passive: true });

  hero.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  hero.addEventListener('touchmove', (e) => {
    const rect = hero.getBoundingClientRect();
    const t = e.touches[0];
    mouseX = t.clientX - rect.left;
    mouseY = t.clientY - rect.top;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animId = requestAnimationFrame(loop);
  });

  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(animId);
    resize();
    animId = requestAnimationFrame(loop);
  });
  ro.observe(hero);

  resize();
  animId = requestAnimationFrame(loop);
}
