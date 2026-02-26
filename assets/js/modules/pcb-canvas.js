/* ================================================================
   PCB CANVAS — Minimal but eye-catching
   Near-black board. Ghost circuit. 1-2 glowing signal orbs that
   spotlight the traces as they travel. Each slide = different path.
================================================================ */
export function initPCBCanvas() {
  const frame  = document.querySelector('.pcb-frame');
  const canvas = document.getElementById('pcb-canvas');
  if (!frame || !canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  canvas.style.transition = 'opacity 0.45s ease';

  /* ── Palette ─────────────────────────────────────────────── */
  const TEAL   = { r: 94,  g: 240, b: 208 };
  const AMBER  = { r: 255, g: 195, b: 75  };
  const VIOLET = { r: 180, g: 155, b: 255 };
  const SNOW   = { r: 240, g: 252, b: 255 };
  const COPPER = { r: 190, g: 145, b: 60  };
  const cc = (col, a) => `rgba(${col.r},${col.g},${col.b},${(+a).toFixed(3)})`;

  let CW = 0, CH = 0, DPR = 1;
  let raf = null, scene = 0, tick = 0;

  /* Board coords — minimal 2 % margin so board fills frame    */
  const M  = 0.025;
  const BX = () => CW * M;
  const BY = () => CH * M;
  const BW = () => CW * (1 - 2*M);
  const BH = () => CH * (1 - 2*M);
  const px = rx => BX() + rx * BW();
  const py = ry => BY() + ry * BH();
  const pw = rw => rw * BW();

  /* ── Ghost component wireframes ─────────────────────────── */
  const COMP = [
    { x:0.34, y:0.26, w:0.28, h:0.36, col:TEAL   }, /* MCU  */
    { x:0.05, y:0.27, w:0.18, h:0.26, col:TEAL   }, /* DDR5 */
    { x:0.64, y:0.04, w:0.21, h:0.19, col:AMBER  }, /* RF   */
    { x:0.88, y:0.07, w:0.07, h:0.30, col:AMBER  }, /* ANT  */
    { x:0.06, y:0.66, w:0.17, h:0.19, col:VIOLET }, /* PMIC */
    { x:0.54, y:0.73, w:0.14, h:0.20, col:TEAL   }, /* USB  */
    { x:0.70, y:0.30, w:0.15, h:0.18, col:VIOLET }, /* ADC  */
  ];

  /* ── Ghost trace network ─────────────────────────────────── */
  const TRACES = [
    [[0.23,0.36],[0.34,0.36]],   /* DDR5 ↔ MCU */
    [[0.23,0.40],[0.34,0.40]],
    [[0.23,0.44],[0.34,0.44]],
    [[0.62,0.33],[0.66,0.20],[0.66,0.14]],  /* MCU → RF */
    [[0.88,0.14],[0.85,0.14]],              /* RF  → ANT */
    [[0.62,0.37],[0.70,0.37]],              /* MCU → ADC */
    [[0.62,0.42],[0.70,0.42]],
    [[0.60,0.62],[0.60,0.73]],              /* MCU → USB */
    [[0.62,0.62],[0.62,0.73]],
    [[0.46,0.26],[0.46,0.13]],              /* MCU → XTAL */
    [[0.34,0.62],[0.34,0.73],[0.23,0.73]], /* MCU → PWR */
    [[0.23,0.73],[0.23,0.44]],              /* PWR rail   */
  ];

  /* ── Via pads ───────────────────────────────────────────── */
  const VIAS = [
    [0.34,0.73],[0.60,0.62],[0.46,0.13],
    [0.66,0.20],[0.70,0.37],[0.23,0.44],
  ];

  /* ── Scene definitions ───────────────────────────────────── */
  /* Each scene: 1-2 particles following a route               */
  const SCENES = [
    /* 0 – Overview: slow grand tour, teal */
    { particles:[
        { route:[[0.23,0.40],[0.34,0.40],[0.62,0.40],[0.66,0.33],[0.66,0.14],
                 [0.66,0.33],[0.62,0.37],[0.70,0.37],[0.62,0.37],[0.62,0.62],
                 [0.60,0.73],[0.46,0.73],[0.34,0.73],[0.23,0.73],[0.23,0.40]],
          col:TEAL, spd:0.0030, phase:0.0 },
      ], glowR:28, trailLen:32 },

    /* 1 – Schematic: orbit around MCU, single signal */
    { particles:[
        { route:[[0.30,0.22],[0.68,0.22],[0.68,0.66],[0.30,0.66],[0.30,0.22]],
          col:TEAL, spd:0.0025, phase:0.0 },
      ], glowR:32, trailLen:38 },

    /* 2 – High-Speed DDR: 2 fast signals on diff pairs */
    { particles:[
        { route:[[0.23,0.36],[0.34,0.36]], col:TEAL, spd:0.022, phase:0.0 },
        { route:[[0.34,0.44],[0.23,0.44]], col:TEAL, spd:0.022, phase:0.0 },
      ], glowR:22, trailLen:20 },

    /* 3 – RF / Antenna: travels to antenna, then arcs */
    { particles:[
        { route:[[0.34,0.33],[0.62,0.33],[0.66,0.20],[0.66,0.14],[0.88,0.14]],
          col:AMBER, spd:0.0035, phase:0.0 },
      ], glowR:30, trailLen:36 },

    /* 4 – Production: slow diagonal sweep, violet */
    { particles:[
        { route:[[0.05,0.05],[0.95,0.95]], col:VIOLET, spd:0.0020, phase:0.0 },
        { route:[[0.95,0.05],[0.05,0.95]], col:VIOLET, spd:0.0020, phase:0.5 },
      ], glowR:35, trailLen:45 },
  ];

  let particles = [];

  function initParticles() {
    const def = SCENES[scene];
    particles = def.particles.map(p => ({
      ...p,
      t:    p.phase,
      hist: [],
    }));
  }

  function posOnRoute(route, t) {
    const tt  = ((t % 1) + 1) % 1;
    const seg = tt * (route.length - 1);
    const i   = Math.min(Math.floor(seg), route.length - 2);
    const f   = seg - i;
    return [route[i][0]+(route[i+1][0]-route[i][0])*f,
            route[i][1]+(route[i+1][1]-route[i][1])*f];
  }

  function stepParticle(p) {
    p.hist.unshift(posOnRoute(p.route, p.t));
    const maxLen = SCENES[scene].trailLen;
    if (p.hist.length > maxLen) p.hist.pop();
    p.t = (p.t + p.spd) % 1;
  }

  /* ── Drawing ─────────────────────────────────────────────── */

  function drawBoard() {
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 8);
    ctx.fillStyle = 'rgba(0,0,0,0.97)'; ctx.fill();

    /* Barely-there board border */
    ctx.strokeStyle = cc(TEAL, 0.18);
    ctx.lineWidth   = 1.0;
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 8); ctx.stroke();

    /* Corner fiducials */
    [[BX()+10,BY()+10],[BX()+BW()-10,BY()+10],
     [BX()+10,BY()+BH()-10],[BX()+BW()-10,BY()+BH()-10]].forEach(([fx,fy]) => {
      ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI*2);
      ctx.strokeStyle = cc(TEAL, 0.22); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI*2);
      ctx.fillStyle = cc(COPPER, 0.55); ctx.fill();
    });
  }

  function drawGhostCircuit() {
    /* Ghost traces — barely visible */
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    TRACES.forEach(pts => {
      ctx.beginPath();
      ctx.moveTo(px(pts[0][0]), py(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(px(pts[i][0]), py(pts[i][1]));
      ctx.strokeStyle = cc(TEAL, 0.08);
      ctx.lineWidth   = 1.0; ctx.stroke();
    });

    /* Ghost component outlines */
    COMP.forEach(c => {
      ctx.beginPath(); ctx.roundRect(px(c.x), py(c.y), pw(c.w), pw(c.h), 3);
      ctx.strokeStyle = cc(c.col, 0.12);
      ctx.lineWidth   = 0.8; ctx.stroke();
    });

    /* Ghost vias */
    VIAS.forEach(([rx,ry]) => {
      ctx.beginPath(); ctx.arc(px(rx), py(ry), 3.5, 0, Math.PI*2);
      ctx.strokeStyle = cc(TEAL, 0.14); ctx.lineWidth = 0.7; ctx.stroke();
      ctx.beginPath(); ctx.arc(px(rx), py(ry), 1.2, 0, Math.PI*2);
      ctx.fillStyle = cc(COPPER, 0.40); ctx.fill();
    });
  }

  /* Spotlight: brightens nearby traces as signal passes */
  function drawSpotlightTraces(sigX, sigY, col) {
    TRACES.forEach(pts => {
      /* Find closest point on segment to signal */
      let minDist = Infinity;
      for (let i = 0; i < pts.length - 1; i++) {
        const ax=pts[i][0], ay=pts[i][1], bx2=pts[i+1][0], by2=pts[i+1][1];
        const dx=bx2-ax, dy=by2-ay, len2=dx*dx+dy*dy;
        if (len2 < 0.00001) continue;
        const t2 = Math.max(0, Math.min(1, ((sigX-ax)*dx+(sigY-ay)*dy)/len2));
        const cx2=ax+t2*dx, cy2=ay+t2*dy;
        const d = Math.sqrt((sigX-cx2)**2+(sigY-cy2)**2);
        minDist = Math.min(minDist, d);
      }
      const reach = 0.12;
      if (minDist > reach) return;
      const a = (1 - minDist/reach) * 0.65;
      ctx.beginPath();
      ctx.moveTo(px(pts[0][0]), py(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(px(pts[i][0]), py(pts[i][1]));
      ctx.strokeStyle = cc(col, a);
      ctx.lineWidth   = 1.6; ctx.stroke();
    });

    /* Spotlight near components */
    COMP.forEach(c => {
      const cx2 = c.x + c.w/2, cy2 = c.y + c.h/2;
      const d  = Math.sqrt((sigX-cx2)**2+(sigY-cy2)**2);
      if (d > 0.20) return;
      const a = (1 - d/0.20) * 0.40;
      ctx.beginPath(); ctx.roundRect(px(c.x), py(c.y), pw(c.w), pw(c.h), 3);
      ctx.strokeStyle = cc(col, a); ctx.lineWidth = 1.2; ctx.stroke();
    });

    /* Via "ping" */
    VIAS.forEach(([rx,ry]) => {
      const d = Math.sqrt((sigX-rx)**2+(sigY-ry)**2);
      if (d > 0.06) return;
      const a = (1 - d/0.06);
      ctx.beginPath(); ctx.arc(px(rx), py(ry), 4.5, 0, Math.PI*2);
      ctx.strokeStyle = cc(col, a * 0.8); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(px(rx), py(ry), 1.8, 0, Math.PI*2);
      ctx.fillStyle = cc(col, a); ctx.fill();
    });
  }

  /* The glowing orb with long fading trail */
  function drawOrb(p, glowR) {
    const hist = p.hist;
    if (!hist.length) return;

    /* Trail — gradient line segments */
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = hist.length - 1; i > 0; i--) {
      const prog = 1 - i/hist.length;
      const [x1,y1] = hist[i], [x2,y2] = hist[i-1];
      if (Math.abs(x1-x2) > 0.15 || Math.abs(y1-y2) > 0.15) continue;
      ctx.beginPath();
      ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2));
      ctx.strokeStyle = cc(p.col, prog * 0.80);
      ctx.lineWidth   = prog * 3.5;
      ctx.stroke();
    }

    const [hx,hy] = hist[0];
    const sx = px(hx), sy = py(hy);

    /* Outer soft halo — very large, very faint */
    const outerR = glowR * 3.2;
    const outer  = ctx.createRadialGradient(sx, sy, 0, sx, sy, outerR);
    outer.addColorStop(0,   cc(p.col, 0.08));
    outer.addColorStop(0.5, cc(p.col, 0.03));
    outer.addColorStop(1,   cc(p.col, 0));
    ctx.beginPath(); ctx.arc(sx, sy, outerR, 0, Math.PI*2);
    ctx.fillStyle = outer; ctx.fill();

    /* Mid glow */
    const mid = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    mid.addColorStop(0, cc(p.col, 0.75));
    mid.addColorStop(1, cc(p.col, 0));
    ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, Math.PI*2);
    ctx.fillStyle = mid; ctx.fill();

    /* White-hot core */
    ctx.shadowColor = cc(p.col, 1.0);
    ctx.shadowBlur  = 16;
    ctx.beginPath(); ctx.arc(sx, sy, 3.8, 0, Math.PI*2);
    ctx.fillStyle = cc(SNOW, 1.0); ctx.fill();
    ctx.shadowBlur = 0;
  }

  /* ── Scene-specific overlays ─────────────────────────────── */

  function overlayScene1() {
    /* Slow breathing pulse from MCU center */
    const mcu = COMP[0];
    const mx  = px(mcu.x + mcu.w/2), my = py(mcu.y + mcu.h/2);
    const brt = 0.5 + 0.5 * Math.sin(tick * 0.030);
    [pw(0.36), pw(0.26), pw(0.16)].forEach((r, i) => {
      const rg = ctx.createRadialGradient(mx, my, 0, mx, my, r);
      rg.addColorStop(0, cc(TEAL, (0.10 - i*0.03)*brt));
      rg.addColorStop(1, cc(TEAL, 0));
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI*2);
      ctx.fillStyle = rg; ctx.fill();
    });
  }

  function overlayScene2() {
    /* "Data burst" flicker on DDR traces */
    if (tick % 8 < 3) {
      [[0.23,0.38],[0.34,0.38]].forEach(([ax,ay], i, arr) => {
        if (i === arr.length-1) return;
        ctx.beginPath();
        ctx.moveTo(px(arr[i][0]), py(arr[i][1]));
        ctx.lineTo(px(arr[i+1][0]), py(arr[i+1][1]));
        ctx.strokeStyle = cc(TEAL, 0.55);
        ctx.lineWidth   = 2.0; ctx.stroke();
      });
    }
    /* Annotation */
    ctx.font = '9px monospace'; ctx.fillStyle = cc(TEAL, 0.55); ctx.textAlign = 'center';
    ctx.fillText('DDR5-6400 MT/s', px(0.285), py(0.52));
  }

  function overlayScene3() {
    /* Expanding rings from antenna tip */
    const antTipX = px(0.915), antTipY = py(0.10);
    for (let i = 0; i < 5; i++) {
      const phase = ((tick * 0.012) + i/5) % 1;
      const r     = phase * pw(0.42);
      const a     = (1 - phase) * 0.50;
      ctx.beginPath(); ctx.arc(antTipX, antTipY, r, -Math.PI, 0);
      ctx.strokeStyle = cc(AMBER, a); ctx.lineWidth = 1.8; ctx.stroke();
    }
    ctx.font = '9px monospace'; ctx.fillStyle = cc(AMBER, 0.55); ctx.textAlign = 'center';
    ctx.fillText('2.4 / 5 GHz', px(0.75), py(0.46));
  }

  function overlayScene4() {
    /* Gentle layer tint cycling */
    const phase = (tick % 400) / 400;
    const cols  = [TEAL, {r:60,g:200,b:105}, AMBER, VIOLET];
    const ci    = Math.floor(phase * 4) % 4;
    const fade  = (phase * 4) % 1;
    const col   = cols[ci];
    const a     = Math.sin(fade * Math.PI) * 0.06;
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 8);
    ctx.fillStyle = cc(col, a); ctx.fill();
    ctx.font = '9px monospace'; ctx.fillStyle = cc(VIOLET, 0.55); ctx.textAlign = 'center';
    ctx.fillText('Production-Ready', px(0.5), py(0.55));
  }

  /* ── Main render ─────────────────────────────────────────── */
  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    tick++;

    drawBoard();
    drawGhostCircuit();

    const def = SCENES[scene];

    /* Spotlight + move particles */
    particles.forEach(p => {
      stepParticle(p);
      if (p.hist.length) {
        const [hx,hy] = p.hist[0];
        drawSpotlightTraces(hx, hy, p.col);
      }
    });

    /* Scene overlays */
    if (scene === 1) overlayScene1();
    if (scene === 2) overlayScene2();
    if (scene === 3) overlayScene3();
    if (scene === 4) overlayScene4();

    /* Draw orbs on top */
    particles.forEach(p => drawOrb(p, def.glowR));

    raf = requestAnimationFrame(draw);
  }

  /* ── Scene change ────────────────────────────────────────── */
  function changeScene(n) {
    if (n === scene) return;
    canvas.style.opacity = '0';
    setTimeout(() => {
      scene = n; tick = 0;
      ctx.clearRect(0, 0, CW, CH);
      initParticles();
      canvas.style.opacity = '1';
    }, 450);
  }

  window.addEventListener('hero-slide-change', e => changeScene(e.detail.index));

  /* ── Resize / init ───────────────────────────────────────── */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = frame.getBoundingClientRect();
    CW = r.width; CH = r.height;
    canvas.width  = Math.round(CW*DPR); canvas.height = Math.round(CH*DPR);
    canvas.style.width = CW+'px'; canvas.style.height = CH+'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initParticles();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(frame); resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(draw);
  });

  raf = requestAnimationFrame(draw);
}
