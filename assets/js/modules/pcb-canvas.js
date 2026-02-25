/* ================================================================
   PCB CANVAS — Realistic top-down PCB board simulation
   Draws FR4 substrate, copper traces, IC packages, passives,
   connectors, vias, silkscreen & animated signal packets.
================================================================ */
export function initPCBCanvas() {
  const canvas = document.getElementById('pcb-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animId, W, H;
  let signals   = [];
  let pxTraces  = [];

  // ── Color palette ────────────────────────────────────────────────
  const C = {
    outerBg:   '#020b08',
    substrate: '#071910',
    subTex:    'rgba(0,70,25,0.16)',
    outline:   '#c8a430',
    pad:       '#d4b03e',
    trSig:     'rgba(94,240,208,0.70)',
    trPow:     'rgba(255,148,48,0.75)',
    trClk:     'rgba(170,120,255,0.68)',
    silk:      'rgba(255,255,255,0.68)',
    silkDim:   'rgba(255,255,255,0.22)',
    body:      '#0d1e34',
    bodyLine:  'rgba(255,255,255,0.10)',
    viaRing:   '#c8a430',
    viaHole:   '#010a10',
    pourFill:  'rgba(94,240,208,0.045)',
    dotSig:    '#5ef0d0',
    dotPow:    '#ff9830',
    dotClk:    '#aa80ff',
    glowSig:   'rgba(94,240,208,0.70)',
    glowPow:   'rgba(255,152,48,0.70)',
    glowClk:   'rgba(170,128,255,0.70)',
  };

  // ── Board layout — all positions in 0-1 board-relative coords ────
  const TRACE_DEFS = [
    { t:'sig', pts:[[0.39,0.13],[0.39,0.21],[0.34,0.21],[0.34,0.29]], w:1.4 },
    { t:'sig', pts:[[0.44,0.13],[0.44,0.25],[0.39,0.25],[0.39,0.29]], w:1.4 },
    { t:'pow', pts:[[0.84,0.15],[0.84,0.60],[0.70,0.60],[0.70,0.67]], w:3.0 },
    { t:'pow', pts:[[0.70,0.73],[0.56,0.73],[0.56,0.60],[0.52,0.60]], w:2.5 },
    { t:'pow', pts:[[0.52,0.60],[0.52,0.47],[0.57,0.47]], w:2.0 },
    { t:'sig', pts:[[0.28,0.40],[0.20,0.40],[0.20,0.36],[0.16,0.36]], w:1.2 },
    { t:'sig', pts:[[0.28,0.43],[0.22,0.43],[0.22,0.46],[0.16,0.46]], w:1.2 },
    { t:'clk', pts:[[0.28,0.46],[0.24,0.46],[0.24,0.52],[0.16,0.52]], w:1.2 },
    { t:'clk', pts:[[0.33,0.73],[0.38,0.73],[0.38,0.60],[0.40,0.60]], w:1.0 },
    { t:'clk', pts:[[0.40,0.73],[0.42,0.73],[0.42,0.60]], w:1.0 },
    { t:'sig', pts:[[0.57,0.43],[0.82,0.43],[0.82,0.55],[0.87,0.55]], w:1.0 },
    { t:'sig', pts:[[0.57,0.47],[0.80,0.47],[0.80,0.60],[0.87,0.60]], w:1.0 },
    { t:'sig', pts:[[0.57,0.51],[0.78,0.51],[0.78,0.65],[0.87,0.65]], w:1.0 },
    { t:'sig', pts:[[0.52,0.60],[0.52,0.67],[0.56,0.67],[0.56,0.80]], w:1.0 },
    { t:'sig', pts:[[0.56,0.80],[0.62,0.80],[0.62,0.76],[0.67,0.76],[0.67,0.84]], w:1.0 },
    { t:'sig', pts:[[0.67,0.84],[0.74,0.84]], w:1.0 },
    { t:'sig', pts:[[0.74,0.84],[0.81,0.84],[0.81,0.90]], w:1.0 },
    { t:'pow', pts:[[0.34,0.29],[0.34,0.24]], w:1.0 },
    { t:'pow', pts:[[0.40,0.29],[0.40,0.24]], w:1.0 },
    { t:'pow', pts:[[0.52,0.29],[0.52,0.24]], w:1.0 },
    { t:'pow', pts:[[0.57,0.29],[0.57,0.24]], w:1.0 },
    { t:'sig', pts:[[0.16,0.40],[0.13,0.40],[0.13,0.82],[0.32,0.82],[0.32,0.74]], w:1.5 },
    { t:'pow', pts:[[0.70,0.73],[0.72,0.73],[0.72,0.81],[0.76,0.81]], w:1.8 },
    { t:'pow', pts:[[0.76,0.81],[0.80,0.81],[0.80,0.76],[0.84,0.76]], w:1.8 },
  ];

  const VIA_DEFS = [
    {rx:0.39,ry:0.21}, {rx:0.56,ry:0.60}, {rx:0.70,ry:0.60},
    {rx:0.52,ry:0.60}, {rx:0.38,ry:0.73}, {rx:0.82,ry:0.55},
    {rx:0.13,ry:0.82}, {rx:0.52,ry:0.67}, {rx:0.80,ry:0.81},
    {rx:0.24,ry:0.46}, {rx:0.84,ry:0.60}, {rx:0.62,ry:0.80},
    {rx:0.78,ry:0.51}, {rx:0.80,ry:0.47},
  ];

  const COMP_DEFS = [
    { id:'U1', lbl:'MCU',  type:'qfp',     rx:0.405, ry:0.360, rw:0.210, rh:0.210, pins:12 },
    { id:'U2', lbl:'RF',   type:'sop',     rx:0.125, ry:0.435, rw:0.095, rh:0.075, pins:4  },
    { id:'U3', lbl:'PMIC', type:'sop',     rx:0.700, ry:0.700, rw:0.115, rh:0.075, pins:4  },
    { id:'J1', lbl:'USB',  type:'conn',    rx:0.415, ry:0.090, rw:0.090, rh:0.055, pins:5  },
    { id:'J2', lbl:'VIN',  type:'conn',    rx:0.840, ry:0.105, rw:0.060, rh:0.045, pins:2  },
    { id:'J3', lbl:'JTAG', type:'thole',   rx:0.875, ry:0.600, rw:0.045, rh:0.115, px:2, py:3 },
    { id:'Y1', lbl:'8MHz', type:'xtal',    rx:0.295, ry:0.735, rw:0.070, rh:0.038 },
    { id:'C1', type:'passive', rx:0.335, ry:0.260, rw:0.022, rh:0.013 },
    { id:'C2', type:'passive', rx:0.395, ry:0.260, rw:0.022, rh:0.013 },
    { id:'C3', type:'passive', rx:0.520, ry:0.260, rw:0.022, rh:0.013 },
    { id:'C4', type:'passive', rx:0.575, ry:0.260, rw:0.022, rh:0.013 },
    { id:'C5', type:'passive', rx:0.760, ry:0.820, rw:0.028, rh:0.016 },
    { id:'C6', type:'passive', rx:0.815, ry:0.820, rw:0.028, rh:0.016 },
    { id:'R1', type:'passive', rx:0.560, ry:0.800, rw:0.022, rh:0.013 },
    { id:'R2', type:'passive', rx:0.140, ry:0.620, rw:0.022, rh:0.013 },
    { id:'R3', type:'passive', rx:0.285, ry:0.820, rw:0.022, rh:0.013 },
    { id:'LED1', type:'led', rx:0.675, ry:0.850, rw:0.022, rh:0.018, col:'#5ef0d0' },
    { id:'LED2', type:'led', rx:0.745, ry:0.850, rw:0.022, rh:0.018, col:'#ff9830' },
    { id:'LED3', type:'led', rx:0.815, ry:0.905, rw:0.022, rh:0.018, col:'#aa80ff' },
  ];

  // ── Board pixel coordinates (set in resize) ───────────────────────
  let _BX, _BY, _BW, _BH;
  const cpx = (rx) => _BX + rx * _BW;
  const cpy = (ry) => _BY + ry * _BH;
  const cps = (r)  => r * Math.min(_BW, _BH);

  // ── Resize + trace pre-computation ───────────────────────────────
  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    if (!W || !H) return;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const marg = Math.min(W, H) * 0.056;
    _BX = marg; _BY = marg;
    _BW = W - 2 * marg; _BH = H - 2 * marg;

    pxTraces = TRACE_DEFS.map(tr => {
      const pts = tr.pts.map(([rx, ry]) => ({ x: cpx(rx), y: cpy(ry) }));
      const segLens = [];
      let totalLen = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
        segLens.push(d);
        totalLen += d;
      }
      return { pts, t: tr.t, w: tr.w || 1, totalLen, segLens };
    });

    buildSignals();
  }

  function buildSignals() {
    signals = [];
    pxTraces.forEach((tr, i) => {
      if (tr.totalLen < 10) return;
      if (i % 3 === 2) return;
      signals.push({
        trIdx:    i,
        progress: (i * 0.37) % 1,
        speed:    0.00055 + (i % 7) * 0.00018,
        size:     2.2 + (i % 4) * 0.45,
      });
    });
  }

  function signalPos(sig) {
    const tr   = pxTraces[sig.trIdx];
    const dist = sig.progress * tr.totalLen;
    let rem    = dist;
    for (let i = 0; i < tr.segLens.length; i++) {
      if (rem <= tr.segLens[i]) {
        const t = tr.segLens[i] > 0 ? rem / tr.segLens[i] : 0;
        return {
          x: tr.pts[i].x + (tr.pts[i+1].x - tr.pts[i].x) * t,
          y: tr.pts[i].y + (tr.pts[i+1].y - tr.pts[i].y) * t,
        };
      }
      rem -= tr.segLens[i];
    }
    const last = tr.pts[tr.pts.length - 1];
    return { x: last.x, y: last.y };
  }

  // ── Path helper ───────────────────────────────────────────────────
  function rrPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);      ctx.arcTo(x+w, y,   x+w, y+r,   r);
    ctx.lineTo(x+w, y + h - r);    ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x + r, y + h);      ctx.arcTo(x,   y+h, x, y+h-r,   r);
    ctx.lineTo(x, y + r);          ctx.arcTo(x,   y,   x+r, y,      r);
    ctx.closePath();
  }

  function drawVia(cx, cy, rOuter, rInner) {
    ctx.beginPath(); ctx.arc(cx, cy, rOuter, 0, Math.PI*2);
    ctx.fillStyle = C.viaRing; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rInner, 0, Math.PI*2);
    ctx.fillStyle = C.viaHole; ctx.fill();
  }

  // ── Component renderers ───────────────────────────────────────────
  function drawQFP(c, cx, cy, cw, ch) {
    const pins = c.pins;
    const pinW = cps(0.008), pinL = cps(0.018);
    const hGap = cw / (pins + 1);
    const vGap = ch / (pins + 1);
    ctx.fillStyle = C.pad;
    for (let i = 0; i < pins; i++) {
      const ppx = cx - cw/2 + hGap * (i+1);
      rrPath(ppx - pinW/2, cy - ch/2 - pinL, pinW, pinL, 0.8); ctx.fill();
      rrPath(ppx - pinW/2, cy + ch/2,        pinW, pinL, 0.8); ctx.fill();
    }
    for (let i = 0; i < pins; i++) {
      const ppy = cy - ch/2 + vGap * (i+1);
      rrPath(cx - cw/2 - pinL, ppy - pinW/2, pinL, pinW, 0.8); ctx.fill();
      rrPath(cx + cw/2,        ppy - pinW/2, pinL, pinW, 0.8); ctx.fill();
    }
    rrPath(cx - cw/2, cy - ch/2, cw, ch, cps(0.008));
    ctx.fillStyle = C.body; ctx.fill();
    ctx.strokeStyle = C.bodyLine; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - cw/2 + cps(0.016), cy - ch/2 + cps(0.016), cps(0.007), 0, Math.PI*2);
    ctx.fillStyle = C.silk; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, cps(0.022), 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.font = `800 ${Math.max(8, cps(0.028))}px Inter,sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (c.lbl) ctx.fillText(c.lbl, cx, cy);
  }

  function drawSOP(c, cx, cy, cw, ch) {
    const pins = c.pins;
    const pinW = cps(0.007), pinL = cps(0.016);
    const vGap = ch / (pins + 1);
    ctx.fillStyle = C.pad;
    for (let i = 0; i < pins; i++) {
      const ppy = cy - ch/2 + vGap * (i+1);
      rrPath(cx - cw/2 - pinL, ppy - pinW/2, pinL, pinW, 0.8); ctx.fill();
      rrPath(cx + cw/2,        ppy - pinW/2, pinL, pinW, 0.8); ctx.fill();
    }
    rrPath(cx - cw/2, cy - ch/2, cw, ch, cps(0.006));
    ctx.fillStyle = C.body; ctx.fill();
    ctx.strokeStyle = C.bodyLine; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - cw/2 + cps(0.01), cy - ch/2 + cps(0.01), cps(0.006), 0, Math.PI*2);
    ctx.fillStyle = C.silk; ctx.fill();
    if (c.lbl) {
      ctx.font = `700 ${Math.max(7, cps(0.022))}px Inter,sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.40)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.lbl, cx, cy);
    }
  }

  function drawPassive(c, cx, cy, cw, ch) {
    const pw = cw * 0.33;
    ctx.fillStyle = C.pad;
    rrPath(cx - cw/2,       cy - ch/2, pw, ch, 0.8); ctx.fill();
    rrPath(cx + cw/2 - pw,  cy - ch/2, pw, ch, 0.8); ctx.fill();
    rrPath(cx - cw/2 + pw,  cy - ch/2, cw - 2*pw, ch, 0.8);
    ctx.fillStyle = '#1a1a2e'; ctx.fill();
    if (c.id) {
      ctx.font = `${Math.max(5, cps(0.013))}px Inter,sans-serif`;
      ctx.fillStyle = C.silkDim;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(c.id, cx, cy - ch/2 - 1);
    }
  }

  function drawConn(c, cx, cy, cw, ch) {
    rrPath(cx - cw/2, cy - ch/2, cw, ch, 2);
    ctx.fillStyle = '#0d1a28'; ctx.fill();
    ctx.strokeStyle = C.outline; ctx.lineWidth = 1; ctx.stroke();
    const gap = cw / (c.pins + 1);
    const ps2 = Math.min(gap * 0.65, ch * 0.55);
    for (let i = 0; i < c.pins; i++) {
      const ppx = cx - cw/2 + gap * (i+1);
      rrPath(ppx - ps2/2, cy - ps2/2, ps2, ps2, 1);
      ctx.fillStyle = C.pad; ctx.fill();
    }
    if (c.lbl) {
      ctx.font = `${Math.max(6, cps(0.015))}px Inter,sans-serif`;
      ctx.fillStyle = C.silk;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(c.lbl, cx, cy - ch/2 - 2);
    }
  }

  function drawXtal(c, cx, cy, cw, ch) {
    const pw = cw * 0.26;
    ctx.fillStyle = C.pad;
    rrPath(cx - cw/2,       cy - ch/2, pw, ch, 1); ctx.fill();
    rrPath(cx + cw/2 - pw,  cy - ch/2, pw, ch, 1); ctx.fill();
    rrPath(cx - cw/2 + pw,  cy - ch/2, cw - 2*pw, ch, ch/2);
    ctx.fillStyle = '#1c2235'; ctx.fill();
    ctx.strokeStyle = C.outline; ctx.lineWidth = 0.8; ctx.stroke();
    if (c.lbl) {
      ctx.font = `${Math.max(5, cps(0.013))}px Inter,sans-serif`;
      ctx.fillStyle = C.silkDim;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(c.id, cx, cy - ch/2 - 2);
    }
  }

  function drawThole(c, cx, cy, cw, ch) {
    const cols = c.px || 2, rows = c.py || 3;
    const gx = cw / cols, gy = ch / rows;
    const r  = Math.min(gx, gy) * 0.30;
    ctx.strokeStyle = C.silkDim; ctx.lineWidth = 0.7;
    ctx.strokeRect(cx - cw/2, cy - ch/2, cw, ch);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const hx = cx - cw/2 + gx * (col + 0.5);
        const hy = cy - ch/2 + gy * (row + 0.5);
        drawVia(hx, hy, r, r * 0.44);
      }
    }
    if (c.lbl) {
      ctx.font = `${Math.max(5, cps(0.013))}px Inter,sans-serif`;
      ctx.fillStyle = C.silkDim;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(c.lbl, cx, cy - ch/2 - 2);
    }
  }

  function drawLED(c, cx, cy, cw, ch, ts) {
    const pw = cw * 0.33;
    ctx.fillStyle = C.pad;
    rrPath(cx - cw/2,       cy - ch/2, pw, ch, 1); ctx.fill();
    rrPath(cx + cw/2 - pw,  cy - ch/2, pw, ch, 1); ctx.fill();
    rrPath(cx - cw/2 + pw,  cy - ch/2, cw - 2*pw, ch, 1);
    ctx.fillStyle = '#0c0e18'; ctx.fill();
    const phase = (ts / 900 + (c.rx || 0) * 5) % (Math.PI * 2);
    const alpha = 0.55 + 0.45 * Math.abs(Math.sin(phase));
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cw, ch) * 0.30, 0, Math.PI*2);
    ctx.fillStyle = c.col || '#5ef0d0';
    ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, cps(0.04));
    grd.addColorStop(0, (c.col || '#5ef0d0').replace(')', ',0.35)').replace('rgb', 'rgba'));
    grd.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(cx, cy, cps(0.04), 0, Math.PI*2);
    ctx.fillStyle = grd; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
  }

  function drawComponent(c, ts) {
    const cx = cpx(c.rx), cy = cpy(c.ry);
    const cw = cps(c.rw), ch = cps(c.rh);
    switch (c.type) {
      case 'qfp':     drawQFP(c, cx, cy, cw, ch); break;
      case 'sop':     drawSOP(c, cx, cy, cw, ch); break;
      case 'passive': drawPassive(c, cx, cy, cw, ch); break;
      case 'conn':    drawConn(c, cx, cy, cw, ch); break;
      case 'xtal':    drawXtal(c, cx, cy, cw, ch); break;
      case 'thole':   drawThole(c, cx, cy, cw, ch); break;
      case 'led':     drawLED(c, cx, cy, cw, ch, ts); break;
    }
    if (c.id && c.type !== 'passive') {
      ctx.font = `${Math.max(6, cps(0.015))}px Inter,sans-serif`;
      ctx.fillStyle = C.silk;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(c.id, cx, cy + cps(c.rh)/2 + cps(0.010));
    }
  }

  // ── Main draw call ────────────────────────────────────────────────
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = C.outerBg;
    ctx.fillRect(0, 0, W, H);

    rrPath(_BX, _BY, _BW, _BH, cps(0.016));
    ctx.fillStyle = C.substrate; ctx.fill();

    ctx.fillStyle = C.subTex;
    const dotStep = cps(0.030);
    for (let gx = _BX + dotStep; gx < _BX + _BW - 4; gx += dotStep) {
      for (let gy = _BY + dotStep; gy < _BY + _BH - 4; gy += dotStep) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.7, 0, Math.PI*2); ctx.fill();
      }
    }

    rrPath(_BX + cps(0.03), _BY + cps(0.03), _BW - cps(0.06), _BH - cps(0.06), cps(0.010));
    ctx.fillStyle = C.pourFill; ctx.fill();

    rrPath(_BX, _BY, _BW, _BH, cps(0.016));
    ctx.strokeStyle = C.outline; ctx.lineWidth = 2; ctx.stroke();

    const mhR = cps(0.022), mhOff = cps(0.045);
    const corners = [
      [_BX + mhOff, _BY + mhOff], [_BX + _BW - mhOff, _BY + mhOff],
      [_BX + mhOff, _BY + _BH - mhOff], [_BX + _BW - mhOff, _BY + _BH - mhOff],
    ];
    corners.forEach(([mx, my]) => {
      ctx.beginPath(); ctx.arc(mx, my, mhR, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(200,164,48,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, my, mhR * 0.55, 0, Math.PI*2);
      ctx.fillStyle = C.viaHole; ctx.fill();
    });

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    pxTraces.forEach(tr => {
      ctx.beginPath();
      ctx.moveTo(tr.pts[0].x, tr.pts[0].y);
      for (let i = 1; i < tr.pts.length; i++) ctx.lineTo(tr.pts[i].x, tr.pts[i].y);
      ctx.strokeStyle = tr.t === 'pow' ? C.trPow : tr.t === 'clk' ? C.trClk : C.trSig;
      ctx.lineWidth = cps(0.0032) * tr.w;
      ctx.stroke();
    });

    const vR = cps(0.013), vH = cps(0.006);
    VIA_DEFS.forEach(v => drawVia(cpx(v.rx), cpy(v.ry), vR, vH));

    COMP_DEFS.forEach(c => drawComponent(c, ts));

    signals.forEach(sig => {
      sig.progress += sig.speed;
      if (sig.progress > 1) sig.progress = 0;
      const pos  = signalPos(sig);
      const tr   = pxTraces[sig.trIdx];
      const dotC = tr.t === 'pow' ? C.dotPow : tr.t === 'clk' ? C.dotClk : C.dotSig;
      const glC  = tr.t === 'pow' ? C.glowPow : tr.t === 'clk' ? C.glowClk : C.glowSig;
      const s    = sig.size;
      const grd  = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, s * 5);
      grd.addColorStop(0, glC); grd.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(pos.x, pos.y, s * 5, 0, Math.PI*2);
      ctx.fillStyle = grd; ctx.fill();
      ctx.beginPath(); ctx.arc(pos.x, pos.y, s * 0.72, 0, Math.PI*2);
      ctx.fillStyle = dotC; ctx.fill();
    });

    ctx.font = `700 ${Math.max(7, cps(0.022))}px 'Courier New',monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('AES-MAIN-REV2.1', _BX + cps(0.04), _BY + _BH - cps(0.025));
    ctx.font = `${Math.max(5, cps(0.016))}px 'Courier New',monospace`;
    ctx.fillText('© ASTHA ELECTRONICS', _BX + cps(0.04), _BY + _BH - cps(0.025) - cps(0.030));
  }

  function loop(ts) { draw(ts); animId = requestAnimationFrame(loop); }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animId = requestAnimationFrame(loop);
  });

  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(animId);
    resize();
    animId = requestAnimationFrame(loop);
  });
  ro.observe(canvas.parentElement);

  resize();
  animId = requestAnimationFrame(loop);
}
