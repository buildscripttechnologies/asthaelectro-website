/* ================================================================
   PCB CANVAS — one real-looking board, 5 slide-coordinated modes
   Real PCB aesthetics: FR4 green substrate, BGA footprint, dense
   routing, 0402 decoupling caps, history-trail signal particles.
================================================================ */
export function initPCBCanvas() {
  const frame  = document.querySelector('.pcb-frame');
  const canvas = document.getElementById('pcb-canvas');
  if (!frame || !canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  canvas.style.transition = 'opacity 0.35s ease';

  /* ── Palette ────────────────────────────────────────────── */
  const TEAL   = { r: 94,  g: 240, b: 208 };
  const AMBER  = { r: 240, g: 192, b: 94  };
  const VIOLET = { r: 155, g: 141, b: 255 };
  const GREEN  = { r: 80,  g: 220, b: 120 };
  const SNOW   = { r: 230, g: 245, b: 255 };
  const COPPER = { r: 184, g: 135, b: 55  };
  const c = (col, a) => `rgba(${col.r},${col.g},${col.b},${(+a).toFixed(3)})`;

  let CW = 0, CH = 0, DPR = 1;
  let raf = null, scene = 0, tick = 0;

  /* ── Board coordinate system (6 % margin) ───────────────── */
  const M  = 0.06;
  const BX = () => CW * M;
  const BY = () => CH * M;
  const BW = () => CW * (1 - 2*M);
  const BH = () => CH * (1 - 2*M);
  const px = rx => BX() + rx * BW();
  const py = ry => BY() + ry * BH();
  const pw = rw => rw * BW();
  const ph = rh => rh * BH();

  /* ── Components ─────────────────────────────────────────── */
  const COMP = {
    mcu:  { x:0.35, y:0.27, w:0.27, h:0.34, label:'U1  SoC',    type:'bga',  col:TEAL   },
    ddr:  { x:0.05, y:0.28, w:0.18, h:0.25, label:'U2  DDR5',   type:'ic',   col:TEAL   },
    rf:   { x:0.65, y:0.05, w:0.20, h:0.18, label:'U3  RF',     type:'ic',   col:AMBER  },
    ant:  { x:0.87, y:0.08, w:0.07, h:0.28, label:'ANT',        type:'ant',  col:AMBER  },
    pmic: { x:0.07, y:0.67, w:0.16, h:0.18, label:'U4  PMIC',   type:'ic',   col:VIOLET },
    dcdc: { x:0.30, y:0.73, w:0.14, h:0.13, label:'U5  DCDC',   type:'ic',   col:VIOLET },
    usb:  { x:0.55, y:0.74, w:0.13, h:0.19, label:'J1  USB-C',  type:'conn', col:TEAL   },
    adc:  { x:0.71, y:0.31, w:0.14, h:0.17, label:'U6  ADC',    type:'ic',   col:VIOLET },
    xtal: { x:0.42, y:0.05, w:0.10, h:0.08, label:'Y1  26M',   type:'xtal', col:AMBER  },
  };

  /* ── 0402 decoupling caps scattered near MCU ────────────── */
  const CAPS = [
    [0.33,0.24],[0.39,0.24],[0.45,0.24],[0.51,0.24],[0.57,0.24],
    [0.32,0.63],[0.38,0.63],[0.44,0.63],[0.50,0.63],[0.57,0.63],
    [0.30,0.35],[0.30,0.41],[0.30,0.47],[0.64,0.34],[0.64,0.41],[0.64,0.48],
  ];

  /* ── Trace network ───────────────────────────────────────── */
  const TRACES = [
    /* DDR5 ↔ MCU — 8 diff-pair traces */
    ...Array.from({length:8}, (_,i) => ({
      pts:[[0.23, 0.295+i*0.028],[0.35, 0.295+i*0.028]], col:TEAL,  type:'hs', lw:1.1,
    })),
    /* MCU ↔ RF */
    { pts:[[0.62,0.34],[0.66,0.21],[0.66,0.17]], col:AMBER,  type:'rf',  lw:1.8 },
    /* ANT ↔ RF */
    { pts:[[0.87,0.17],[0.86,0.17]],             col:AMBER,  type:'rf',  lw:1.8 },
    /* SPI ↔ ADC */
    { pts:[[0.62,0.36],[0.71,0.36]], col:VIOLET, type:'sig', lw:1.1 },
    { pts:[[0.62,0.39],[0.71,0.39]], col:VIOLET, type:'sig', lw:1.1 },
    { pts:[[0.62,0.43],[0.71,0.43]], col:VIOLET, type:'sig', lw:1.1 },
    { pts:[[0.62,0.46],[0.71,0.46]], col:VIOLET, type:'sig', lw:1.1 },
    /* USB diff pair */
    { pts:[[0.60,0.61],[0.60,0.74]], col:TEAL,   type:'usb', lw:1.2 },
    { pts:[[0.62,0.61],[0.62,0.74]], col:TEAL,   type:'usb', lw:1.2 },
    /* Crystal clock */
    { pts:[[0.46,0.27],[0.46,0.13]], col:AMBER,  type:'clk', lw:1.1 },
    { pts:[[0.49,0.27],[0.49,0.13]], col:AMBER,  type:'clk', lw:1.1 },
    /* I2C to PMIC */
    { pts:[[0.35,0.59],[0.35,0.67],[0.23,0.67]], col:VIOLET, type:'sig', lw:1.0 },
    { pts:[[0.37,0.59],[0.37,0.67],[0.23,0.67]], col:VIOLET, type:'sig', lw:1.0 },
    /* Power rails — wide */
    { pts:[[0.23,0.74],[0.30,0.74],[0.35,0.61]], col:GREEN,  type:'pwr', lw:3.5 },
    { pts:[[0.44,0.74],[0.47,0.74],[0.47,0.61]], col:GREEN,  type:'pwr', lw:3.0 },
    { pts:[[0.23,0.79],[0.35,0.79],[0.35,0.61]], col:GREEN,  type:'pwr', lw:2.5 },
  ];

  /* ── Via pads ───────────────────────────────────────────── */
  const VIAS = [
    [0.35,0.74],[0.47,0.61],[0.60,0.61],[0.46,0.13],
    [0.66,0.21],[0.71,0.36],[0.23,0.30],
    [0.35,0.67],[0.37,0.67],[0.47,0.74],
    [0.14,0.50],[0.68,0.60],[0.26,0.18],[0.76,0.50],[0.52,0.83],
    [0.20,0.60],[0.55,0.14],[0.80,0.26],
  ];

  /* ── Signal particle definitions ────────────────────────── */
  const SIG_DEFS = [
    { route:[[0.23,0.295],[0.35,0.295]], col:TEAL,   spd:0.013, type:'hs'  },
    { route:[[0.35,0.323],[0.23,0.323]], col:TEAL,   spd:0.016, type:'hs'  },
    { route:[[0.23,0.351],[0.35,0.351]], col:TEAL,   spd:0.014, type:'hs'  },
    { route:[[0.35,0.379],[0.23,0.379]], col:TEAL,   spd:0.012, type:'hs'  },
    { route:[[0.23,0.407],[0.35,0.407]], col:TEAL,   spd:0.015, type:'hs'  },
    { route:[[0.35,0.435],[0.23,0.435]], col:TEAL,   spd:0.017, type:'hs'  },
    { route:[[0.62,0.34],[0.66,0.21],[0.66,0.17]], col:AMBER,  spd:0.008, type:'rf'  },
    { route:[[0.62,0.36],[0.71,0.36]], col:VIOLET, spd:0.010, type:'sig' },
    { route:[[0.71,0.39],[0.62,0.39]], col:VIOLET, spd:0.009, type:'sig' },
    { route:[[0.62,0.43],[0.71,0.43]], col:VIOLET, spd:0.011, type:'sig' },
    { route:[[0.60,0.74],[0.60,0.61]], col:TEAL,   spd:0.014, type:'usb' },
    { route:[[0.62,0.61],[0.62,0.74]], col:TEAL,   spd:0.014, type:'usb' },
    { route:[[0.46,0.13],[0.46,0.27]], col:AMBER,  spd:0.020, type:'clk' },
    { route:[[0.49,0.27],[0.49,0.13]], col:AMBER,  spd:0.020, type:'clk' },
    { route:[[0.35,0.59],[0.35,0.67],[0.23,0.67]], col:VIOLET, spd:0.007, type:'sig' },
    { route:[[0.23,0.74],[0.30,0.74],[0.35,0.61]], col:GREEN,  spd:0.005, type:'pwr' },
    { route:[[0.44,0.74],[0.47,0.74],[0.47,0.61]], col:GREEN,  spd:0.005, type:'pwr' },
  ];

  let sigs = [];
  function initSigs() {
    sigs = SIG_DEFS.map(s => ({ ...s, t: Math.random(), hist: [] }));
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
    if (s.hist.length > 22) s.hist.pop();
    s.t = (s.t + s.spd * mul) % 1;
  }

  /* ── Draw: board base ────────────────────────────────────── */
  function drawBoardBase(glowCol) {
    /* FR4 substrate */
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 12);
    ctx.fillStyle = 'rgba(2,18,8,0.97)'; ctx.fill();

    /* Subtle grid texture */
    ctx.save();
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 12); ctx.clip();
    ctx.strokeStyle = 'rgba(35,90,45,0.07)'; ctx.lineWidth = 0.5;
    for (let gx = BX(); gx < BX()+BW(); gx += 20) {
      ctx.beginPath(); ctx.moveTo(gx, BY()); ctx.lineTo(gx, BY()+BH()); ctx.stroke();
    }
    for (let gy = BY(); gy < BY()+BH(); gy += 20) {
      ctx.beginPath(); ctx.moveTo(BX(), gy); ctx.lineTo(BX()+BW(), gy); ctx.stroke();
    }
    ctx.restore();

    /* Glowing board border */
    ctx.shadowColor = c(glowCol || TEAL, 0.55);
    ctx.shadowBlur  = 28;
    ctx.strokeStyle = c(glowCol || TEAL, 0.48);
    ctx.lineWidth   = 1.6;
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 12); ctx.stroke();
    ctx.shadowBlur  = 0;

    /* Corner fiducials */
    [[BX()+11,BY()+11],[BX()+BW()-11,BY()+11],
     [BX()+11,BY()+BH()-11],[BX()+BW()-11,BY()+BH()-11]].forEach(([fx,fy]) => {
      ctx.beginPath(); ctx.arc(fx, fy, 6.5, 0, Math.PI*2);
      ctx.strokeStyle = c(TEAL, 0.40); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, Math.PI*2);
      ctx.fillStyle = c(COPPER, 0.75); ctx.fill();
    });

    /* Ruler ticks along top edge */
    ctx.strokeStyle = c(TEAL, 0.18); ctx.lineWidth = 0.6;
    for (let i = 0; i <= 12; i++) {
      const rx = BX() + BW()*i/12;
      ctx.beginPath(); ctx.moveTo(rx, BY()); ctx.lineTo(rx, BY()+5); ctx.stroke();
    }
  }

  /* ── Draw: traces ────────────────────────────────────────── */
  function drawAllTraces(highlight) {
    const types = highlight ? (Array.isArray(highlight) ? highlight : [highlight]) : null;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    TRACES.forEach(tr => {
      const hl = !types || types.includes(tr.type);
      ctx.beginPath();
      ctx.moveTo(px(tr.pts[0][0]), py(tr.pts[0][1]));
      for (let i = 1; i < tr.pts.length; i++) ctx.lineTo(px(tr.pts[i][0]), py(tr.pts[i][1]));
      ctx.strokeStyle = c(tr.col, hl ? 0.50 : 0.07);
      ctx.lineWidth   = tr.lw; ctx.stroke();
    });
  }

  /* ── Draw: vias ──────────────────────────────────────────── */
  function drawAllVias(alpha = 1) {
    VIAS.forEach(([rx, ry]) => {
      const vx = px(rx), vy = py(ry);
      ctx.beginPath(); ctx.arc(vx, vy, 5, 0, Math.PI*2);
      ctx.fillStyle   = c(TEAL, 0.055 * alpha); ctx.fill();
      ctx.strokeStyle = c(TEAL, 0.30  * alpha); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(vx, vy, 2, 0, Math.PI*2);
      ctx.fillStyle   = c(COPPER, 0.65 * alpha); ctx.fill();
    });
  }

  /* ── Draw: 0402 decoupling caps ──────────────────────────── */
  function drawCaps(alpha = 1) {
    CAPS.forEach(([rx, ry]) => {
      const cx = px(rx) - pw(0.013), cy = py(ry) - ph(0.007);
      const cw = pw(0.026), ch = ph(0.014);
      ctx.fillStyle   = `rgba(6,16,8,${0.92*alpha})`;
      ctx.strokeStyle = c(COPPER, 0.28*alpha);
      ctx.lineWidth   = 0.7;
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.fillStyle = c(COPPER, 0.45*alpha);
      ctx.fillRect(cx-2, cy+1, 3, ch-2);
      ctx.fillRect(cx+cw-1, cy+1, 3, ch-2);
    });
  }

  /* ── Draw: single IC component ───────────────────────────── */
  function drawComp(key, alpha = 1) {
    const comp = COMP[key];
    const cx = px(comp.x), cy = py(comp.y), cw = pw(comp.w), ch = ph(comp.h);

    /* Body with vertical gradient */
    const grad = ctx.createLinearGradient(cx, cy, cx, cy+ch);
    grad.addColorStop(0, `rgba(8,22,10,${0.97*alpha})`);
    grad.addColorStop(1, `rgba(3,12,5,${0.97*alpha})`);
    ctx.fillStyle   = grad;
    ctx.strokeStyle = c(comp.col, 0.68*alpha);
    ctx.lineWidth   = 1.3;
    ctx.lineJoin    = 'round';
    ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 4);
    ctx.fill(); ctx.stroke();

    if (comp.type === 'bga') {
      /* BGA — 10 × 10 grid of solder balls */
      const cols = 10, rows = 10;
      const gapX = (cw - pw(0.01)) / (cols+1);
      const gapY = (ch - ph(0.01)) / (rows+1);
      for (let r = 0; r < rows; r++) {
        for (let co = 0; co < cols; co++) {
          if ((r+co) % 11 === 0) continue; /* escape routes */
          const bx2 = cx + (co+1)*gapX, by2 = cy + (r+1)*gapY;
          ctx.beginPath(); ctx.arc(bx2, by2, 2.0, 0, Math.PI*2);
          ctx.fillStyle   = c(COPPER, 0.58*alpha); ctx.fill();
          ctx.strokeStyle = c(comp.col, 0.18*alpha); ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    } else {
      /* IC — pin dots on all four edges */
      const pads = Math.max(3, Math.round(Math.min(cw, ch) / 8));
      for (let i = 0; i < pads; i++) {
        const r = (i+0.5) / pads;
        [[cx, cy+ch*r],[cx+cw, cy+ch*r],[cx+cw*r, cy],[cx+cw*r, cy+ch]].forEach(([padX,padY]) => {
          ctx.beginPath(); ctx.arc(padX, padY, 1.6, 0, Math.PI*2);
          ctx.fillStyle = c(COPPER, 0.50*alpha); ctx.fill();
        });
      }
    }

    /* Label */
    const fs = Math.max(7, Math.min(10, cw * 0.14));
    ctx.font      = `bold ${fs}px monospace`;
    ctx.fillStyle = c(comp.col, 0.80*alpha);
    ctx.textAlign = 'center';
    ctx.fillText(comp.label, cx+cw/2, cy+ch/2+fs*0.35);

    /* Pin-1 orientation dot */
    ctx.beginPath(); ctx.arc(cx+5, cy+5, 2, 0, Math.PI*2);
    ctx.fillStyle = c(SNOW, 0.28*alpha); ctx.fill();
  }

  function drawAllComps(focusKeys, dimAlpha = 0.14) {
    const keys = focusKeys ? (Array.isArray(focusKeys) ? focusKeys : [focusKeys]) : null;
    Object.keys(COMP).forEach(k => drawComp(k, !keys || keys.includes(k) ? 1.0 : dimAlpha));
  }

  /* ── Draw: signal particle with history trail ─────────────── */
  function drawSig(s, col, size = 2.8, glowR = 16) {
    const hist = s.hist;
    if (!hist || hist.length < 2) return;

    /* History trail — gets brighter and thicker toward head */
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = hist.length-1; i > 0; i--) {
      const prog = 1 - i/hist.length;
      const [x1,y1] = hist[i], [x2,y2] = hist[i-1];
      if (Math.abs(x1-x2) > 0.12 || Math.abs(y1-y2) > 0.12) continue;
      ctx.beginPath();
      ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2));
      ctx.strokeStyle = c(col, prog * 0.70);
      ctx.lineWidth   = prog * 3.2;
      ctx.stroke();
    }

    /* Head glow */
    const [hx, hy] = hist[0];
    const sx = px(hx), sy = py(hy);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    g.addColorStop(0,   c(col, 0.72));
    g.addColorStop(0.4, c(col, 0.28));
    g.addColorStop(1,   c(col, 0));
    ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();

    /* White-hot core with shadow glow */
    ctx.shadowColor = c(col, 0.90);
    ctx.shadowBlur  = 10;
    ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2);
    ctx.fillStyle = c(SNOW, 0.98); ctx.fill();
    ctx.shadowBlur = 0;
  }

  /* ════════════════════════════════════════════════════════════
     SCENE 0 — Overview: everything alive, all signals flowing
  ════════════════════════════════════════════════════════════ */
  function drawScene0() {
    drawBoardBase(TEAL);
    drawAllTraces(null);
    drawAllVias();
    drawCaps();
    drawAllComps(null);
    sigs.forEach(s => { stepSig(s); drawSig(s, s.col); });
  }

  /* ════════════════════════════════════════════════════════════
     SCENE 1 — Schematic / Design: MCU as hub, net-web overlay
  ════════════════════════════════════════════════════════════ */
  function drawScene1() {
    drawBoardBase(TEAL);
    drawAllTraces(['clk','sig','usb']);
    drawAllVias(0.28);
    drawCaps(0.25);
    drawAllComps('mcu');

    const cp    = COMP.mcu;
    const mx    = px(cp.x + cp.w/2), my = py(cp.y + cp.h/2);
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.042);

    /* Web lines to every other component */
    Object.entries(COMP).filter(([k]) => k !== 'mcu').forEach(([, cp2]) => {
      const tx = px(cp2.x + cp2.w/2), ty = py(cp2.y + cp2.h/2);
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty);
      ctx.strokeStyle = c(TEAL, 0.09 + 0.06*pulse);
      ctx.lineWidth   = 0.8; ctx.stroke();
    });

    /* Radial aura */
    const aura = ctx.createRadialGradient(mx, my, 0, mx, my, pw(0.25));
    aura.addColorStop(0, c(TEAL, 0.22*pulse)); aura.addColorStop(1, c(TEAL, 0));
    ctx.beginPath(); ctx.arc(mx, my, pw(0.25), 0, Math.PI*2);
    ctx.fillStyle = aura; ctx.fill();

    /* Orbiting net labels */
    const nets = ['SPI','I²C','UART','GPIO','USB','PCIe','CAN','I2S'];
    ctx.font = '8px monospace'; ctx.textAlign = 'center';
    nets.forEach((n, i) => {
      const ang = (i/nets.length) * Math.PI*2 - Math.PI/2;
      const nr  = pw(0.22);
      ctx.fillStyle = c(TEAL, 0.40 + 0.18*pulse);
      ctx.fillText(n, mx + Math.cos(ang)*nr, my + Math.sin(ang)*nr + 3);
      ctx.beginPath();
      ctx.arc(mx + Math.cos(ang)*pw(0.145), my + Math.sin(ang)*pw(0.145), 1.5, 0, Math.PI*2);
      ctx.fillStyle = c(TEAL, 0.38); ctx.fill();
    });

    sigs.filter(s => s.type==='clk' || s.type==='sig').forEach(s => {
      stepSig(s); drawSig(s, s.col, 2.2, 10);
    });
  }

  /* ════════════════════════════════════════════════════════════
     SCENE 2 — High-Speed DDR: diff pairs, serpentine meanders
  ════════════════════════════════════════════════════════════ */
  function drawScene2() {
    drawBoardBase(TEAL);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    TRACES.forEach(tr => {
      ctx.beginPath();
      ctx.moveTo(px(tr.pts[0][0]), py(tr.pts[0][1]));
      for (let i = 1; i < tr.pts.length; i++) ctx.lineTo(px(tr.pts[i][0]), py(tr.pts[i][1]));
      ctx.strokeStyle = c(tr.col, tr.type==='hs' ? 0.62 : 0.07);
      ctx.lineWidth   = tr.lw; ctx.stroke();
    });
    drawAllVias(0.50); drawCaps(0.18);
    drawAllComps(['mcu','ddr'], 0.11);

    /* Glow band between DDR ↔ MCU */
    const x1=px(0.23), x2=px(0.35), y1=py(0.27), y2=py(0.47);
    const bg = ctx.createLinearGradient(x1, 0, x2, 0);
    bg.addColorStop(0, c(TEAL,0)); bg.addColorStop(0.5, c(TEAL,0.09)); bg.addColorStop(1, c(TEAL,0));
    ctx.fillStyle = bg; ctx.fillRect(x1, y1, x2-x1, y2-y1);

    /* Serpentine length-matching stubs */
    const smx=(x1+x2)/2, smy=(y1+y2)/2;
    for (let row = 0; row < 7; row++) {
      const ry = smy - 24 + row * 8;
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const sx = smx-42+i*5.5, sy = ry + (i%2===0 ? 4.5 : -4.5);
        i===0 ? ctx.moveTo(sx,sy) : ctx.lineTo(sx,sy);
      }
      ctx.strokeStyle = c(TEAL, 0.52); ctx.lineWidth = 0.95; ctx.stroke();
    }

    /* Ultra-fast DDR signals */
    sigs.filter(s => s.type==='hs').forEach(s => {
      stepSig(s, 2.8); drawSig(s, TEAL, 3.0, 11);
    });

    /* Spec annotation box */
    const bx2 = px(0.285), by2 = py(0.51);
    ctx.fillStyle = 'rgba(0,10,4,0.72)';
    ctx.beginPath(); ctx.roundRect(bx2-46, by2, 92, 50, 3); ctx.fill();
    ctx.font = '8px monospace'; ctx.fillStyle = c(TEAL, 0.80); ctx.textAlign = 'center';
    ['DDR5-6400 MT/s','4× Diff Pair','100-Ω Impedance','Length ±0.1 mm'].forEach((l, i) => {
      ctx.fillText(l, bx2, by2+11+i*10);
    });
  }

  /* ════════════════════════════════════════════════════════════
     SCENE 3 — RF / Antenna: ground pour, radiation rings
  ════════════════════════════════════════════════════════════ */
  function drawScene3() {
    /* Diagonal ground pour hatch */
    ctx.save();
    ctx.beginPath(); ctx.roundRect(BX(), BY(), BW(), BH(), 12); ctx.clip();
    ctx.strokeStyle = 'rgba(35,90,45,0.06)'; ctx.lineWidth = 0.7;
    for (let lx = BX()-BH(); lx < BX()+BW(); lx += 14) {
      ctx.beginPath(); ctx.moveTo(lx, BY()); ctx.lineTo(lx+BH(), BY()+BH()); ctx.stroke();
    }
    ctx.restore();

    drawBoardBase(AMBER);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    TRACES.forEach(tr => {
      ctx.beginPath();
      ctx.moveTo(px(tr.pts[0][0]), py(tr.pts[0][1]));
      for (let i = 1; i < tr.pts.length; i++) ctx.lineTo(px(tr.pts[i][0]), py(tr.pts[i][1]));
      ctx.strokeStyle = c(tr.col, tr.type==='rf' ? 0.68 : 0.06);
      ctx.lineWidth   = tr.lw; ctx.stroke();
    });
    drawAllVias(0.38); drawCaps(0.08);
    drawAllComps(['rf','ant'], 0.11);
    drawComp('mcu', 0.35);

    /* RF keepout */
    const rf = COMP.rf, an = COMP.ant;
    const vx=px(rf.x-0.01), vy=py(rf.y-0.01);
    const vw=pw(rf.w+an.w+0.06), vh=ph(an.y+an.h-rf.y+0.06);
    ctx.setLineDash([4,3]);
    ctx.strokeStyle = c(AMBER, 0.38); ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh); ctx.setLineDash([]);
    ctx.font = '7px monospace'; ctx.fillStyle = c(AMBER, 0.48);
    ctx.textAlign = 'left'; ctx.fillText('RF KEEPOUT', vx+3, vy-4);

    /* Expanding radiation arcs */
    const acp  = COMP.ant;
    const antX = px(acp.x + acp.w*0.5), antY = py(acp.y);
    for (let i = 0; i < 6; i++) {
      const phase = ((tick * 0.013) + i/6) % 1;
      const rad   = phase * pw(0.36), alp = (1-phase) * 0.55;
      ctx.beginPath(); ctx.arc(antX, antY, rad, -Math.PI, 0);
      ctx.strokeStyle = c(AMBER, alp); ctx.lineWidth = 2; ctx.stroke();
    }

    /* IFA antenna outline (glowing) */
    const ax=px(acp.x), ay=py(acp.y), aw=pw(acp.w), ah=ph(acp.h);
    ctx.shadowColor = c(AMBER, 0.65); ctx.shadowBlur = 12;
    ctx.strokeStyle = c(AMBER, 0.88); ctx.lineWidth = 3;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, ay+ah*0.5); ctx.lineTo(ax, ay);
    ctx.lineTo(ax+aw, ay); ctx.lineTo(ax+aw, ay+ah*0.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay+ah); ctx.lineTo(ax, ay+ah*0.72);
    ctx.lineTo(ax+aw*0.65, ay+ah*0.72); ctx.stroke();
    ctx.shadowBlur = 0;

    const rfSig = sigs.find(s => s.type==='rf');
    if (rfSig) { stepSig(rfSig); drawSig(rfSig, AMBER, 3.5, 22); }

    ctx.font = '8px monospace'; ctx.fillStyle = c(AMBER, 0.72); ctx.textAlign = 'center';
    ctx.fillText('2.4 / 5 GHz', px(rf.x+rf.w/2), py(rf.y+rf.h+0.07));
    ctx.fillText('50 Ω CPWG',   px(0.63),          py(0.28));
    ctx.fillText('VSWR < 1.5',  px(0.63),          py(0.32));
  }

  /* ════════════════════════════════════════════════════════════
     SCENE 4 — Manufacturing: Gerber layer reveal, drill hits
  ════════════════════════════════════════════════════════════ */
  const LAYERS = [
    { n:'L1 Top Cu', col:{ r:94, g:240, b:208 }, a:0.55 },
    { n:'L2 GND',    col:{ r:60, g:200, b:100 }, a:0.38 },
    { n:'L3 PWR',    col:{ r:240,g:175, b:60  }, a:0.38 },
    { n:'L4 Bot Cu', col:{ r:80, g:160, b:240 }, a:0.50 },
  ];

  function drawScene4() {
    const li = Math.floor(tick / 110) % 4;

    /* Layer copper fills */
    LAYERS.forEach((l, i) => {
      if (i > li) return;
      ctx.beginPath(); ctx.roundRect(BX()+2, BY()+2, BW()-4, BH()-4, 12);
      ctx.fillStyle = `rgba(${l.col.r},${l.col.g},${l.col.b},${i===li ? l.a+0.14 : l.a*0.35})`;
      ctx.fill();
    });

    drawBoardBase(SNOW);

    /* Blinking drill hits */
    VIAS.forEach(([rx, ry]) => {
      const vx=px(rx), vy=py(ry);
      const blink = Math.abs(Math.sin(tick*0.042 + rx*9)) > 0.60;
      ctx.beginPath(); ctx.arc(vx, vy, 6.5, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(255,255,255,${blink?0.82:0.20})`; ctx.lineWidth=1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(vx, vy, 2.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${blink?0.96:0.28})`; ctx.fill();
    });

    /* Silkscreen */
    ctx.strokeStyle = 'rgba(235,255,245,0.24)'; ctx.lineWidth = 0.8;
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(235,255,245,0.18)'; ctx.textAlign = 'center';
    Object.values(COMP).forEach(cp => {
      ctx.beginPath(); ctx.roundRect(px(cp.x)-1, py(cp.y)-1, pw(cp.w)+2, ph(cp.h)+2, 3); ctx.stroke();
      ctx.fillText(cp.label.split(' ')[0], px(cp.x+cp.w/2), py(cp.y)-4);
    });

    /* Layer legend */
    const lx = BX()+BW()-108, ly = BY()+8;
    ctx.fillStyle = 'rgba(0,6,2,0.80)';
    ctx.beginPath(); ctx.roundRect(lx, ly, 102, 78, 4); ctx.fill();
    ctx.font = '7px monospace'; ctx.fillStyle = c(TEAL, 0.58); ctx.textAlign = 'left';
    ctx.fillText('Gerber Layers', lx+6, ly+11);
    LAYERS.forEach((l, i) => {
      const ey = ly+22+i*13;
      ctx.beginPath(); ctx.arc(lx+10, ey-3, 5.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${l.col.r},${l.col.g},${l.col.b},${i<=li ? 0.90 : 0.18})`; ctx.fill();
      ctx.font = '8px monospace';
      ctx.fillStyle = `rgba(220,240,228,${i<=li ? 0.88 : 0.22})`;
      ctx.fillText(l.n, lx+20, ey);
    });

    /* Dimension line */
    ctx.setLineDash([2,3]); ctx.strokeStyle='rgba(175,200,185,0.30)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(BX(), BY()-10); ctx.lineTo(BX()+BW(), BY()-10); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font='8px monospace'; ctx.fillStyle='rgba(155,175,165,0.58)'; ctx.textAlign='center';
    ctx.fillText(
      `${Math.round(BW()/DPR*0.6)} × ${Math.round(BH()/DPR*0.6)} mm`,
      BX()+BW()/2, BY()-14
    );
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

  /* ── Scene change ────────────────────────────────────────── */
  function changeScene(n) {
    if (n === scene) return;
    canvas.style.opacity = '0';
    setTimeout(() => {
      scene = n; tick = 0;
      ctx.clearRect(0, 0, CW, CH);
      canvas.style.opacity = '1';
    }, 370);
  }

  window.addEventListener('hero-slide-change', e => changeScene(e.detail.index));

  /* ── Resize / init ───────────────────────────────────────── */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = frame.getBoundingClientRect();
    CW = r.width; CH = r.height;
    canvas.width  = Math.round(CW * DPR);
    canvas.height = Math.round(CH * DPR);
    canvas.style.width  = CW + 'px';
    canvas.style.height = CH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initSigs();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(frame); resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(draw);
  });

  raf = requestAnimationFrame(draw);
}
