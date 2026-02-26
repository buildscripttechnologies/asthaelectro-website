/* ================================================================
   PCB CANVAS — ONE board, 5 slide-coordinated animation modes
   The same physical PCB is always rendered; each slide shifts focus
   to a different section with unique signal behaviour and overlays.
================================================================ */
export function initPCBCanvas() {
  const frame  = document.querySelector('.pcb-frame');
  const canvas = document.getElementById('pcb-canvas');
  if (!frame || !canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  canvas.style.transition = 'opacity 0.32s ease';

  /* ── Palette ──────────────────────────────────────────────── */
  const TEAL   = { r: 94,  g: 240, b: 208 };
  const AMBER  = { r: 240, g: 192, b: 94  };
  const VIOLET = { r: 155, g: 141, b: 255 };
  const COPPER = { r: 184, g: 135, b: 55  };
  const WHITE  = { r: 230, g: 240, b: 255 };
  const rgba = (col, a) => `rgba(${col.r},${col.g},${col.b},${(+a).toFixed(3)})`;

  let W = 0, H = 0, DPR = 1;
  let raf = null;
  let scene = 0;
  let tick  = 0;   /* frame counter, resets on scene change */

  /* ── Board coordinate helpers ─────────────────────────────── */
  const MX = 0.07, MY = 0.07;
  const bx  = () => W * MX;
  const by  = () => H * MY;
  const bw  = () => W * (1 - 2 * MX);
  const bh  = () => H * (1 - 2 * MY);
  const cpx = rx => bx() + rx * bw();   /* normalised → canvas x */
  const cpy = ry => by() + ry * bh();   /* normalised → canvas y */
  const cpw = rw => rw * bw();
  const cph = rh => rh * bh();

  /* ── Component definitions ───────────────────────────────── */
  const COMP = {
    mcu:  { x:0.34, y:0.28, w:0.26, h:0.32, label:'U1  SoC',      col:TEAL   },
    ddr:  { x:0.04, y:0.30, w:0.18, h:0.24, label:'U2  DDR5',     col:TEAL   },
    rf:   { x:0.66, y:0.06, w:0.20, h:0.18, label:'U3  RF',       col:AMBER  },
    ant:  { x:0.88, y:0.10, w:0.06, h:0.26, label:'ANT',          col:AMBER  },
    pmic: { x:0.06, y:0.68, w:0.16, h:0.18, label:'U4  PMIC',     col:VIOLET },
    dcdc: { x:0.30, y:0.74, w:0.14, h:0.14, label:'U5  DCDC',     col:VIOLET },
    usb:  { x:0.56, y:0.74, w:0.12, h:0.18, label:'J1  USB-C',    col:TEAL   },
    adc:  { x:0.72, y:0.32, w:0.14, h:0.16, label:'U6  ADC',      col:VIOLET },
    xtal: { x:0.42, y:0.06, w:0.10, h:0.08, label:'Y1  26MHz',    col:AMBER  },
  };

  /* ── Trace routes ────────────────────────────────────────── */
  const TRACES = [
    /* DDR5 ↔ MCU — 4 high-speed diff pairs */
    { pts:[[0.22,0.355],[0.34,0.355]], col:TEAL,   type:'hs',  lw:1.2 },
    { pts:[[0.22,0.375],[0.34,0.375]], col:TEAL,   type:'hs',  lw:1.2 },
    { pts:[[0.22,0.415],[0.34,0.415]], col:TEAL,   type:'hs',  lw:1.2 },
    { pts:[[0.22,0.435],[0.34,0.435]], col:TEAL,   type:'hs',  lw:1.2 },
    /* MCU ↔ RF */
    { pts:[[0.60,0.34],[0.66,0.20]], col:AMBER,  type:'rf',  lw:1.5 },
    /* MCU ↔ ADC — SPI */
    { pts:[[0.60,0.38],[0.72,0.38]], col:VIOLET, type:'sig', lw:1.0 },
    { pts:[[0.60,0.42],[0.72,0.42]], col:VIOLET, type:'sig', lw:1.0 },
    { pts:[[0.60,0.46],[0.72,0.46]], col:VIOLET, type:'sig', lw:1.0 },
    /* MCU ↔ USB-C */
    { pts:[[0.62,0.60],[0.62,0.74]], col:TEAL,   type:'usb', lw:1.2 },
    { pts:[[0.64,0.60],[0.64,0.74]], col:TEAL,   type:'usb', lw:1.2 },
    /* MCU ↔ Crystal */
    { pts:[[0.47,0.28],[0.47,0.14]], col:AMBER,  type:'clk', lw:1.0 },
    { pts:[[0.50,0.28],[0.50,0.14]], col:AMBER,  type:'clk', lw:1.0 },
    /* Power rails */
    { pts:[[0.22,0.72],[0.34,0.72],[0.34,0.60]], col:VIOLET, type:'pwr', lw:3.0 },
    { pts:[[0.44,0.74],[0.47,0.74],[0.47,0.60]], col:VIOLET, type:'pwr', lw:2.5 },
    /* ANT ↔ RF */
    { pts:[[0.88,0.18],[0.86,0.18]], col:AMBER,  type:'rf',  lw:1.5 },
  ];

  /* ── Via positions ───────────────────────────────────────── */
  const VIAS = [
    [0.34,0.72],[0.47,0.60],[0.62,0.60],[0.47,0.14],
    [0.66,0.20],[0.72,0.38],[0.22,0.36],
    [0.15,0.55],[0.70,0.65],[0.25,0.18],[0.78,0.55],[0.55,0.80],
  ];

  /* ── Signal particles ────────────────────────────────────── */
  const SIG_DEFS = [
    { route:[[0.22,0.355],[0.34,0.355]], col:TEAL,   spd:0.009, type:'hs'  },
    { route:[[0.34,0.415],[0.22,0.415]], col:TEAL,   spd:0.008, type:'hs'  },
    { route:[[0.22,0.435],[0.34,0.435]], col:TEAL,   spd:0.010, type:'hs'  },
    { route:[[0.60,0.34],[0.66,0.20]],  col:AMBER,  spd:0.007, type:'rf'  },
    { route:[[0.60,0.38],[0.72,0.38]],  col:VIOLET, spd:0.008, type:'sig' },
    { route:[[0.64,0.74],[0.64,0.60]],  col:TEAL,   spd:0.009, type:'usb' },
    { route:[[0.47,0.14],[0.47,0.28]],  col:AMBER,  spd:0.011, type:'clk' },
    { route:[[0.34,0.72],[0.34,0.60]],  col:VIOLET, spd:0.006, type:'pwr' },
  ];

  let sigs = [];
  function initSigs() {
    sigs = SIG_DEFS.map(s => ({ ...s, t: Math.random(), prev: null }));
  }

  function sigPos(s) {
    const r   = s.route;
    const seg = s.t * (r.length - 1);
    const i   = Math.min(Math.floor(seg), r.length - 2);
    const f   = seg - i;
    return [r[i][0] + (r[i+1][0]-r[i][0])*f, r[i][1] + (r[i+1][1]-r[i][1])*f];
  }

  function stepSig(s, mul = 1) {
    s.prev = sigPos(s);
    s.t    = (s.t + s.spd * mul) % 1;
  }

  /* ── Drawing primitives ──────────────────────────────────── */

  function drawBoardOutline(glowCol) {
    ctx.beginPath();
    ctx.roundRect(bx(), by(), bw(), bh(), 14);
    ctx.fillStyle = 'rgba(3,14,22,0.94)';
    ctx.fill();

    ctx.shadowColor = rgba(glowCol || TEAL, 0.45);
    ctx.shadowBlur  = 22;
    ctx.strokeStyle = rgba(glowCol || TEAL, 0.42);
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    /* Corner fiducials */
    [[bx()+10,by()+10],[bx()+bw()-10,by()+10],
     [bx()+10,by()+bh()-10],[bx()+bw()-10,by()+bh()-10]].forEach(([fx,fy]) => {
      ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI*2);
      ctx.strokeStyle = rgba(TEAL, 0.35); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI*2);
      ctx.fillStyle = rgba(COPPER, 0.65); ctx.fill();
    });
  }

  function drawTraceLine(tr, alpha) {
    ctx.beginPath();
    ctx.moveTo(cpx(tr.pts[0][0]), cpy(tr.pts[0][1]));
    for (let i = 1; i < tr.pts.length; i++) {
      ctx.lineTo(cpx(tr.pts[i][0]), cpy(tr.pts[i][1]));
    }
    ctx.strokeStyle = rgba(tr.col, alpha);
    ctx.lineWidth   = tr.lw;
    ctx.stroke();
  }

  function drawTraces(highlight) {
    const types = highlight ? (Array.isArray(highlight) ? highlight : [highlight]) : null;
    TRACES.forEach(tr => {
      const hl = !types || types.includes(tr.type);
      drawTraceLine(tr, hl ? 0.55 : 0.09);
    });
  }

  function drawVias(alpha = 1) {
    VIAS.forEach(([rx, ry]) => {
      const vx = cpx(rx), vy = cpy(ry);
      ctx.beginPath(); ctx.arc(vx, vy, 4.5, 0, Math.PI*2);
      ctx.fillStyle   = rgba(TEAL, 0.06 * alpha); ctx.fill();
      ctx.strokeStyle = rgba(TEAL, 0.30 * alpha); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(vx, vy, 1.8, 0, Math.PI*2);
      ctx.fillStyle   = rgba(COPPER, 0.55 * alpha); ctx.fill();
    });
  }

  function drawComp(key, alpha = 1) {
    const cp = COMP[key];
    const cx = cpx(cp.x), cy = cpy(cp.y), cw = cpw(cp.w), ch = cph(cp.h);

    ctx.fillStyle   = `rgba(5,18,28,${0.95 * alpha})`;
    ctx.strokeStyle = rgba(cp.col, 0.65 * alpha);
    ctx.lineWidth   = 1.2;
    ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 4);
    ctx.fill(); ctx.stroke();

    /* Pad dots on all four edges */
    const pads = Math.max(2, Math.round(Math.min(cw, ch) / 9));
    for (let i = 0; i < pads; i++) {
      const r = (i + 0.5) / pads;
      [[cx,       cy+ch*r],[cx+cw,   cy+ch*r],
       [cx+cw*r,  cy     ],[cx+cw*r, cy+ch  ]].forEach(([padX, padY]) => {
        ctx.beginPath(); ctx.arc(padX, padY, 1.4, 0, Math.PI*2);
        ctx.fillStyle = rgba(COPPER, 0.45 * alpha); ctx.fill();
      });
    }

    const fs = Math.max(7, Math.min(10, cw * 0.15));
    ctx.font      = `${fs}px monospace`;
    ctx.fillStyle = rgba(cp.col, 0.75 * alpha);
    ctx.textAlign = 'center';
    ctx.fillText(cp.label, cx + cw/2, cy + ch/2 + fs/3);
  }

  function drawAllComps(focusKeys) {
    const keys = focusKeys ? (Array.isArray(focusKeys) ? focusKeys : [focusKeys]) : null;
    Object.keys(COMP).forEach(k => drawComp(k, !keys || keys.includes(k) ? 1.0 : 0.16));
  }

  function drawSigParticle(pos, col, size = 2.5, glowR = 14) {
    const sx = cpx(pos[0]), sy = cpy(pos[1]);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    g.addColorStop(0, rgba(col, 0.52)); g.addColorStop(1, rgba(col, 0));
    ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, size,  0, Math.PI*2); ctx.fillStyle = rgba(col, 0.96); ctx.fill();
  }

  function drawSigTrail(s, col) {
    if (!s.prev) return;
    const cur = sigPos(s);
    if (Math.abs(cur[0]-s.prev[0]) > 0.1 || Math.abs(cur[1]-s.prev[1]) > 0.1) return;
    const sx = cpx(cur[0]), sy = cpy(cur[1]);
    const tx = cpx(s.prev[0]), ty = cpy(s.prev[1]);
    const g  = ctx.createLinearGradient(tx, ty, sx, sy);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.60));
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx, sy);
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.stroke();
  }

  /* ── Scene 0: Overview — full board, all signals ─────────── */
  function drawScene0() {
    drawBoardOutline(TEAL);
    drawTraces(null);
    drawVias();
    drawAllComps(null);
    sigs.forEach(s => {
      stepSig(s);
      drawSigTrail(s, s.col);
      drawSigParticle(sigPos(s), s.col);
    });
  }

  /* ── Scene 1: Schematic — MCU as hub, net-web overlay ──────── */
  function drawScene1() {
    drawBoardOutline(TEAL);
    drawTraces(['clk','sig','usb']);
    drawVias(0.30);
    drawAllComps('mcu');

    const cp    = COMP.mcu;
    const mx    = cpx(cp.x + cp.w/2), my = cpy(cp.y + cp.h/2);
    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.045);

    /* Net web: thin lines from MCU center to each other component */
    Object.entries(COMP).filter(([k]) => k !== 'mcu').forEach(([, cp2]) => {
      const tx = cpx(cp2.x + cp2.w/2), ty = cpy(cp2.y + cp2.h/2);
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty);
      ctx.strokeStyle = rgba(TEAL, 0.10 + 0.06 * pulse);
      ctx.lineWidth   = 0.8; ctx.stroke();
    });

    /* Radial glow around MCU */
    const rg = ctx.createRadialGradient(mx, my, 0, mx, my, cpw(0.22));
    rg.addColorStop(0, rgba(TEAL, 0.20 * pulse)); rg.addColorStop(1, rgba(TEAL, 0));
    ctx.beginPath(); ctx.arc(mx, my, cpw(0.22), 0, Math.PI*2); ctx.fillStyle = rg; ctx.fill();

    /* Orbiting net labels */
    const nets = ['SPI','I²C','UART','GPIO','USB','PCIe','I2S','CAN'];
    ctx.font = '8px monospace'; ctx.textAlign = 'center';
    nets.forEach((n, i) => {
      const ang = (i / nets.length) * Math.PI * 2 - Math.PI / 2;
      const nr  = cpw(0.21);
      ctx.fillStyle = rgba(TEAL, 0.38 + 0.18 * pulse);
      ctx.fillText(n, mx + Math.cos(ang)*nr, my + Math.sin(ang)*nr + 3);
      ctx.beginPath();
      ctx.arc(mx + Math.cos(ang)*cpw(0.14), my + Math.sin(ang)*cpw(0.14), 1.5, 0, Math.PI*2);
      ctx.fillStyle = rgba(TEAL, 0.4); ctx.fill();
    });

    sigs.filter(s => s.type==='clk' || s.type==='sig').forEach(s => {
      stepSig(s); drawSigTrail(s, s.col); drawSigParticle(sigPos(s), s.col, 2, 10);
    });
  }

  /* ── Scene 2: High-speed — DDR diff pairs + serpentine ──────── */
  function drawScene2() {
    drawBoardOutline(TEAL);
    TRACES.forEach(tr => drawTraceLine(tr, tr.type==='hs' ? 0.62 : 0.08));
    drawVias(0.50);
    drawAllComps(['mcu','ddr']);

    /* Glow band between DDR ↔ MCU */
    const x1=cpx(0.22), x2=cpx(0.34), y1=cpy(0.34), y2=cpy(0.46);
    const bg = ctx.createLinearGradient(x1,0,x2,0);
    bg.addColorStop(0, rgba(TEAL,0));
    bg.addColorStop(0.5, rgba(TEAL,0.09));
    bg.addColorStop(1, rgba(TEAL,0));
    ctx.fillStyle = bg; ctx.fillRect(x1, y1, x2-x1, y2-y1);

    /* Serpentine meanders */
    const mx = (x1+x2)/2, my = (y1+y2)/2;
    for (let row = 0; row < 4; row++) {
      const ry = my - 18 + row * 12;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const sx = mx - 36 + i*6, sy = ry + (i%2===0 ? 5 : -5);
        i === 0 ? ctx.moveTo(sx,sy) : ctx.lineTo(sx,sy);
      }
      ctx.strokeStyle = rgba(TEAL, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
    }

    /* Fast DDR signals */
    sigs.filter(s => s.type==='hs').forEach(s => {
      stepSig(s, 2.5);
      drawSigTrail(s, TEAL);
      drawSigParticle(sigPos(s), TEAL, 3, 10);
    });

    ctx.font = '8px monospace'; ctx.fillStyle = rgba(TEAL, 0.65); ctx.textAlign = 'center';
    ['DDR5-6400 MT/s', '±0.1 mm Match', 'Eye: 100% Pass'].forEach((l, i) => {
      ctx.fillText(l, cpx(0.28), cpy(0.60) + i * 13);
    });
  }

  /* ── Scene 3: RF / Antenna — ground pour, radiation rings ──── */
  function drawScene3() {
    /* Ground pour diagonal hatch */
    ctx.save();
    ctx.beginPath(); ctx.roundRect(bx(), by(), bw(), bh(), 14); ctx.clip();
    ctx.strokeStyle = rgba(TEAL, 0.035); ctx.lineWidth = 0.8;
    for (let lx = bx()-bh(); lx < bx()+bw(); lx += 16) {
      ctx.beginPath(); ctx.moveTo(lx, by()); ctx.lineTo(lx+bh(), by()+bh()); ctx.stroke();
    }
    ctx.restore();

    drawBoardOutline(AMBER);
    TRACES.forEach(tr => drawTraceLine(tr, tr.type==='rf' ? 0.65 : 0.07));
    drawVias(0.40);
    drawAllComps(['rf','ant']);
    drawComp('mcu', 0.40);

    /* RF keepout dashed rect */
    const rf = COMP.rf, an = COMP.ant;
    const vx = cpx(rf.x-0.01), vy = cpy(rf.y-0.01);
    const vw = cpw(rf.w+an.w+0.06), vh = cph(an.y+an.h-rf.y+0.04);
    ctx.setLineDash([4,3]);
    ctx.strokeStyle = rgba(AMBER, 0.30); ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.setLineDash([]);
    ctx.font = '7px monospace'; ctx.fillStyle = rgba(AMBER, 0.40);
    ctx.textAlign = 'left'; ctx.fillText('RF KEEPOUT', vx+3, vy-3);

    /* Expanding radiation arcs from antenna */
    const acp  = COMP.ant;
    const antX = cpx(acp.x + acp.w*0.5), antY = cpy(acp.y);
    for (let i = 0; i < 5; i++) {
      const phase  = ((tick * 0.012) + i * 0.2) % 1;
      const radius = phase * cpw(0.30);
      const alp    = (1 - phase) * 0.48;
      ctx.beginPath(); ctx.arc(antX, antY, radius, -Math.PI, 0);
      ctx.strokeStyle = rgba(AMBER, alp); ctx.lineWidth = 1.5; ctx.stroke();
    }

    /* IFA antenna shape */
    const ax = cpx(acp.x), ay = cpy(acp.y), aw = cpw(acp.w), ah = cph(acp.h);
    ctx.strokeStyle = rgba(AMBER, 0.80); ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay+ah*0.5); ctx.lineTo(ax, ay);
    ctx.lineTo(ax+aw, ay); ctx.lineTo(ax+aw, ay+ah*0.5); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay+ah); ctx.lineTo(ax, ay+ah*0.7);
    ctx.lineTo(ax+aw*0.65, ay+ah*0.7); ctx.stroke();

    const rfSig = sigs.find(s => s.type==='rf');
    if (rfSig) { stepSig(rfSig); drawSigTrail(rfSig, AMBER); drawSigParticle(sigPos(rfSig), AMBER, 3, 16); }

    ctx.font = '8px monospace'; ctx.fillStyle = rgba(AMBER, 0.65); ctx.textAlign = 'center';
    ctx.fillText('2.4 / 5 GHz', cpx(rf.x+rf.w/2), cpy(rf.y+rf.h+0.07));
    ctx.fillText('50 Ω CPWG',   cpx(0.63),          cpy(0.28));
  }

  /* ── Scene 4: Manufacturing / Gerber layer view ─────────── */
  const LAYERS = [
    { n:'L1 Top Cu', col:{ r:94, g:240, b:208 }, a:0.55 },
    { n:'L2 GND',    col:{ r:60, g:200, b:100 }, a:0.35 },
    { n:'L3 PWR',    col:{ r:240,g:175, b:60  }, a:0.35 },
    { n:'L4 Bot Cu', col:{ r:80, g:160, b:240 }, a:0.45 },
  ];
  let layerIdx = 0;

  function drawScene4() {
    layerIdx = Math.floor(tick / 100) % 4;

    /* Layered copper fills */
    LAYERS.forEach((l, i) => {
      if (i > layerIdx) return;
      ctx.beginPath(); ctx.roundRect(bx()+2, by()+2, bw()-4, bh()-4, 12);
      ctx.fillStyle = `rgba(${l.col.r},${l.col.g},${l.col.b},${i===layerIdx ? l.a+0.12 : l.a*0.38})`;
      ctx.fill();
    });

    drawBoardOutline(WHITE);

    /* Blinking drill hits */
    VIAS.forEach(([rx, ry]) => {
      const vx = cpx(rx), vy = cpy(ry);
      const blink = Math.abs(Math.sin(tick*0.04 + rx*8)) > 0.65;
      ctx.beginPath(); ctx.arc(vx, vy, 5.5, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(255,255,255,${blink?0.78:0.22})`; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.arc(vx, vy, 2.2, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${blink?0.92:0.30})`; ctx.fill();
    });

    /* Silkscreen outlines + ref designators */
    ctx.strokeStyle = 'rgba(240,248,255,0.28)'; ctx.lineWidth = 0.8;
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(240,248,255,0.22)'; ctx.textAlign = 'center';
    Object.values(COMP).forEach(cp => {
      ctx.beginPath(); ctx.roundRect(cpx(cp.x)-1, cpy(cp.y)-1, cpw(cp.w)+2, cph(cp.h)+2, 3); ctx.stroke();
      ctx.fillText(cp.label.split(' ')[0], cpx(cp.x+cp.w/2), cpy(cp.y)-4);
    });

    /* Layer legend panel */
    const lx = bx()+bw()-108, ly = by()+8;
    ctx.fillStyle = 'rgba(0,6,18,0.75)';
    ctx.beginPath(); ctx.roundRect(lx, ly, 100, 74, 4); ctx.fill();
    ctx.font = '7px monospace'; ctx.fillStyle = rgba(TEAL, 0.55); ctx.textAlign = 'left';
    ctx.fillText('Gerber Layers', lx+6, ly+11);
    LAYERS.forEach((l, i) => {
      const ey = ly+20+i*13;
      ctx.beginPath(); ctx.arc(lx+10, ey-2, 4.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${l.col.r},${l.col.g},${l.col.b},${i<=layerIdx?0.88:0.20})`; ctx.fill();
      ctx.font = '8px monospace';
      ctx.fillStyle = `rgba(220,230,245,${i<=layerIdx?0.85:0.25})`;
      ctx.fillText(l.n, lx+20, ey);
    });

    /* Board dimension line */
    ctx.setLineDash([2,3]); ctx.strokeStyle='rgba(180,190,210,0.28)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(bx(), by()-10); ctx.lineTo(bx()+bw(), by()-10); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '8px monospace'; ctx.fillStyle='rgba(160,170,190,0.50)'; ctx.textAlign='center';
    ctx.fillText(
      `${Math.round(bw()/DPR * 0.6)} × ${Math.round(bh()/DPR * 0.6)} mm`,
      bx()+bw()/2, by()-13
    );
  }

  /* ── Main render loop ─────────────────────────────────────── */
  function draw() {
    ctx.clearRect(0, 0, W, H);
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

  /* ── Scene switch with crossfade ──────────────────────────── */
  function changeScene(n) {
    if (n === scene) return;
    canvas.style.opacity = '0';
    setTimeout(() => {
      scene = n; tick = 0;
      ctx.clearRect(0, 0, W, H);
      canvas.style.opacity = '1';
    }, 340);
  }

  window.addEventListener('hero-slide-change', e => changeScene(e.detail.index));

  /* ── Resize / init ────────────────────────────────────────── */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r  = frame.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initSigs();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(frame);
  resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(draw);
  });

  raf = requestAnimationFrame(draw);
}
