/* ================================================================
   PCB BACKGROUND CANVAS
   Full-screen fixed canvas showing an animated PCB trace grid with
   glowing signal packets — creates a live circuit board aesthetic
   across the entire site.
================================================================ */
export function initPCBBackground() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'pcb-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');

  /* Pre-parsed color objects for fast rgba() calls */
  const TEAL   = { r: 94,  g: 240, b: 208 };
  const AMBER  = { r: 240, g: 192, b: 94  };
  const VIOLET = { r: 155, g: 141, b: 255 };
  const PALETTE = [TEAL, AMBER, VIOLET];

  const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;

  let W, H, DPR;
  let hTraces = [], vTraces = [], signals = [];
  let raf;

  /* ----------------------------------------------------------------
     Build trace layout + seed signals
  ---------------------------------------------------------------- */
  function buildLayout() {
    hTraces = [];
    vTraces = [];
    signals = [];

    const isMobile  = W < 768;
    const hCount    = isMobile ? Math.max(3, Math.floor(H / 200)) : Math.max(5, Math.floor(H / 140));
    const vCount    = isMobile ? Math.max(2, Math.floor(W / 320)) : Math.max(4, Math.floor(W / 240));
    const baseSpeed = isMobile ? 0.6 : 1.0;

    for (let i = 0; i < hCount; i++) {
      const y   = (H / (hCount + 1)) * (i + 1);
      const col = PALETTE[i % PALETTE.length];
      hTraces.push({ y, col });
      /* Two signals per horizontal trace going in opposite directions */
      signals.push({ axis: 'h', trace: hTraces[i], pos: Math.random() * W, dir:  1, speed: baseSpeed + Math.random() * 0.6 });
      signals.push({ axis: 'h', trace: hTraces[i], pos: Math.random() * W, dir: -1, speed: baseSpeed + Math.random() * 0.6 });
    }

    for (let i = 0; i < vCount; i++) {
      const x   = (W / (vCount + 1)) * (i + 1);
      const col = PALETTE[(i + 1) % PALETTE.length];
      vTraces.push({ x, col });
      /* One signal per vertical trace */
      signals.push({
        axis: 'v', trace: vTraces[i],
        pos: Math.random() * H,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: baseSpeed + Math.random() * 0.5,
      });
    }
  }

  /* ----------------------------------------------------------------
     Resize handler
  ---------------------------------------------------------------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W   = window.innerWidth;
    H   = window.innerHeight;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildLayout();
  }

  /* ----------------------------------------------------------------
     Draw one frame
  ---------------------------------------------------------------- */
  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    /* --- Trace lines --- */
    ctx.lineWidth = 1;
    for (const t of hTraces) {
      ctx.beginPath();
      ctx.moveTo(0, t.y);
      ctx.lineTo(W, t.y);
      ctx.strokeStyle = rgba(t.col, 0.065);
      ctx.stroke();
    }
    for (const t of vTraces) {
      ctx.beginPath();
      ctx.moveTo(t.x, 0);
      ctx.lineTo(t.x, H);
      ctx.strokeStyle = rgba(t.col, 0.065);
      ctx.stroke();
    }

    /* --- Via pads at intersections --- */
    ctx.lineWidth = 0.8;
    for (const h of hTraces) {
      for (const v of vTraces) {
        const vx = v.x, vy = h.y;
        /* Outer ring */
        ctx.beginPath();
        ctx.arc(vx, vy, 3.2, 0, Math.PI * 2);
        ctx.fillStyle   = rgba(TEAL, 0.07);
        ctx.fill();
        ctx.strokeStyle = rgba(TEAL, 0.2);
        ctx.stroke();
        /* Inner core */
        ctx.beginPath();
        ctx.arc(vx, vy, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(TEAL, 0.25);
        ctx.fill();
      }
    }

    /* --- Signals --- */
    for (const s of signals) {
      s.pos += s.speed * s.dir;
      const max = s.axis === 'h' ? W : H;
      if (s.pos > max + 65) s.pos = -65;
      if (s.pos < -65)       s.pos = max + 65;

      const sx = s.axis === 'h' ? s.pos      : s.trace.x;
      const sy = s.axis === 'h' ? s.trace.y  : s.pos;

      /* Trail gradient */
      const TRAIL = 52;
      const tx = s.axis === 'h' ? sx - s.dir * TRAIL : sx;
      const ty = s.axis === 'v' ? sy - s.dir * TRAIL : sy;

      const grad = ctx.createLinearGradient(tx, ty, sx, sy);
      grad.addColorStop(0, rgba(s.trace.col, 0));
      grad.addColorStop(1, rgba(s.trace.col, 0.55));

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.8;
      ctx.stroke();

      /* Signal core dot */
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(s.trace.col, 0.92);
      ctx.fill();

      /* Halo glow */
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
      halo.addColorStop(0, rgba(s.trace.col, 0.38));
      halo.addColorStop(1, rgba(s.trace.col, 0));
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();
    }

    raf = requestAnimationFrame(drawFrame);
  }

  /* ----------------------------------------------------------------
     Initialise
  ---------------------------------------------------------------- */
  resize();
  window.addEventListener('resize', resize, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(drawFrame);
    }
  });

  raf = requestAnimationFrame(drawFrame);
}
