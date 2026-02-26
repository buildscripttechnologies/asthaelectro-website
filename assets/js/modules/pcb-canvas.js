/* ================================================================
   PCB CANVAS — one board, 5 dramatic slide-coordinated modes
   High-impact: large glows, multiple simultaneous signal particles,
   scan-line pulse, BGA footprint, dense routing, scene-intro anims.
================================================================ */
export function initPCBCanvas() {
  const frame  = document.querySelector('.pcb-frame');
  const canvas = document.getElementById('pcb-canvas');
  if (!frame || !canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  canvas.style.transition = 'opacity 0.38s ease';

  /* ── Colours ─────────────────────────────────────────────── */
  const TEAL   = { r: 94,  g: 240, b: 208 };
  const AMBER  = { r: 255, g: 200, b: 80  };
  const VIOLET = { r: 180, g: 155, b: 255 };
  const GREEN  = { r: 90,  g: 230, b: 130 };
  const SNOW   = { r: 240, g: 250, b: 255 };
  const COPPER = { r: 200, g: 150, b: 60  };
  const cc = (col, a) => `rgba(${col.r},${col.g},${col.b},${(+a).toFixed(3)})`;

  let CW = 0, CH = 0, DPR = 1;
  let raf = null, scene = 0, tick = 0;

  /* ── Coordinate helpers (3 % margin — board fills frame) ─── */
  const M  = 0.03;
  const BX = () => CW * M;
  const BY = () => CH * M;
  const BW = () => CW * (1 - 2*M);
  const BH = () => CH * (1 - 2*M);
  const px = rx => BX() + rx * BW();
  const py = ry => BY() + ry * BH();
  const pw = rw => rw * BW();
  const ph = rh => rh * BH();

  /* ── Board topology ──────────────────────────────────────── */
  const COMP = {
    mcu:  { x:0.34, y:0.26, w:0.28, h:0.36, label:'SoC',   type:'bga', col:TEAL   },
    ddr:  { x:0.04, y:0.27, w:0.18, h:0.26, label:'DDR5',  type:'ic',  col:TEAL   },
    rf:   { x:0.64, y:0.04, w:0.21, h:0.19, label:'RF',    type:'ic',  col:AMBER  },
    ant:  { x:0.87, y:0.07, w:0.08, h:0.30, label:'ANT',   type:'ant', col:AMBER  },
    pmic: { x:0.06, y:0.66, w:0.17, h:0.19, label:'PMIC',  type:'ic',  col:VIOLET },
    dcdc: { x:0.29, y:0.72, w:0.15, h:0.14, label:'DCDC',  type:'ic',  col:VIOLET },
    usb:  { x:0.54, y:0.73, w:0.14, h:0.20, label:'USB-C', type:'ic',  col:TEAL   },
    adc:  { x:0.70, y:0.30, w:0.15, h:0.18, label:'ADC',   type:'ic',  col:VIOLET },
    xtal: { x:0.41, y:0.04, w:0.11, h:0.09, label:'26M',   type:'ic',  col:AMBER  },
  };

  /* 0402 decoupling caps around MCU */
  const CAPS = [
    [0.32,0.22],[0.38,0.22],[0.44,0.22],[0.50,0.22],[0.57,0.22],
    [0.32,0.64],[0.38,0.64],[0.44,0.64],[0.50,0.64],[0.57,0.64],
    [0.29,0.33],[0.29,0.40],[0.29,0.47],[0.63,0.33],[0.63,0.40],[0.63,0.47],
  ];

  /* Trace network */
  const TRACES = [
    ...Array.from({length:8}, (_,i) => ({
      pts:[[0.22, 0.285+i*0.030],[0.34, 0.285+i*0.030]], col:TEAL,  type:'hs', lw:1.1,
    })),
    { pts:[[0.62,0.33],[0.66,0.20],[0.66,0.16]], col:AMBER,  type:'rf',  lw:2.0 },
    { pts:[[0.87,0.16],[0.85,0.16]],             col:AMBER,  type:'rf',  lw:2.0 },
    { pts:[[0.62,0.35],[0.70,0.35]], col:VIOLET, type:'sig', lw:1.1 },
    { pts:[[0.62,0.38],[0.70,0.38]], col:VIOLET, type:'sig', lw:1.1 },
    { pts:[[0.62,0.42],[0.70,0.42]], col:VIOLET, type:'sig', lw:1.1 },
    { pts:[[0.62,0.45],[0.70,0.45]], col:VIOLET, type:'sig', lw:1.1 },
    { pts:[[0.59,0.62],[0.59,0.73]], col:TEAL,   type:'usb', lw:1.3 },
    { pts:[[0.61,0.62],[0.61,0.73]], col:TEAL,   type:'usb', lw:1.3 },
    { pts:[[0.45,0.26],[0.45,0.13]], col:AMBER,  type:'clk', lw:1.1 },
    { pts:[[0.48,0.26],[0.48,0.13]], col:AMBER,  type:'clk', lw:1.1 },
    { pts:[[0.34,0.60],[0.34,0.66],[0.23,0.66]], col:VIOLET, type:'sig', lw:1.0 },
    { pts:[[0.23,0.73],[0.29,0.73],[0.34,0.62]], col:GREEN,  type:'pwr', lw:4.0 },
    { pts:[[0.44,0.73],[0.46,0.73],[0.46,0.62]], col:GREEN,  type:'pwr', lw:3.2 },
    { pts:[[0.23,0.79],[0.34,0.79],[0.34,0.62]], col:GREEN,  type:'pwr', lw:2.8 },
  ];

  const VIAS = [
    [0.34,0.73],[0.46,0.62],[0.59,0.62],[0.45,0.13],
    [0.66,0.20],[0.70,0.35],[0.22,0.29],
    [0.34,0.66],[0.46,0.73],[0.23,0.66],
    [0.15,0.52],[0.67,0.61],[0.27,0.17],[0.75,0.52],[0.53,0.84],
    [0.19,0.61],[0.56,0.13],[0.81,0.27],
  ];

  /* ── Signal system ───────────────────────────────────────── */
  /* Multiple signals per trace at different phase offsets     */
  const SIG_DEFS = [
    { route:[[0.22,0.285],[0.34,0.285]], col:TEAL,   spd:0.016, type:'hs', phase:0.0  },
    { route:[[0.34,0.315],[0.22,0.315]], col:TEAL,   spd:0.018, type:'hs', phase:0.4  },
    { route:[[0.22,0.345],[0.34,0.345]], col:TEAL,   spd:0.015, type:'hs', phase:0.2  },
    { route:[[0.34,0.375],[0.22,0.375]], col:TEAL,   spd:0.020, type:'hs', phase:0.6  },
    { route:[[0.22,0.405],[0.34,0.405]], col:TEAL,   spd:0.014, type:'hs', phase:0.8  },
    { route:[[0.34,0.435],[0.22,0.435]], col:TEAL,   spd:0.017, type:'hs', phase:0.1  },
    /* Second wave of DDR signals at 0.5 offset */
    { route:[[0.22,0.285],[0.34,0.285]], col:TEAL,   spd:0.016, type:'hs', phase:0.5  },
    { route:[[0.34,0.315],[0.22,0.315]], col:TEAL,   spd:0.018, type:'hs', phase:0.9  },
    { route:[[0.22,0.345],[0.34,0.345]], col:TEAL,   spd:0.015, type:'hs', phase:0.7  },
    /* RF */
    { route:[[0.62,0.33],[0.66,0.20],[0.66,0.16]], col:AMBER,  spd:0.009, type:'rf',  phase:0.0 },
    /* SPI */
    { route:[[0.62,0.35],[0.70,0.35]], col:VIOLET, spd:0.012, type:'sig', phase:0.0 },
    { route:[[0.70,0.38],[0.62,0.38]], col:VIOLET, spd:0.011, type:'sig', phase:0.3 },
    { route:[[0.62,0.42],[0.70,0.42]], col:VIOLET, spd:0.013, type:'sig', phase:0.6 },
    /* USB */
    { route:[[0.59,0.73],[0.59,0.62]], col:TEAL,   spd:0.016, type:'usb', phase:0.0 },
    { route:[[0.61,0.62],[0.61,0.73]], col:TEAL,   spd:0.016, type:'usb', phase:0.5 },
    /* Clock — very fast */
    { route:[[0.45,0.13],[0.45,0.26]], col:AMBER,  spd:0.024, type:'clk', phase:0.0 },
    { route:[[0.48,0.26],[0.48,0.13]], col:AMBER,  spd:0.024, type:'clk', phase:0.5 },
    /* I2C */
    { route:[[0.34,0.60],[0.34,0.66],[0.23,0.66]], col:VIOLET, spd:0.008, type:'sig', phase:0.0 },
    /* Power */
    { route:[[0.23,0.73],[0.29,0.73],[0.34,0.62]], col:GREEN,  spd:0.006, type:'pwr', phase:0.0 },
    { route:[[0.44,0.73],[0.46,0.73],[0.46,0.62]], col:GREEN,  spd:0.006, type:'pwr', phase:0.5 },
  ];

  let sigs = [];
  function initSigs() {
    sigs = SIG_DEFS.map(s => ({ ...s, t: s.phase, hist: [] }));
  }

  function posOnRoute(route, t) {
    const tt  = ((t % 1) + 1) % 1;
    const seg = tt * (route.length - 1);
    const i   = Math.min(Math.floor(seg), route.length - 2);
    const f   = seg - i;
    return [route[i][0]+(route[i+1][0]-route[i][0])*f, route[i][1]+(route[i+1][1]-route[i][1])*f];
  }

  function stepSig(s, mul = 1) {
    s.hist.unshift(posOnRoute(s.route, s.t));
    if (s.hist.length > 26) s.hist.pop();
    s.t = (s.t + s.spd * mul) % 1;
  }

  /* ── Primitives ──────────────────────────────────────────── */

  function drawBoard(glowCol) {
    /* FR4 substrate */
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 10);
    ctx.fillStyle = 'rgba(3,20,10,0.98)'; ctx.fill();

    /* Fine PCB grid */
    ctx.save();
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 10); ctx.clip();
    ctx.strokeStyle = 'rgba(40,100,55,0.08)'; ctx.lineWidth = 0.5;
    for (let gx = BX(); gx <= BX()+BW(); gx += 18) {
      ctx.beginPath(); ctx.moveTo(gx, BY()); ctx.lineTo(gx, BY()+BH()); ctx.stroke();
    }
    for (let gy = BY(); gy <= BY()+BH(); gy += 18) {
      ctx.beginPath(); ctx.moveTo(BX(), gy); ctx.lineTo(BX()+BW(), gy); ctx.stroke();
    }
    ctx.restore();

    /* Scan-line sweep every 280 frames */
    const scanPhase = (tick % 280) / 280;
    if (scanPhase < 0.5) {
      const sy = BY() + scanPhase * 2 * BH();
      const sg = ctx.createLinearGradient(0, sy-30, 0, sy+30);
      sg.addColorStop(0, cc(glowCol || TEAL, 0));
      sg.addColorStop(0.5, cc(glowCol || TEAL, 0.07));
      sg.addColorStop(1, cc(glowCol || TEAL, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(BX(), sy-30, BW(), 60);
    }

    /* Glowing border */
    ctx.shadowColor = cc(glowCol || TEAL, 0.65);
    ctx.shadowBlur  = 32;
    ctx.strokeStyle = cc(glowCol || TEAL, 0.55);
    ctx.lineWidth   = 1.8;
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 10); ctx.stroke();
    ctx.shadowBlur  = 0;

    /* Corner fiducials */
    [[BX()+12,BY()+12],[BX()+BW()-12,BY()+12],
     [BX()+12,BY()+BH()-12],[BX()+BW()-12,BY()+BH()-12]].forEach(([fx,fy]) => {
      ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI*2);
      ctx.strokeStyle = cc(TEAL, 0.45); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI*2);
      ctx.fillStyle = cc(COPPER, 0.80); ctx.fill();
    });
  }

  function drawTraces(highlight) {
    const types = highlight ? (Array.isArray(highlight) ? highlight : [highlight]) : null;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    TRACES.forEach(tr => {
      const hl = !types || types.includes(tr.type);
      ctx.beginPath();
      ctx.moveTo(px(tr.pts[0][0]), py(tr.pts[0][1]));
      for (let i = 1; i < tr.pts.length; i++) ctx.lineTo(px(tr.pts[i][0]), py(tr.pts[i][1]));
      ctx.strokeStyle = cc(tr.col, hl ? 0.62 : 0.07);
      ctx.lineWidth   = hl ? tr.lw + 0.2 : tr.lw; ctx.stroke();
    });
  }

  function drawVias(alpha = 1) {
    VIAS.forEach(([rx, ry]) => {
      const vx = px(rx), vy = py(ry);
      ctx.beginPath(); ctx.arc(vx, vy, 5.5, 0, Math.PI*2);
      ctx.fillStyle   = cc(TEAL, 0.06*alpha); ctx.fill();
      ctx.strokeStyle = cc(TEAL, 0.35*alpha); ctx.lineWidth = 0.9; ctx.stroke();
      ctx.beginPath(); ctx.arc(vx, vy, 2.2, 0, Math.PI*2);
      ctx.fillStyle   = cc(COPPER, 0.70*alpha); ctx.fill();
    });
  }

  function drawCaps(alpha = 1) {
    CAPS.forEach(([rx, ry]) => {
      const cx = px(rx)-pw(0.014), cy = py(ry)-ph(0.008);
      const cw = pw(0.028), ch = ph(0.016);
      ctx.fillStyle   = `rgba(5,16,8,${0.94*alpha})`;
      ctx.strokeStyle = cc(COPPER, 0.32*alpha); ctx.lineWidth = 0.7;
      ctx.fillRect(cx, cy, cw, ch); ctx.strokeRect(cx, cy, cw, ch);
      ctx.fillStyle = cc(COPPER, 0.50*alpha);
      ctx.fillRect(cx-2, cy+1, 3, ch-2);
      ctx.fillRect(cx+cw-1, cy+1, 3, ch-2);
    });
  }

  function drawComp(key, alpha = 1, extraGlow = 0) {
    const comp = COMP[key];
    const cx = px(comp.x), cy = py(comp.y), cw = pw(comp.w), ch = ph(comp.h);

    /* Optional component activity glow */
    if (extraGlow > 0) {
      const ag = ctx.createRadialGradient(cx+cw/2, cy+ch/2, 0, cx+cw/2, cy+ch/2, cw*0.8);
      ag.addColorStop(0, cc(comp.col, 0.18*extraGlow)); ag.addColorStop(1, cc(comp.col, 0));
      ctx.beginPath(); ctx.arc(cx+cw/2, cy+ch/2, cw*0.8, 0, Math.PI*2);
      ctx.fillStyle = ag; ctx.fill();
    }

    /* Body */
    const grad = ctx.createLinearGradient(cx, cy, cx, cy+ch);
    grad.addColorStop(0, `rgba(8,26,12,${0.97*alpha})`);
    grad.addColorStop(1, `rgba(3,14,6,${0.97*alpha})`);
    ctx.fillStyle   = grad;
    ctx.strokeStyle = cc(comp.col, 0.72*alpha);
    ctx.lineWidth   = 1.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 4);
    ctx.fill(); ctx.stroke();

    if (comp.type === 'bga') {
      /* BGA 10×10 solder ball grid */
      const gX = (cw - pw(0.005)) / 11, gY = (ch - ph(0.005)) / 11;
      for (let r = 0; r < 10; r++) {
        for (let co = 0; co < 10; co++) {
          if ((r+co) % 11 === 0) continue;
          const bx2 = cx+(co+1)*gX, by2 = cy+(r+1)*gY;
          /* Subtle inner glow on active scene */
          if (extraGlow > 0.5) {
            ctx.beginPath(); ctx.arc(bx2, by2, 3.5, 0, Math.PI*2);
            ctx.fillStyle = cc(comp.col, 0.12*extraGlow*alpha); ctx.fill();
          }
          ctx.beginPath(); ctx.arc(bx2, by2, 2.2, 0, Math.PI*2);
          ctx.fillStyle   = cc(COPPER, 0.60*alpha); ctx.fill();
          ctx.strokeStyle = cc(comp.col, 0.22*alpha); ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    } else {
      /* IC pin rows */
      const pads = Math.max(3, Math.round(Math.min(cw, ch) / 8));
      for (let i = 0; i < pads; i++) {
        const r = (i+0.5)/pads;
        [[cx, cy+ch*r],[cx+cw, cy+ch*r],[cx+cw*r, cy],[cx+cw*r, cy+ch]].forEach(([padX,padY]) => {
          ctx.beginPath(); ctx.arc(padX, padY, 1.8, 0, Math.PI*2);
          ctx.fillStyle = cc(COPPER, 0.52*alpha); ctx.fill();
        });
      }
    }

    /* Label */
    const fs = Math.max(7, Math.min(11, cw*0.18));
    ctx.font      = `bold ${fs}px monospace`;
    ctx.fillStyle = cc(comp.col, 0.85*alpha);
    ctx.textAlign = 'center';
    ctx.fillText(comp.label, cx+cw/2, cy+ch/2+fs*0.35);

    /* Pin-1 dot */
    ctx.beginPath(); ctx.arc(cx+6, cy+6, 2.2, 0, Math.PI*2);
    ctx.fillStyle = cc(SNOW, 0.30*alpha); ctx.fill();
  }

  function drawAllComps(focusKeys, dimA = 0.12, glowMap = {}) {
    const keys = focusKeys ? (Array.isArray(focusKeys) ? focusKeys : [focusKeys]) : null;
    Object.keys(COMP).forEach(k => {
      const a   = !keys || keys.includes(k) ? 1.0 : dimA;
      const glo = glowMap[k] || 0;
      drawComp(k, a, glo);
    });
  }

  /* Signal particle with long glowing history trail */
  function drawSigParticle(s, col, size = 3.2, glowR = 24) {
    const hist = s.hist;
    if (!hist || hist.length < 2) return;

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    /* Gradient trail */
    for (let i = hist.length-1; i > 0; i--) {
      const prog = 1 - i/hist.length;
      const [x1,y1] = hist[i], [x2,y2] = hist[i-1];
      if (Math.abs(x1-x2) > 0.12 || Math.abs(y1-y2) > 0.12) continue;
      ctx.beginPath();
      ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2));
      ctx.strokeStyle = cc(col, prog * 0.78);
      ctx.lineWidth   = prog * 4.0;
      ctx.stroke();
    }

    /* Large outer halo */
    const [hx, hy] = hist[0];
    const sx = px(hx), sy = py(hy);
    const outer = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR*2);
    outer.addColorStop(0, cc(col, 0.22)); outer.addColorStop(1, cc(col, 0));
    ctx.beginPath(); ctx.arc(sx, sy, glowR*2, 0, Math.PI*2);
    ctx.fillStyle = outer; ctx.fill();

    /* Inner glow */
    const inner = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    inner.addColorStop(0, cc(col, 0.75)); inner.addColorStop(1, cc(col, 0));
    ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, Math.PI*2);
    ctx.fillStyle = inner; ctx.fill();

    /* White-hot core */
    ctx.shadowColor = cc(col, 1.0);
    ctx.shadowBlur  = 14;
    ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2);
    ctx.fillStyle = cc(SNOW, 1.0); ctx.fill();
    ctx.shadowBlur = 0;
  }

  /* ═══════════════════════════════════════════════════════════
     SCENE 0 — Overview: ALL traces lit, ALL signals, board aura
  ═══════════════════════════════════════════════════════════ */
  function drawScene0() {
    drawBoard(TEAL);
    drawTraces(null);
    drawVias();
    drawCaps();
    /* Compute which comps are near active signals for glow */
    const glowMap = {};
    sigs.forEach(s => {
      if (!s.hist.length) return;
      const [hx,hy] = s.hist[0];
      Object.entries(COMP).forEach(([k, cp]) => {
        const dx = hx - (cp.x + cp.w/2), dy = hy - (cp.y + cp.h/2);
        if (Math.sqrt(dx*dx+dy*dy) < 0.18) glowMap[k] = Math.min(1, (glowMap[k]||0) + 0.6);
      });
    });
    drawAllComps(null, 1.0, glowMap);
    sigs.forEach(s => { stepSig(s); drawSigParticle(s, s.col); });
  }

  /* ═══════════════════════════════════════════════════════════
     SCENE 1 — Design: MCU hub, net web, orbiting labels
  ═══════════════════════════════════════════════════════════ */
  function drawScene1() {
    drawBoard(TEAL);
    drawTraces(['clk','sig','usb']);
    drawVias(0.25);
    drawCaps(0.20);

    const cp    = COMP.mcu;
    const mx    = px(cp.x+cp.w/2), my = py(cp.y+cp.h/2);
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.040);

    /* Web lines to every component */
    Object.entries(COMP).filter(([k]) => k !== 'mcu').forEach(([, cp2]) => {
      const tx = px(cp2.x+cp2.w/2), ty = py(cp2.y+cp2.h/2);
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty);
      ctx.strokeStyle = cc(TEAL, 0.10 + 0.07*pulse);
      ctx.lineWidth   = 0.9; ctx.stroke();
    });

    /* Triple-ring aura */
    [0.30, 0.22, 0.14].forEach((r, i) => {
      const rg = ctx.createRadialGradient(mx, my, 0, mx, my, pw(r));
      rg.addColorStop(0, cc(TEAL, (0.18 - i*0.04)*pulse)); rg.addColorStop(1, cc(TEAL, 0));
      ctx.beginPath(); ctx.arc(mx, my, pw(r), 0, Math.PI*2); ctx.fillStyle = rg; ctx.fill();
    });

    drawAllComps('mcu', 0.12, { mcu: pulse });

    /* Orbiting interface labels */
    const nets = ['SPI','I²C','UART','GPIO','USB','PCIe','CAN','I2S'];
    ctx.font = '9px monospace'; ctx.textAlign = 'center';
    nets.forEach((n, i) => {
      const ang = (i/nets.length)*Math.PI*2 - Math.PI/2 + tick*0.005;
      const nr  = pw(0.24);
      ctx.fillStyle = cc(TEAL, 0.45 + 0.20*pulse);
      ctx.fillText(n, mx+Math.cos(ang)*nr, my+Math.sin(ang)*nr + 3);
      /* Junction dot */
      ctx.beginPath();
      ctx.arc(mx+Math.cos(ang)*pw(0.155), my+Math.sin(ang)*pw(0.155), 2, 0, Math.PI*2);
      ctx.fillStyle = cc(TEAL, 0.5); ctx.fill();
    });

    sigs.filter(s => s.type==='clk'||s.type==='sig').forEach(s => {
      stepSig(s); drawSigParticle(s, s.col, 2.5, 14);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     SCENE 2 — High-Speed DDR: blazing diff pairs, serpentine
  ═══════════════════════════════════════════════════════════ */
  function drawScene2() {
    drawBoard(TEAL);

    /* Draw HS traces bright, others ghosted */
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    TRACES.forEach(tr => {
      ctx.beginPath();
      ctx.moveTo(px(tr.pts[0][0]), py(tr.pts[0][1]));
      for (let i = 1; i < tr.pts.length; i++) ctx.lineTo(px(tr.pts[i][0]), py(tr.pts[i][1]));
      if (tr.type === 'hs') {
        /* Extra bright with shadow glow */
        ctx.shadowColor = cc(TEAL, 0.55);
        ctx.shadowBlur  = 6;
        ctx.strokeStyle = cc(TEAL, 0.80);
      } else {
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = cc(tr.col, 0.06);
      }
      ctx.lineWidth = tr.lw; ctx.stroke();
    });
    ctx.shadowBlur = 0;

    drawVias(0.45); drawCaps(0.15);
    drawAllComps(['mcu','ddr'], 0.10, { mcu:0.8, ddr:0.8 });

    /* Ambient glow band */
    const x1=px(0.22), x2=px(0.34), y1=py(0.26), y2=py(0.50);
    const bg = ctx.createLinearGradient(x1, 0, x2, 0);
    bg.addColorStop(0, cc(TEAL,0)); bg.addColorStop(0.5,cc(TEAL,0.12)); bg.addColorStop(1,cc(TEAL,0));
    ctx.fillStyle = bg; ctx.fillRect(x1, y1, x2-x1, y2-y1);

    /* Serpentine length-matching stubs */
    const smx=(x1+x2)/2, smy=(y1+y2)/2;
    ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.shadowColor = cc(TEAL, 0.40); ctx.shadowBlur = 5;
    for (let row = 0; row < 8; row++) {
      const ry = smy - 25 + row * 7.5;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const sx2=smx-46+i*5.2, sy2=ry+(i%2===0?4.5:-4.5);
        i===0 ? ctx.moveTo(sx2,sy2) : ctx.lineTo(sx2,sy2);
      }
      ctx.strokeStyle = cc(TEAL, 0.62); ctx.lineWidth = 1.0; ctx.stroke();
    }
    ctx.shadowBlur = 0;

    /* Ultra-fast DDR signals (2.8× speed) */
    sigs.filter(s => s.type==='hs').forEach(s => {
      stepSig(s, 2.8); drawSigParticle(s, TEAL, 3.2, 14);
    });

    /* Spec callout */
    const bx2 = px(0.28), by2 = py(0.53);
    ctx.fillStyle = 'rgba(0,12,5,0.75)';
    ctx.beginPath(); ctx.roundRect(bx2-50, by2, 100, 52, 4); ctx.fill();
    ctx.shadowColor = cc(TEAL,0.3); ctx.shadowBlur=8;
    ctx.font = '8px monospace'; ctx.fillStyle = cc(TEAL, 0.90); ctx.textAlign = 'center';
    ['DDR5-6400 MT/s','4× Diff Pair','100 Ω Diff','±0.1 mm Match'].forEach((l,i) => {
      ctx.fillText(l, bx2, by2+12+i*11);
    });
    ctx.shadowBlur = 0;
  }

  /* ═══════════════════════════════════════════════════════════
     SCENE 3 — RF / Antenna: radiation rings, IFA, ground pour
  ═══════════════════════════════════════════════════════════ */
  function drawScene3() {
    /* Ground pour hatch */
    ctx.save();
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 10); ctx.clip();
    ctx.strokeStyle = 'rgba(45,100,55,0.07)'; ctx.lineWidth = 0.7;
    for (let lx = BX()-BH(); lx < BX()+BW(); lx += 13) {
      ctx.beginPath(); ctx.moveTo(lx, BY()); ctx.lineTo(lx+BH(), BY()+BH()); ctx.stroke();
    }
    ctx.restore();

    drawBoard(AMBER);
    ctx.lineJoin='round'; ctx.lineCap='round';
    TRACES.forEach(tr => {
      ctx.beginPath();
      ctx.moveTo(px(tr.pts[0][0]), py(tr.pts[0][1]));
      for (let i=1;i<tr.pts.length;i++) ctx.lineTo(px(tr.pts[i][0]),py(tr.pts[i][1]));
      if (tr.type==='rf') {
        ctx.shadowColor=cc(AMBER,0.5); ctx.shadowBlur=8;
        ctx.strokeStyle=cc(AMBER,0.82);
      } else {
        ctx.shadowBlur=0; ctx.strokeStyle=cc(tr.col,0.06);
      }
      ctx.lineWidth=tr.lw; ctx.stroke();
    });
    ctx.shadowBlur=0;
    drawVias(0.35); drawCaps(0.07);
    drawAllComps(['rf','ant'],0.10,{rf:0.9,ant:0.9});
    drawComp('mcu',0.32);

    /* Keepout */
    const rf=COMP.rf, an=COMP.ant;
    const vx=px(rf.x-0.01), vy=py(rf.y-0.01);
    const vw=pw(rf.w+an.w+0.07), vh=ph(an.y+an.h-rf.y+0.07);
    ctx.setLineDash([5,3]);
    ctx.strokeStyle=cc(AMBER,0.42); ctx.lineWidth=1.2; ctx.strokeRect(vx,vy,vw,vh);
    ctx.setLineDash([]);
    ctx.font='7px monospace'; ctx.fillStyle=cc(AMBER,0.52); ctx.textAlign='left';
    ctx.fillText('RF KEEPOUT',vx+3,vy-4);

    /* 7 expanding radiation arcs */
    const acp=COMP.ant, antX=px(acp.x+acp.w*0.5), antY=py(acp.y);
    for (let i=0;i<7;i++) {
      const phase=((tick*0.014)+i/7)%1;
      const rad=phase*pw(0.42), alp=(1-phase)*0.62;
      ctx.shadowColor=cc(AMBER,alp*0.6); ctx.shadowBlur=6;
      ctx.beginPath(); ctx.arc(antX,antY,rad,-Math.PI,0);
      ctx.strokeStyle=cc(AMBER,alp); ctx.lineWidth=2; ctx.stroke();
    }
    ctx.shadowBlur=0;

    /* IFA antenna with glow */
    const ax=px(acp.x),ay=py(acp.y),aw=pw(acp.w),ah=ph(acp.h);
    ctx.shadowColor=cc(AMBER,0.75); ctx.shadowBlur=16;
    ctx.strokeStyle=cc(AMBER,0.92); ctx.lineWidth=3.5;
    ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(ax,ay+ah*0.5); ctx.lineTo(ax,ay);
    ctx.lineTo(ax+aw,ay); ctx.lineTo(ax+aw,ay+ah*0.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax,ay+ah); ctx.lineTo(ax,ay+ah*0.72);
    ctx.lineTo(ax+aw*0.65,ay+ah*0.72); ctx.stroke();
    ctx.shadowBlur=0;

    const rfSig=sigs.find(s=>s.type==='rf');
    if(rfSig){stepSig(rfSig); drawSigParticle(rfSig,AMBER,4,28);}

    ctx.font='9px monospace'; ctx.fillStyle=cc(AMBER,0.80); ctx.textAlign='center';
    ctx.fillText('2.4 / 5 GHz',px(rf.x+rf.w/2),py(rf.y+rf.h+0.08));
    ctx.fillText('50 Ω CPWG',  px(0.63),         py(0.28));
    ctx.fillText('VSWR < 1.5', px(0.63),         py(0.33));
  }

  /* ═══════════════════════════════════════════════════════════
     SCENE 4 — Manufacturing: Gerber layer reveal + drill hits
  ═══════════════════════════════════════════════════════════ */
  const LAYERS = [
    { n:'L1 Top Cu', col:{r:94, g:240,b:208}, a:0.58 },
    { n:'L2 GND',    col:{r:60, g:210,b:105}, a:0.40 },
    { n:'L3 PWR',    col:{r:255,g:178,b:55 }, a:0.40 },
    { n:'L4 Bot Cu', col:{r:85, g:165,b:245}, a:0.52 },
  ];

  function drawScene4() {
    const li = Math.floor(tick / 100) % 4;
    LAYERS.forEach((l, i) => {
      if (i > li) return;
      ctx.beginPath(); ctx.roundRect(BX()+2, BY()+2, BW()-4, BH()-4, 10);
      ctx.fillStyle = `rgba(${l.col.r},${l.col.g},${l.col.b},${i===li ? l.a+0.16 : l.a*0.32})`;
      ctx.fill();
    });

    drawBoard(SNOW);

    /* Drill hits */
    VIAS.forEach(([rx, ry]) => {
      const vx=px(rx), vy=py(ry);
      const blink = Math.abs(Math.sin(tick*0.045 + rx*10)) > 0.58;
      ctx.beginPath(); ctx.arc(vx, vy, 7, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(255,255,255,${blink?0.85:0.22})`; ctx.lineWidth=1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(vx, vy, 2.8, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${blink?0.98:0.30})`; ctx.fill();
      /* Drill ring pulse */
      if (blink) {
        const rg=ctx.createRadialGradient(vx,vy,3,vx,vy,12);
        rg.addColorStop(0,cc(SNOW,0.25)); rg.addColorStop(1,cc(SNOW,0));
        ctx.beginPath(); ctx.arc(vx,vy,12,0,Math.PI*2);
        ctx.fillStyle=rg; ctx.fill();
      }
    });

    /* Silkscreen */
    ctx.strokeStyle='rgba(230,255,240,0.26)'; ctx.lineWidth=0.8;
    ctx.font='7px monospace'; ctx.fillStyle='rgba(230,255,240,0.20)'; ctx.textAlign='center';
    Object.values(COMP).forEach(cp => {
      ctx.beginPath(); ctx.roundRect(px(cp.x)-1,py(cp.y)-1,pw(cp.w)+2,ph(cp.h)+2,3); ctx.stroke();
      ctx.fillText(cp.label, px(cp.x+cp.w/2), py(cp.y)-4);
    });

    /* Layer legend */
    const lx=BX()+BW()-110, ly=BY()+10;
    ctx.fillStyle='rgba(0,8,3,0.82)';
    ctx.beginPath(); ctx.roundRect(lx,ly,104,80,4); ctx.fill();
    ctx.font='7px monospace'; ctx.fillStyle=cc(TEAL,0.60); ctx.textAlign='left';
    ctx.fillText('Gerber Layers',lx+6,ly+12);
    LAYERS.forEach((l,i)=>{
      const ey=ly+24+i*14;
      const active = i <= li;
      if (active) { ctx.shadowColor=`rgb(${l.col.r},${l.col.g},${l.col.b})`; ctx.shadowBlur=6; }
      ctx.beginPath(); ctx.arc(lx+11,ey-3,6,0,Math.PI*2);
      ctx.fillStyle=`rgba(${l.col.r},${l.col.g},${l.col.b},${active?0.92:0.18})`; ctx.fill();
      ctx.shadowBlur=0;
      ctx.font='8px monospace';
      ctx.fillStyle=`rgba(215,240,225,${active?0.90:0.22})`;
      ctx.fillText(l.n,lx+22,ey);
    });

    /* Dimension */
    ctx.setLineDash([2,3]); ctx.strokeStyle='rgba(170,200,185,0.32)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(BX(),BY()-12); ctx.lineTo(BX()+BW(),BY()-12); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font='8px monospace'; ctx.fillStyle='rgba(150,180,165,0.60)'; ctx.textAlign='center';
    ctx.fillText(`${Math.round(BW()/DPR*0.6)}×${Math.round(BH()/DPR*0.6)} mm`, BX()+BW()/2, BY()-15);
  }

  /* ── Render loop ─────────────────────────────────────────── */
  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    tick++;
    switch (scene) {
      case 0: drawScene0(); break;
      case 1: drawScene1(); break;
      case 2: drawScene2(); break;
      case 3: drawScene3(); break;
      case 4: drawScene4(); break;
    }
    raf = requestAnimationFrame(draw);
  }

  function changeScene(n) {
    if (n === scene) return;
    canvas.style.opacity = '0';
    setTimeout(() => { scene = n; tick = 0; ctx.clearRect(0,0,CW,CH); canvas.style.opacity='1'; }, 380);
  }

  window.addEventListener('hero-slide-change', e => changeScene(e.detail.index));

  /* ── Resize ──────────────────────────────────────────────── */
  function resize() {
    DPR = Math.min(window.devicePixelRatio||1, 2);
    const r = frame.getBoundingClientRect();
    CW = r.width; CH = r.height;
    canvas.width  = Math.round(CW*DPR); canvas.height = Math.round(CH*DPR);
    canvas.style.width=CW+'px'; canvas.style.height=CH+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    initSigs();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(frame); resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else raf=requestAnimationFrame(draw);
  });

  raf = requestAnimationFrame(draw);
}
