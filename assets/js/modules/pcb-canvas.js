/* ================================================================
   PCB CANVAS — 5 unique scenes, one per hero slide
   Scene 0 : General PCB board (overview)
   Scene 1 : Schematic capture & architecture
   Scene 2 : High-speed DDR layout with differential pairs
   Scene 3 : RF / antenna layout with radiating waves
   Scene 4 : Manufacturing Gerber layer-stack view
================================================================ */
export function initPCBCanvas() {
  const canvas = document.getElementById('pcb-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animId, W, H;
  let _BX, _BY, _BW, _BH;
  let currentScene = 0;

  /* ── coordinate helpers ─────────────────────────────────────── */
  const cpx = rx => _BX + rx * _BW;
  const cpy = ry => _BY + ry * _BH;
  const cps = r  => r  * Math.min(_BW, _BH);

  /* ── shared palette ─────────────────────────────────────────── */
  const C = {
    substrate: '#071910', outerBg: '#020b08', outline: '#c8a430',
    pad: '#d4b03e', viaRing: '#c8a430', viaHole: '#010a10',
    silk: 'rgba(255,255,255,0.68)', silkDim: 'rgba(255,255,255,0.22)',
    body: '#0d1e34', bodyLine: 'rgba(255,255,255,0.10)',
    trSig: 'rgba(94,240,208,0.70)', trPow: 'rgba(255,148,48,0.75)', trClk: 'rgba(170,120,255,0.68)',
    pourFill: 'rgba(94,240,208,0.045)',
    dotSig: '#5ef0d0', dotPow: '#ff9830', dotClk: '#aa80ff',
    glowSig: 'rgba(94,240,208,0.70)', glowPow: 'rgba(255,152,48,0.70)', glowClk: 'rgba(170,128,255,0.70)',
  };

  /* ── shared path helper ──────────────────────────────────────── */
  function rrPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);       ctx.arcTo(x+w, y,   x+w, y+r,   r);
    ctx.lineTo(x+w, y + h - r);     ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x + r, y + h);       ctx.arcTo(x,   y+h, x, y+h-r,   r);
    ctx.lineTo(x, y + r);           ctx.arcTo(x,   y,   x+r, y,      r);
    ctx.closePath();
  }

  function drawVia(cx, cy, rOut, rIn) {
    ctx.beginPath(); ctx.arc(cx, cy, rOut, 0, Math.PI*2);
    ctx.fillStyle = C.viaRing; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rIn, 0, Math.PI*2);
    ctx.fillStyle = C.viaHole; ctx.fill();
  }

  function drawFR4Board() {
    ctx.fillStyle = C.outerBg; ctx.fillRect(0, 0, W, H);
    rrPath(_BX, _BY, _BW, _BH, cps(0.016));
    ctx.fillStyle = C.substrate; ctx.fill();
    ctx.fillStyle = 'rgba(0,70,25,0.16)';
    const ds = cps(0.030);
    for (let gx = _BX + ds; gx < _BX + _BW - 4; gx += ds)
      for (let gy = _BY + ds; gy < _BY + _BH - 4; gy += ds) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.7, 0, Math.PI*2); ctx.fill();
      }
    rrPath(_BX + cps(0.03), _BY + cps(0.03), _BW - cps(0.06), _BH - cps(0.06), cps(0.010));
    ctx.fillStyle = C.pourFill; ctx.fill();
    rrPath(_BX, _BY, _BW, _BH, cps(0.016));
    ctx.strokeStyle = C.outline; ctx.lineWidth = 2; ctx.stroke();
    const mhR = cps(0.022), mhOff = cps(0.045);
    [[_BX+mhOff,_BY+mhOff],[_BX+_BW-mhOff,_BY+mhOff],
     [_BX+mhOff,_BY+_BH-mhOff],[_BX+_BW-mhOff,_BY+_BH-mhOff]].forEach(([mx,my]) => {
      ctx.beginPath(); ctx.arc(mx, my, mhR, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(200,164,48,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, my, mhR*0.55, 0, Math.PI*2);
      ctx.fillStyle = C.viaHole; ctx.fill();
    });
  }

  /* ================================================================
     SCENE 0 — General PCB Board (Overview)
  ================================================================ */
  const S0 = { traces: [], signals: [] };

  const S0_TRACE_DEFS = [
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

  const S0_VIA_DEFS = [
    {rx:0.39,ry:0.21},{rx:0.56,ry:0.60},{rx:0.70,ry:0.60},
    {rx:0.52,ry:0.60},{rx:0.38,ry:0.73},{rx:0.82,ry:0.55},
    {rx:0.13,ry:0.82},{rx:0.52,ry:0.67},{rx:0.80,ry:0.81},
    {rx:0.24,ry:0.46},{rx:0.84,ry:0.60},{rx:0.62,ry:0.80},
    {rx:0.78,ry:0.51},{rx:0.80,ry:0.47},
  ];

  const S0_COMP_DEFS = [
    { id:'U1', lbl:'MCU',  type:'qfp',  rx:0.405,ry:0.360,rw:0.210,rh:0.210,pins:12 },
    { id:'U2', lbl:'RF',   type:'sop',  rx:0.125,ry:0.435,rw:0.095,rh:0.075,pins:4 },
    { id:'U3', lbl:'PMIC', type:'sop',  rx:0.700,ry:0.700,rw:0.115,rh:0.075,pins:4 },
    { id:'J1', lbl:'USB',  type:'conn', rx:0.415,ry:0.090,rw:0.090,rh:0.055,pins:5 },
    { id:'J2', lbl:'VIN',  type:'conn', rx:0.840,ry:0.105,rw:0.060,rh:0.045,pins:2 },
    { id:'J3', lbl:'JTAG', type:'thole',rx:0.875,ry:0.600,rw:0.045,rh:0.115,px:2,py:3 },
    { id:'Y1', lbl:'8MHz', type:'xtal', rx:0.295,ry:0.735,rw:0.070,rh:0.038 },
    { type:'passive', id:'C1', rx:0.335,ry:0.260,rw:0.022,rh:0.013 },
    { type:'passive', id:'C2', rx:0.395,ry:0.260,rw:0.022,rh:0.013 },
    { type:'passive', id:'C3', rx:0.520,ry:0.260,rw:0.022,rh:0.013 },
    { type:'passive', id:'C4', rx:0.575,ry:0.260,rw:0.022,rh:0.013 },
    { type:'passive', id:'C5', rx:0.760,ry:0.820,rw:0.028,rh:0.016 },
    { type:'passive', id:'C6', rx:0.815,ry:0.820,rw:0.028,rh:0.016 },
    { type:'passive', id:'R1', rx:0.560,ry:0.800,rw:0.022,rh:0.013 },
    { type:'passive', id:'R2', rx:0.140,ry:0.620,rw:0.022,rh:0.013 },
    { type:'passive', id:'R3', rx:0.285,ry:0.820,rw:0.022,rh:0.013 },
    { type:'led', id:'LED1', rx:0.675,ry:0.850,rw:0.022,rh:0.018,col:'#5ef0d0' },
    { type:'led', id:'LED2', rx:0.745,ry:0.850,rw:0.022,rh:0.018,col:'#ff9830' },
    { type:'led', id:'LED3', rx:0.815,ry:0.905,rw:0.022,rh:0.018,col:'#aa80ff' },
  ];

  function buildS0() {
    S0.traces = S0_TRACE_DEFS.map(tr => {
      const pts = tr.pts.map(([rx,ry]) => ({ x:cpx(rx), y:cpy(ry) }));
      const segLens = []; let totalLen = 0;
      for (let i = 0; i < pts.length-1; i++) {
        const d = Math.hypot(pts[i+1].x-pts[i].x, pts[i+1].y-pts[i].y);
        segLens.push(d); totalLen += d;
      }
      return { pts, t:tr.t, w:tr.w||1, totalLen, segLens };
    });
    S0.signals = [];
    S0.traces.forEach((tr,i) => {
      if (tr.totalLen < 10 || i%3===2) return;
      S0.signals.push({ trIdx:i, progress:(i*0.37)%1, speed:0.00055+(i%7)*0.00018, size:2.2+(i%4)*0.45 });
    });
  }

  function s0SignalPos(sig) {
    const tr = S0.traces[sig.trIdx]; const dist = sig.progress*tr.totalLen;
    let rem = dist;
    for (let i = 0; i < tr.segLens.length; i++) {
      if (rem <= tr.segLens[i]) {
        const t = tr.segLens[i]>0 ? rem/tr.segLens[i] : 0;
        return { x:tr.pts[i].x+(tr.pts[i+1].x-tr.pts[i].x)*t, y:tr.pts[i].y+(tr.pts[i+1].y-tr.pts[i].y)*t };
      }
      rem -= tr.segLens[i];
    }
    return tr.pts[tr.pts.length-1];
  }

  function drawS0Comp(c, ts) {
    const cx=cpx(c.rx), cy=cpy(c.ry), cw=cps(c.rw), ch=cps(c.rh);
    const pinW=cps(0.008), pinL=cps(0.018), pinW2=cps(0.007), pinL2=cps(0.016);
    if (c.type==='qfp') {
      const pins=c.pins, hGap=cw/(pins+1), vGap=ch/(pins+1);
      ctx.fillStyle=C.pad;
      for (let i=0;i<pins;i++) { const ppx=cx-cw/2+hGap*(i+1); rrPath(ppx-pinW/2,cy-ch/2-pinL,pinW,pinL,0.8);ctx.fill(); rrPath(ppx-pinW/2,cy+ch/2,pinW,pinL,0.8);ctx.fill(); }
      for (let i=0;i<pins;i++) { const ppy=cy-ch/2+vGap*(i+1); rrPath(cx-cw/2-pinL,ppy-pinW/2,pinL,pinW,0.8);ctx.fill(); rrPath(cx+cw/2,ppy-pinW/2,pinL,pinW,0.8);ctx.fill(); }
      rrPath(cx-cw/2,cy-ch/2,cw,ch,cps(0.008)); ctx.fillStyle=C.body;ctx.fill(); ctx.strokeStyle=C.bodyLine;ctx.lineWidth=0.8;ctx.stroke();
      ctx.beginPath();ctx.arc(cx-cw/2+cps(0.016),cy-ch/2+cps(0.016),cps(0.007),0,Math.PI*2);ctx.fillStyle=C.silk;ctx.fill();
      ctx.font=`800 ${Math.max(8,cps(0.028))}px Inter,sans-serif`;ctx.fillStyle='rgba(255,255,255,0.40)';ctx.textAlign='center';ctx.textBaseline='middle';
      if(c.lbl) ctx.fillText(c.lbl,cx,cy);
    } else if (c.type==='sop') {
      const pins=c.pins, vGap=ch/(pins+1);
      ctx.fillStyle=C.pad;
      for (let i=0;i<pins;i++) { const ppy=cy-ch/2+vGap*(i+1); rrPath(cx-cw/2-pinL2,ppy-pinW2/2,pinL2,pinW2,0.8);ctx.fill(); rrPath(cx+cw/2,ppy-pinW2/2,pinL2,pinW2,0.8);ctx.fill(); }
      rrPath(cx-cw/2,cy-ch/2,cw,ch,cps(0.006)); ctx.fillStyle=C.body;ctx.fill();ctx.strokeStyle=C.bodyLine;ctx.lineWidth=0.8;ctx.stroke();
      ctx.beginPath();ctx.arc(cx-cw/2+cps(0.01),cy-ch/2+cps(0.01),cps(0.006),0,Math.PI*2);ctx.fillStyle=C.silk;ctx.fill();
      if(c.lbl){ctx.font=`700 ${Math.max(7,cps(0.022))}px Inter,sans-serif`;ctx.fillStyle='rgba(255,255,255,0.40)';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.lbl,cx,cy);}
    } else if (c.type==='passive') {
      const pw=cw*0.33; ctx.fillStyle=C.pad;
      rrPath(cx-cw/2,cy-ch/2,pw,ch,0.8);ctx.fill(); rrPath(cx+cw/2-pw,cy-ch/2,pw,ch,0.8);ctx.fill();
      rrPath(cx-cw/2+pw,cy-ch/2,cw-2*pw,ch,0.8); ctx.fillStyle='#1a1a2e';ctx.fill();
      if(c.id){ctx.font=`${Math.max(5,cps(0.013))}px Inter,sans-serif`;ctx.fillStyle=C.silkDim;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(c.id,cx,cy-ch/2-1);}
    } else if (c.type==='conn') {
      rrPath(cx-cw/2,cy-ch/2,cw,ch,2); ctx.fillStyle='#0d1a28';ctx.fill();ctx.strokeStyle=C.outline;ctx.lineWidth=1;ctx.stroke();
      const gap=cw/(c.pins+1),ps2=Math.min(gap*0.65,ch*0.55);
      for(let i=0;i<c.pins;i++){const ppx=cx-cw/2+gap*(i+1);rrPath(ppx-ps2/2,cy-ps2/2,ps2,ps2,1);ctx.fillStyle=C.pad;ctx.fill();}
      if(c.lbl){ctx.font=`${Math.max(6,cps(0.015))}px Inter,sans-serif`;ctx.fillStyle=C.silk;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(c.lbl,cx,cy-ch/2-2);}
    } else if (c.type==='xtal') {
      const pw=cw*0.26; ctx.fillStyle=C.pad;
      rrPath(cx-cw/2,cy-ch/2,pw,ch,1);ctx.fill(); rrPath(cx+cw/2-pw,cy-ch/2,pw,ch,1);ctx.fill();
      rrPath(cx-cw/2+pw,cy-ch/2,cw-2*pw,ch,ch/2); ctx.fillStyle='#1c2235';ctx.fill();ctx.strokeStyle=C.outline;ctx.lineWidth=0.8;ctx.stroke();
    } else if (c.type==='thole') {
      const cols=c.px||2,rows=c.py||3,gx=cw/cols,gy=ch/rows,r=Math.min(gx,gy)*0.30;
      ctx.strokeStyle=C.silkDim;ctx.lineWidth=0.7;ctx.strokeRect(cx-cw/2,cy-ch/2,cw,ch);
      for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) drawVia(cx-cw/2+gx*(col+0.5),cy-ch/2+gy*(row+0.5),r,r*0.44);
      if(c.lbl){ctx.font=`${Math.max(5,cps(0.013))}px Inter,sans-serif`;ctx.fillStyle=C.silkDim;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(c.lbl,cx,cy-ch/2-2);}
    } else if (c.type==='led') {
      const pw=cw*0.33; ctx.fillStyle=C.pad;
      rrPath(cx-cw/2,cy-ch/2,pw,ch,1);ctx.fill(); rrPath(cx+cw/2-pw,cy-ch/2,pw,ch,1);ctx.fill();
      rrPath(cx-cw/2+pw,cy-ch/2,cw-2*pw,ch,1); ctx.fillStyle='#0c0e18';ctx.fill();
      const phase=(ts/900+(c.rx||0)*5)%(Math.PI*2), alpha=0.55+0.45*Math.abs(Math.sin(phase));
      ctx.beginPath();ctx.arc(cx,cy,Math.min(cw,ch)*0.30,0,Math.PI*2);ctx.fillStyle=c.col||'#5ef0d0';ctx.globalAlpha=alpha;ctx.fill();ctx.globalAlpha=1;
      const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,cps(0.04));
      grd.addColorStop(0,(c.col||'#5ef0d0').replace(')',',.35)').replace('rgb','rgba'));grd.addColorStop(1,'transparent');
      ctx.beginPath();ctx.arc(cx,cy,cps(0.04),0,Math.PI*2);ctx.fillStyle=grd;ctx.globalAlpha=alpha;ctx.fill();ctx.globalAlpha=1;
    }
    if(c.id && c.type!=='passive'){ctx.font=`${Math.max(6,cps(0.015))}px Inter,sans-serif`;ctx.fillStyle=C.silk;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(c.id,cpx(c.rx),cpy(c.ry)+cps(c.rh)/2+cps(0.010));}
  }

  function drawScene0(ts) {
    drawFR4Board();
    ctx.lineCap='round'; ctx.lineJoin='round';
    S0.traces.forEach(tr => {
      ctx.beginPath(); ctx.moveTo(tr.pts[0].x,tr.pts[0].y);
      for(let i=1;i<tr.pts.length;i++) ctx.lineTo(tr.pts[i].x,tr.pts[i].y);
      ctx.strokeStyle=tr.t==='pow'?C.trPow:tr.t==='clk'?C.trClk:C.trSig;
      ctx.lineWidth=cps(0.0032)*tr.w; ctx.stroke();
    });
    const vR=cps(0.013),vH=cps(0.006);
    S0_VIA_DEFS.forEach(v => drawVia(cpx(v.rx),cpy(v.ry),vR,vH));
    S0_COMP_DEFS.forEach(c => drawS0Comp(c,ts));
    S0.signals.forEach(sig => {
      sig.progress+=sig.speed; if(sig.progress>1)sig.progress=0;
      const pos=s0SignalPos(sig), tr=S0.traces[sig.trIdx];
      const dotC=tr.t==='pow'?C.dotPow:tr.t==='clk'?C.dotClk:C.dotSig;
      const glC=tr.t==='pow'?C.glowPow:tr.t==='clk'?C.glowClk:C.glowSig;
      const s=sig.size, grd=ctx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,s*5);
      grd.addColorStop(0,glC);grd.addColorStop(1,'transparent');
      ctx.beginPath();ctx.arc(pos.x,pos.y,s*5,0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
      ctx.beginPath();ctx.arc(pos.x,pos.y,s*0.72,0,Math.PI*2);ctx.fillStyle=dotC;ctx.fill();
    });
    ctx.font=`700 ${Math.max(7,cps(0.022))}px 'Courier New',monospace`;ctx.fillStyle='rgba(255,255,255,0.16)';
    ctx.textAlign='left';ctx.textBaseline='bottom';
    ctx.fillText('AES-MAIN-REV2.1',_BX+cps(0.04),_BY+_BH-cps(0.025));
    ctx.font=`${Math.max(5,cps(0.016))}px 'Courier New',monospace`;
    ctx.fillText('© ASTHA ELECTRONICS',_BX+cps(0.04),_BY+_BH-cps(0.025)-cps(0.030));
  }

  /* ================================================================
     SCENE 1 — Schematic Capture (clean circuit schematic)
  ================================================================ */
  const S1 = { signals: [] };

  // Wire definitions [polyline pts in board-normalized coords, type, optional label]
  const S1_WIRES = [
    { pts:[[0.06,0.22],[0.92,0.22]], t:'pow', lbl:'VCC' },                  // VCC rail
    { pts:[[0.06,0.82],[0.92,0.82]], t:'gnd' },                              // GND rail
    { pts:[[0.06,0.22],[0.06,0.48]], t:'pow' },                              // VIN left leg down
    { pts:[[0.06,0.56],[0.06,0.82]], t:'gnd' },                              // J1 GND leg
    { pts:[[0.20,0.22],[0.20,0.38]], t:'pow' },                              // LDO VIN leg
    { pts:[[0.20,0.52],[0.20,0.82]], t:'gnd' },                              // LDO GND
    { pts:[[0.20,0.45],[0.26,0.45],[0.26,0.22]], t:'pow' },                  // LDO VOUT to VCC rail
    { pts:[[0.34,0.22],[0.34,0.82]], t:'gnd', lbl:'' },                      // C1 dropper
    { pts:[[0.44,0.22],[0.44,0.82]], t:'gnd' },                              // C2 dropper
    { pts:[[0.52,0.22],[0.52,0.34]], t:'pow' },                              // MCU VCC drop
    { pts:[[0.62,0.46],[0.74,0.46]], t:'sig', lbl:'SDA' },                   // MCU→Sensor SDA
    { pts:[[0.62,0.53],[0.74,0.53]], t:'clk', lbl:'SCL' },                   // MCU→Sensor SCL
    { pts:[[0.62,0.60],[0.68,0.60],[0.68,0.70]], t:'sig', lbl:'GPIO' },      // GPIO down to R1
    { pts:[[0.74,0.70],[0.82,0.70]], t:'sig' },                              // R1 to LED
    { pts:[[0.89,0.70],[0.89,0.82]], t:'gnd' },                              // LED GND leg
    { pts:[[0.52,0.68],[0.52,0.82]], t:'gnd' },                              // MCU GND
    { pts:[[0.82,0.60],[0.82,0.82]], t:'gnd' },                              // U3 GND
    { pts:[[0.82,0.22],[0.82,0.36]], t:'pow' },                              // U3 VCC drop
  ];

  const S1_JUNCTIONS = [
    {rx:0.26,ry:0.22},{rx:0.34,ry:0.22},{rx:0.44,ry:0.22},{rx:0.52,ry:0.22},{rx:0.82,ry:0.22},
  ];

  const S1_COMPS = [
    { lbl:'J1\nVIN', type:'conn', rx:0.06,ry:0.52,rw:0.06,rh:0.08 },
    { lbl:'U1\nLDO', type:'ic',  rx:0.20,ry:0.45,rw:0.10,rh:0.14 },
    { lbl:'C1',       type:'cap', rx:0.34,ry:0.52,rw:0.04,rh:0.06 },
    { lbl:'C2',       type:'cap', rx:0.44,ry:0.52,rw:0.04,rh:0.06 },
    { lbl:'U2\nMCU',  type:'ic',  rx:0.52,ry:0.51,rw:0.16,rh:0.30 },
    { lbl:'C3',       type:'cap', rx:0.52,ry:0.75,rw:0.04,rh:0.06 },
    { lbl:'U3\nSENS', type:'ic',  rx:0.82,ry:0.48,rw:0.12,rh:0.24 },
    { lbl:'R1',       type:'res', rx:0.71,ry:0.70,rw:0.06,rh:0.04 },
    { lbl:'LED1',     type:'led', rx:0.86,ry:0.70,rw:0.05,rh:0.04 },
  ];

  // Signal animation seeds for schematic
  function buildS1Signals() {
    S1.signals = S1_WIRES.map((w, i) => ({
      wireIdx: i,
      progress: (i * 0.31) % 1,
      speed: 0.0035 + (i % 5) * 0.0012,
    }));
  }

  function schWireColor(t) {
    if (t === 'pow') return 'rgba(255,148,48,0.80)';
    if (t === 'gnd') return 'rgba(140,160,200,0.55)';
    if (t === 'clk') return 'rgba(170,120,255,0.80)';
    return 'rgba(94,240,208,0.80)';
  }

  function drawSchCompSymbol(c) {
    const cx=cpx(c.rx), cy=cpy(c.ry), cw=cps(c.rw), ch=cps(c.rh);
    ctx.lineCap='round'; ctx.lineJoin='round';

    if (c.type==='ic') {
      ctx.strokeStyle='rgba(94,240,208,0.55)'; ctx.lineWidth=1.2;
      ctx.strokeRect(cx-cw/2,cy-ch/2,cw,ch);
      ctx.font=`bold ${Math.max(7,cps(0.024))}px 'Courier New',monospace`;
      ctx.fillStyle='rgba(94,240,208,0.75)'; ctx.textAlign='center'; ctx.textBaseline='middle';
      c.lbl.split('\n').forEach((ln,i,arr) => {
        ctx.fillText(ln, cx, cy + (i - (arr.length-1)/2) * cps(0.038));
      });
    } else if (c.type==='cap') {
      // Capacitor symbol: two parallel horizontal lines
      const hw=cw*0.8, lh=cps(0.008);
      ctx.strokeStyle='rgba(94,240,208,0.6)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(cx-hw,cy-lh*2); ctx.lineTo(cx+hw,cy-lh*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-hw,cy+lh*2); ctx.lineTo(cx+hw,cy+lh*2); ctx.stroke();
      ctx.font=`${Math.max(6,cps(0.018))}px 'Courier New',monospace`;
      ctx.fillStyle='rgba(200,220,255,0.55)'; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(c.lbl, cx, cy+cps(0.025));
    } else if (c.type==='res') {
      // Resistor symbol: zigzag
      const hw=cw*0.9, step=hw/6, amp=cps(0.012);
      ctx.strokeStyle='rgba(255,192,94,0.80)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(cx-hw,cy);
      for (let i=0;i<=6;i++) ctx.lineTo(cx-hw+step*i, cy+(i%2===0?-amp:amp));
      ctx.lineTo(cx+hw,cy); ctx.stroke();
      ctx.font=`${Math.max(6,cps(0.018))}px 'Courier New',monospace`;
      ctx.fillStyle='rgba(200,220,255,0.55)'; ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(c.lbl, cx, cy-cps(0.020));
    } else if (c.type==='led') {
      // LED: triangle + bar
      const s=cw*0.5;
      ctx.strokeStyle='rgba(94,240,208,0.85)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(cx-s,cy-s*0.75); ctx.lineTo(cx-s,cy+s*0.75); ctx.lineTo(cx+s*0.4,cy); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+s*0.4,cy-s*0.75); ctx.lineTo(cx+s*0.4,cy+s*0.75); ctx.stroke();
      // Ray lines
      ctx.strokeStyle='rgba(94,240,208,0.45)'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(cx,cy-s); ctx.lineTo(cx+s*0.55,cy-s*1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+s*0.2,cy-s*0.4); ctx.lineTo(cx+s*0.75,cy-s*0.9); ctx.stroke();
    } else if (c.type==='conn') {
      ctx.strokeStyle='rgba(200,164,48,0.7)'; ctx.lineWidth=1.2;
      ctx.strokeRect(cx-cw/2, cy-ch/2, cw, ch);
      // Pin holes
      const pinH=Math.min(ch*0.25, cps(0.012));
      for (let i=0;i<2;i++) { const phy=cy-ch/4+i*ch/2; ctx.beginPath();ctx.arc(cx,phy,pinH,0,Math.PI*2);ctx.strokeStyle='rgba(200,164,48,0.55)';ctx.stroke(); }
      ctx.font=`${Math.max(6,cps(0.018))}px 'Courier New',monospace`;
      ctx.fillStyle='rgba(200,164,48,0.75)'; ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText('J1', cx, cy-ch/2-2);
    }
  }

  function drawVCCSymbol(x, y) {
    // Upward arrow/triangle VCC symbol
    ctx.strokeStyle='rgba(255,148,48,0.7)'; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(x, y-cps(0.015)); ctx.lineTo(x-cps(0.015),y); ctx.lineTo(x+cps(0.015),y); ctx.closePath(); ctx.stroke();
    ctx.font=`${Math.max(6,cps(0.018))}px 'Courier New',monospace`;
    ctx.fillStyle='rgba(255,148,48,0.7)'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('VCC',x,y-cps(0.018));
  }

  function drawGNDSymbol(x, y) {
    const w=cps(0.022);
    ctx.strokeStyle='rgba(140,160,200,0.6)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x-w,y);     ctx.lineTo(x+w,y);     ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-w*0.65,y+cps(0.008)); ctx.lineTo(x+w*0.65,y+cps(0.008)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-w*0.30,y+cps(0.016)); ctx.lineTo(x+w*0.30,y+cps(0.016)); ctx.stroke();
  }

  function drawScene1(ts) {
    // Schematic background
    ctx.fillStyle='#030b10'; ctx.fillRect(0,0,W,H);
    // Faint dot grid
    ctx.fillStyle='rgba(94,240,208,0.05)';
    const gs=Math.min(_BW,_BH)/14;
    for (let gx=_BX; gx<=_BX+_BW; gx+=gs)
      for (let gy=_BY; gy<=_BY+_BH; gy+=gs) { ctx.beginPath();ctx.arc(gx,gy,0.8,0,Math.PI*2);ctx.fill(); }
    // Border
    ctx.strokeStyle='rgba(94,240,208,0.08)'; ctx.lineWidth=1; ctx.strokeRect(_BX,_BY,_BW,_BH);
    // Wires
    ctx.lineCap='round'; ctx.lineJoin='round';
    S1_WIRES.forEach(w => {
      const pts=w.pts.map(([rx,ry])=>({x:cpx(rx),y:cpy(ry)}));
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
      for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
      ctx.strokeStyle=schWireColor(w.t); ctx.lineWidth=1.4; ctx.stroke();
      // Net label
      if (w.lbl) {
        const mid=Math.floor(pts.length/2);
        ctx.font=`${Math.max(7,cps(0.020))}px 'Courier New',monospace`;
        ctx.fillStyle='rgba(200,220,255,0.50)'; ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillText(w.lbl, (pts[mid-1].x+pts[mid].x)/2, Math.min(pts[mid-1].y,pts[mid].y)-2);
      }
    });
    // Junction dots
    S1_JUNCTIONS.forEach(j => {
      ctx.beginPath(); ctx.arc(cpx(j.rx),cpy(j.ry),cps(0.010),0,Math.PI*2);
      ctx.fillStyle='rgba(255,192,94,0.90)'; ctx.fill();
    });
    // Power/GND symbols
    [[0.06,0.22],[0.26,0.22],[0.52,0.22],[0.82,0.22]].forEach(([rx,ry]) => drawVCCSymbol(cpx(rx),cpy(ry)-cps(0.015)));
    [[0.06,0.82],[0.20,0.82],[0.34,0.82],[0.44,0.82],[0.52,0.82],[0.82,0.82],[0.89,0.82]].forEach(([rx,ry]) => drawGNDSymbol(cpx(rx),cpy(ry)));
    // Components
    S1_COMPS.forEach(c => drawSchCompSymbol(c));
    // Signal flow dots on wires
    S1.signals.forEach(sig => {
      const w=S1_WIRES[sig.wireIdx];
      if (!w) return;
      sig.progress+=sig.speed; if(sig.progress>1)sig.progress=0;
      const pts=w.pts.map(([rx,ry])=>({x:cpx(rx),y:cpy(ry)}));
      let totalLen=0;
      const segs=[]; for(let i=0;i<pts.length-1;i++){const d=Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y);segs.push(d);totalLen+=d;}
      let dist=sig.progress*totalLen, rem=dist, px2=pts[0].x, py2=pts[0].y;
      for(let i=0;i<segs.length;i++){if(rem<=segs[i]){const t=segs[i]>0?rem/segs[i]:0;px2=pts[i].x+(pts[i+1].x-pts[i].x)*t;py2=pts[i].y+(pts[i+1].y-pts[i].y)*t;break;}rem-=segs[i];}
      const col=schWireColor(w.t);
      const grd=ctx.createRadialGradient(px2,py2,0,px2,py2,cps(0.018));
      grd.addColorStop(0,col.replace('0.80','0.6').replace('0.55','0.4'));grd.addColorStop(1,'transparent');
      ctx.beginPath();ctx.arc(px2,py2,cps(0.018),0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
      ctx.beginPath();ctx.arc(px2,py2,cps(0.006),0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    });
    // Title
    ctx.font=`700 ${Math.max(7,cps(0.022))}px 'Courier New',monospace`;ctx.fillStyle='rgba(255,255,255,0.14)';
    ctx.textAlign='right';ctx.textBaseline='bottom';
    ctx.fillText('SCHEMATIC REV1.0',_BX+_BW-cps(0.04),_BY+_BH-cps(0.025));
  }

  /* ================================================================
     SCENE 2 — High-Speed DDR Layout
  ================================================================ */
  const S2 = { signals: [] };

  const S2_DIFF_PAIRS = [
    { y1:0.30, y2:0.33, lbl:'D0' },  { y1:0.37, y2:0.40, lbl:'D1' },
    { y1:0.44, y2:0.47, lbl:'D2' },  { y1:0.51, y2:0.54, lbl:'D3' },
    { y1:0.58, y2:0.61, lbl:'CLK' }, { y1:0.65, y2:0.68, lbl:'D4' },
  ];

  function buildS2Signals() {
    S2.signals = [];
    S2_DIFF_PAIRS.forEach((pair, i) => {
      S2.signals.push({ pairIdx:i, pos: (i*0.18)%1, speed:0.0022+i*0.0005, trail:[] });
    });
  }

  function drawScene2(ts) {
    drawFR4Board();
    ctx.lineCap='round'; ctx.lineJoin='round';

    // Centre BGA chip
    const bgaCx=cpx(0.33), bgaCy=cpy(0.50);
    const bgaW=cps(0.24), bgaH=cps(0.42);
    rrPath(bgaCx-bgaW/2,bgaCy-bgaH/2,bgaW,bgaH,cps(0.010));
    ctx.fillStyle='#0a1828'; ctx.fill(); ctx.strokeStyle='rgba(94,240,208,0.35)';ctx.lineWidth=1.2;ctx.stroke();
    // BGA ball grid
    const ballCols=8, ballRows=9, ballGX=bgaW/(ballCols+1), ballGY=bgaH/(ballRows+1);
    for (let r=0;r<ballRows;r++) for(let c=0;c<ballCols;c++) {
      const bx=bgaCx-bgaW/2+ballGX*(c+1), by=bgaCy-bgaH/2+ballGY*(r+1);
      ctx.beginPath();ctx.arc(bx,by,cps(0.007),0,Math.PI*2);ctx.fillStyle=C.pad;ctx.fill();
    }
    ctx.font=`800 ${Math.max(8,cps(0.032))}px Inter,sans-serif`;ctx.fillStyle='rgba(94,240,208,0.35)';
    ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('SoC',bgaCx,bgaCy-cps(0.010));
    ctx.font=`${Math.max(6,cps(0.018))}px Inter,sans-serif`;ctx.fillStyle='rgba(255,255,255,0.20)';
    ctx.fillText('BGA-316',bgaCx,bgaCy+cps(0.016));

    // DDR5 chip right side
    const ddrCx=cpx(0.82), ddrCy=cpy(0.50);
    const ddrW=cps(0.14), ddrH=cps(0.38);
    rrPath(ddrCx-ddrW/2,ddrCy-ddrH/2,ddrW,ddrH,cps(0.008));
    ctx.fillStyle='#0d1c30'; ctx.fill(); ctx.strokeStyle='rgba(255,148,48,0.40)';ctx.lineWidth=1;ctx.stroke();
    ctx.font=`700 ${Math.max(7,cps(0.022))}px Inter,sans-serif`;ctx.fillStyle='rgba(255,148,48,0.55)';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('DDR5',ddrCx,ddrCy-cps(0.015));
    ctx.font=`${Math.max(6,cps(0.016))}px Inter,sans-serif`;ctx.fillStyle='rgba(255,255,255,0.22)';ctx.fillText('SDRAM',ddrCx,ddrCy+cps(0.012));

    // Termination resistor array (small passives left of DDR)
    const rArrX=cpx(0.64), rArrY=cpy(0.50);
    for (let i=0;i<6;i++) {
      const ry=rArrY-cps(0.28)+i*cps(0.085);
      rrPath(rArrX-cps(0.025),ry-cps(0.010),cps(0.050),cps(0.020),1);
      ctx.fillStyle=C.pad;ctx.fill();
      rrPath(rArrX-cps(0.015),ry-cps(0.010),cps(0.030),cps(0.020),1);
      ctx.fillStyle='#1a1a2e';ctx.fill();
    }

    // Diff pairs — trace routes from BGA right edge to DDR left edge
    S2_DIFF_PAIRS.forEach((pair, pi) => {
      const startX=bgaCx+bgaW/2+2, endX=ddrCx-ddrW/2-2;
      const y1=cpy(pair.y1), y2=cpy(pair.y2);
      // Serpentine meander in the middle for length matching
      const midX=(startX+endX)*0.5, segW=cps(0.025), segH=cps(0.012);
      const COLORS=['rgba(94,240,208,0.70)','rgba(94,240,208,0.60)'];
      [y1,y2].forEach((yy, li) => {
        ctx.beginPath();
        ctx.moveTo(startX,yy);
        ctx.lineTo(midX-segW*2,yy);
        // Serpentine: 3 back-and-forth teeth
        let cx2=midX-segW*2, dir=li===0?1:-1;
        for(let k=0;k<3;k++){ctx.lineTo(cx2,yy+dir*segH);ctx.lineTo(cx2+segW,yy+dir*segH);ctx.lineTo(cx2+segW,yy);cx2+=segW;}
        ctx.lineTo(endX,yy);
        ctx.strokeStyle=COLORS[li]; ctx.lineWidth=cps(li===0?0.0040:0.0032); ctx.stroke();
      });
      // Diff pair label
      ctx.font=`${Math.max(6,cps(0.018))}px 'Courier New',monospace`;ctx.fillStyle='rgba(94,240,208,0.40)';
      ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(pair.lbl,startX+cps(0.02),(y1+y2)/2);
    });

    // Fan-out: fine traces from BGA left edge going left
    const fanTraces=8;
    for(let i=0;i<fanTraces;i++){
      const fy=bgaCy-bgaH*0.4+i*(bgaH*0.8/(fanTraces-1));
      const endX=_BX+cps(0.04)+i*cps(0.012);
      ctx.beginPath();ctx.moveTo(bgaCx-bgaW/2-2,fy);ctx.lineTo(endX+cps(0.04),fy);ctx.lineTo(endX,fy-cps(0.030));
      ctx.strokeStyle=`rgba(94,240,208,${0.15+i*0.02})`; ctx.lineWidth=0.8; ctx.stroke();
      drawVia(endX,fy-cps(0.030),cps(0.009),cps(0.004));
    }

    // Signals (two dots per diff pair, matching direction)
    S2.signals.forEach(sig => {
      sig.pos+=sig.speed; if(sig.pos>1) sig.pos=0;
      const pair=S2_DIFF_PAIRS[sig.pairIdx];
      const startX=cpx(0.33)+cps(0.12)+2, endX=cpx(0.75);
      const x=startX+sig.pos*(endX-startX);
      const y1=cpy(pair.y1), y2=cpy(pair.y2);
      [y1,y2].forEach((yy,li) => {
        const col=li===0?'#5ef0d0':'rgba(94,240,208,0.7)';
        const grd=ctx.createRadialGradient(x,yy,0,x,yy,cps(0.022));
        grd.addColorStop(0,`rgba(94,240,208,0.55)`);grd.addColorStop(1,'transparent');
        ctx.beginPath();ctx.arc(x,yy,cps(0.022),0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
        ctx.beginPath();ctx.arc(x,yy,cps(0.007)*0.8,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      });
    });

    // Legend
    ctx.font=`700 ${Math.max(7,cps(0.020))}px 'Courier New',monospace`;ctx.fillStyle='rgba(255,255,255,0.14)';
    ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText('AES-DDR5-REV1.2',_BX+cps(0.04),_BY+_BH-cps(0.025));
  }

  /* ================================================================
     SCENE 3 — RF & Antenna Layout
  ================================================================ */
  const S3 = { signals: [], waves: [] };

  const ANT_TIP = { rx:0.86, ry:0.28 }; // antenna tip position

  function buildS3Signals() {
    S3.signals = [{ pos:0, speed:0.0028 }];
    S3.waves = [];
  }

  function drawScene3(ts) {
    drawFR4Board();

    // Ground pour (teal fill, entire board)
    rrPath(_BX+cps(0.03),_BY+cps(0.03),_BW-cps(0.06),_BH-cps(0.06),cps(0.010));
    ctx.fillStyle='rgba(94,240,208,0.055)'; ctx.fill();

    // RF void (no ground pour) — top-right area around antenna
    const voidX=cpx(0.60), voidY=_BY+cps(0.03), voidW=cpx(0.98)-voidX, voidH=cpy(0.55)-_BY;
    ctx.clearRect(voidX,voidY,voidW,voidH);
    // Re-draw substrate in void area (no pour)
    ctx.save(); ctx.beginPath(); ctx.rect(voidX,voidY,voidW,voidH); ctx.clip();
    ctx.fillStyle=C.substrate; ctx.fillRect(_BX,_BY,_BW,_BH);
    ctx.fillStyle='rgba(0,70,25,0.16)';
    const ds=cps(0.030);
    for(let gx=_BX+ds;gx<_BX+_BW;gx+=ds) for(let gy=_BY+ds;gy<_BY+_BH;gy+=ds){ctx.beginPath();ctx.arc(gx,gy,0.7,0,Math.PI*2);ctx.fill();}
    ctx.restore();

    // Void boundary
    ctx.strokeStyle='rgba(94,240,208,0.25)'; ctx.lineWidth=1; ctx.setLineDash([4,3]);
    ctx.strokeRect(voidX,voidY,voidW,voidH); ctx.setLineDash([]);

    ctx.lineCap='round'; ctx.lineJoin='round';

    // RF transceiver IC (left)
    const rfCx=cpx(0.16), rfCy=cpy(0.50);
    const rfW=cps(0.12), rfH=cps(0.20);
    rrPath(rfCx-rfW/2,rfCy-rfH/2,rfW,rfH,cps(0.006));
    ctx.fillStyle='#0d1e34';ctx.fill();ctx.strokeStyle='rgba(94,240,208,0.45)';ctx.lineWidth=1.2;ctx.stroke();
    ctx.font=`700 ${Math.max(7,cps(0.022))}px Inter,sans-serif`;ctx.fillStyle='rgba(94,240,208,0.65)';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('RF IC',rfCx,rfCy);

    // Coplanar waveguide (CPW): center conductor + ground fences
    const cpwStart=rfCx+rfW/2, cpwEnd=cpx(0.62), cpwY=cpy(0.50);
    const cpwGap=cps(0.012), cpwW=cps(0.018);
    // Ground fences (thick amber lines parallel to CPW)
    ctx.strokeStyle='rgba(255,148,48,0.55)'; ctx.lineWidth=cps(0.010);
    ctx.beginPath();ctx.moveTo(cpwStart,cpwY-cpwW-cpwGap*2);ctx.lineTo(cpwEnd,cpwY-cpwW-cpwGap*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cpwStart,cpwY+cpwW+cpwGap*2);ctx.lineTo(cpwEnd,cpwY+cpwW+cpwGap*2);ctx.stroke();
    // Slot clearances
    ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=cpwGap;
    ctx.beginPath();ctx.moveTo(cpwStart,cpwY-cpwW-cpwGap);ctx.lineTo(cpwEnd,cpwY-cpwW-cpwGap);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cpwStart,cpwY+cpwW+cpwGap);ctx.lineTo(cpwEnd,cpwY+cpwW+cpwGap);ctx.stroke();
    // Center conductor
    ctx.strokeStyle='rgba(94,240,208,0.90)'; ctx.lineWidth=cpwW;
    ctx.beginPath();ctx.moveTo(cpwStart,cpwY);ctx.lineTo(cpwEnd,cpwY);ctx.stroke();

    // Pi matching network (inductor + two caps)
    const matchX=cpx(0.62), matchY=cpy(0.50);
    // Inductor: series bumps
    const indY=matchY-cps(0.055), indX1=matchX, indX2=cpx(0.75);
    ctx.strokeStyle='rgba(94,240,208,0.80)'; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.moveTo(cpwEnd,cpwY); ctx.lineTo(cpwEnd,indY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(indX1,indY);
    for(let k=0;k<6;k++){ const mx=indX1+(indX2-indX1)*k/6+((indX2-indX1)/12); ctx.arcTo(mx,(k%2===0?indY-cps(0.018):indY+cps(0.005)),indX1+(indX2-indX1)*(k+1)/6,indY,cps(0.012)); }
    ctx.lineTo(indX2,indY); ctx.stroke();
    ctx.beginPath();ctx.moveTo(indX2,indY);ctx.lineTo(indX2,cpwY);ctx.stroke();
    // Shunt caps to GND
    [[matchX,0.65],[indX2,0.65]].forEach(([px,pgy]) => {
      const capY=cpy(pgy);
      ctx.strokeStyle='rgba(94,240,208,0.70)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(px,matchY);ctx.lineTo(px,capY-cps(0.015));ctx.stroke();
      ctx.beginPath();ctx.moveTo(px-cps(0.018),capY-cps(0.015));ctx.lineTo(px+cps(0.018),capY-cps(0.015));ctx.stroke();
      ctx.beginPath();ctx.moveTo(px-cps(0.018),capY);ctx.lineTo(px+cps(0.018),capY);ctx.stroke();
      ctx.beginPath();ctx.moveTo(px,capY);ctx.lineTo(px,cpy(0.82));ctx.stroke();
      drawGNDSymbol(px,cpy(0.82));
    });

    // IFA antenna (Inverted-F shape)
    const antFeedX=cpx(0.75), antBaseY=cpy(0.50), antTopY=cpy(0.15);
    const antEndX=cpx(0.92), shortX=cpx(0.85);
    ctx.strokeStyle='rgba(255,148,48,0.90)'; ctx.lineWidth=cps(0.010);
    ctx.beginPath();
    ctx.moveTo(antFeedX, antBaseY);      // feed point
    ctx.lineTo(antFeedX, antTopY);       // vertical element
    ctx.lineTo(antEndX,  antTopY);       // horizontal radiating element
    ctx.stroke();
    // Short circuit stub
    ctx.beginPath();ctx.moveTo(shortX,antTopY);ctx.lineTo(shortX,antBaseY);ctx.stroke();
    // Ground line
    ctx.strokeStyle='rgba(255,148,48,0.45)'; ctx.lineWidth=cps(0.008);
    ctx.beginPath();ctx.moveTo(antFeedX,antBaseY);ctx.lineTo(antEndX,antBaseY);ctx.stroke();
    // Antenna label
    ctx.font=`${Math.max(7,cps(0.020))}px 'Courier New',monospace`;ctx.fillStyle='rgba(255,148,48,0.65)';
    ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText('IFA ANT',cpx(0.76),antTopY-cps(0.010));

    // Expanding RF wave animation from antenna tip
    const tipX=cpx(ANT_TIP.rx), tipY=cpy(ANT_TIP.ry);
    // Spawn new waves every ~40 frames
    if (Math.floor(ts/40)%40===0 && S3.waves.length<6) S3.waves.push({r:1,alpha:0.5,born:ts});
    S3.waves = S3.waves.filter(w => w.alpha>0.01);
    S3.waves.forEach(w => {
      w.r += 1.4; w.alpha *= 0.970;
      ctx.beginPath();ctx.arc(tipX,tipY,w.r,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,148,48,${w.alpha})`;ctx.lineWidth=1;ctx.stroke();
    });
    // Continuous wave spawner
    if (ts%2400 < 40) S3.waves.push({r:1,alpha:0.55,born:ts});

    // Signal dot on CPW
    S3.signals.forEach(sig => {
      sig.pos+=sig.speed; if(sig.pos>1.4) sig.pos=0;
      if (sig.pos<=1) {
        const x=cpwStart+(cpwEnd-cpwStart)*Math.min(sig.pos,1);
        const grd=ctx.createRadialGradient(x,cpwY,0,x,cpwY,cps(0.028));
        grd.addColorStop(0,'rgba(94,240,208,0.70)');grd.addColorStop(1,'transparent');
        ctx.beginPath();ctx.arc(x,cpwY,cps(0.028),0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
        ctx.beginPath();ctx.arc(x,cpwY,cps(0.009),0,Math.PI*2);ctx.fillStyle='#5ef0d0';ctx.fill();
      }
    });

    // GND symbol helper
    function drawGNDSymbol(x,y){
      const w=cps(0.022);ctx.strokeStyle='rgba(140,160,200,0.6)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x-w,y);ctx.lineTo(x+w,y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-w*0.65,y+cps(0.008));ctx.lineTo(x+w*0.65,y+cps(0.008));ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-w*0.30,y+cps(0.016));ctx.lineTo(x+w*0.30,y+cps(0.016));ctx.stroke();
    }

    ctx.font=`700 ${Math.max(7,cps(0.020))}px 'Courier New',monospace`;ctx.fillStyle='rgba(255,255,255,0.14)';
    ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText('RF-ANT-REV1.0',_BX+cps(0.04),_BY+_BH-cps(0.025));
  }

  /* ================================================================
     SCENE 4 — Manufacturing Gerber Layer View
  ================================================================ */
  const S4 = { highlight: 0, highlightTs: 0, layerAlpha: [1,0.85,0.75,0.70] };
  const S4_LAYERS = [
    { name:'L1 TOP Cu',  col:'rgba(94,240,208,{a})',  baseA:0.70 },
    { name:'L2 GND',     col:'rgba(80,180,80,{a})',   baseA:0.30 },
    { name:'L3 PWR',     col:'rgba(255,148,48,{a})',  baseA:0.25 },
    { name:'L4 BOT Cu',  col:'rgba(100,140,255,{a})', baseA:0.20 },
  ];

  function s4Col(template, alpha) { return template.replace('{a}', String(alpha)); }

  function drawScene4(ts) {
    ctx.fillStyle='#020508'; ctx.fillRect(0,0,W,H);

    // Outer board frame (amber outline)
    rrPath(_BX,_BY,_BW,_BH,cps(0.016));
    ctx.fillStyle='rgba(7,24,12,0.95)'; ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=2.2; ctx.stroke();

    // Coordinate ruler marks (top + left edges)
    ctx.strokeStyle='rgba(200,164,48,0.30)'; ctx.lineWidth=0.7;
    const tickW=_BW/10;
    for(let i=0;i<=10;i++) {
      const tx=_BX+tickW*i;
      ctx.beginPath();ctx.moveTo(tx,_BY);ctx.lineTo(tx,_BY+cps(0.02));ctx.stroke();
      ctx.beginPath();ctx.moveTo(tx,_BY+_BH);ctx.lineTo(tx,_BY+_BH-cps(0.02));ctx.stroke();
      if(i>0&&i<10){ctx.font=`${Math.max(5,cps(0.015))}px 'Courier New',monospace`;ctx.fillStyle='rgba(200,164,48,0.30)';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(String(i*10),tx,_BY+cps(0.025));}
    }
    const tickH=_BH/8;
    for(let i=0;i<=8;i++){const ty=_BY+tickH*i;ctx.beginPath();ctx.moveTo(_BX,ty);ctx.lineTo(_BX+cps(0.02),ty);ctx.stroke();}

    // Cycle highlight layer
    const now=ts;
    if (now-S4.highlightTs>1400){S4.highlight=(S4.highlight+1)%S4_LAYERS.length;S4.highlightTs=now;}
    const hlA=Math.abs(Math.sin((now-S4.highlightTs)*0.003))*0.4;

    // Draw each layer (bottom-up)
    ctx.lineCap='round'; ctx.lineJoin='round';

    // Layer 4 (bottom copper) — coarse traces
    ctx.strokeStyle=s4Col(S4_LAYERS[3].col, S4_LAYERS[3].baseA+(S4.highlight===3?hlA:0));
    ctx.lineWidth=cps(0.008);
    [[0.15,0.80,0.85,0.80],[0.15,0.75,0.50,0.75],[0.50,0.75,0.50,0.60],[0.60,0.55,0.85,0.55]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(cpx(x1),cpy(y1));ctx.lineTo(cpx(x2),cpy(y2));ctx.stroke();});

    // Layer 3 (power plane) — large poured area
    rrPath(_BX+cps(0.05),_BY+cps(0.05),_BW-cps(0.10),_BH-cps(0.10),cps(0.008));
    ctx.fillStyle=s4Col(S4_LAYERS[2].col,S4_LAYERS[2].baseA+(S4.highlight===2?hlA:0)); ctx.fill();

    // Layer 2 (GND plane) — hatched
    ctx.fillStyle=s4Col(S4_LAYERS[1].col,S4_LAYERS[1].baseA+(S4.highlight===1?hlA:0));
    const hs=cps(0.022);
    ctx.save(); rrPath(_BX+cps(0.04),_BY+cps(0.04),_BW-cps(0.08),_BH-cps(0.08),cps(0.006)); ctx.clip();
    for(let gx=_BX;gx<_BX+_BW;gx+=hs){ctx.beginPath();ctx.moveTo(gx,_BY);ctx.lineTo(gx,_BY+_BH);ctx.lineWidth=hs*0.28;ctx.stroke();}
    ctx.restore();

    // Layer 1 (top copper) — original PCB traces, highlighted
    const l1col=S4.highlight===0?s4Col(S4_LAYERS[0].col,S4_LAYERS[0].baseA+hlA):s4Col(S4_LAYERS[0].col,S4_LAYERS[0].baseA*0.7);
    S0_TRACE_DEFS.forEach(tr => {
      if (!S0.traces.length) return;
      const pts=tr.pts.map(([rx,ry])=>({x:cpx(rx),y:cpy(ry)}));
      ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
      ctx.strokeStyle=tr.t==='pow'?s4Col('rgba(255,148,48,{a})',0.55):tr.t==='clk'?s4Col('rgba(170,120,255,{a})',0.55):l1col;
      ctx.lineWidth=cps(0.0038)*(tr.w||1); ctx.stroke();
    });

    // Drill hits
    const drills=[...S0_VIA_DEFS,{rx:0.415,ry:0.090},{rx:0.840,ry:0.105},{rx:0.875,ry:0.600}];
    drills.forEach(v=>{
      ctx.beginPath();ctx.arc(cpx(v.rx),cpy(v.ry),cps(0.012),0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.50)';ctx.fill();
      ctx.beginPath();ctx.arc(cpx(v.rx),cpy(v.ry),cps(0.006),0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fill();
    });

    // Silkscreen outlines for major ICs
    ctx.strokeStyle='rgba(255,255,255,0.30)'; ctx.lineWidth=0.8;
    [[0.405,0.360,0.210,0.210],[0.125,0.435,0.095,0.075],[0.700,0.700,0.115,0.075]].forEach(([rx,ry,rw,rh])=>{
      ctx.strokeRect(cpx(rx)-cps(rw)/2,cpy(ry)-cps(rh)/2,cps(rw),cps(rh));
    });

    // Layer stack panel (right side of frame)
    const panX=_BX+_BW+cps(0.025), panY=_BY+_BH*0.15;
    if (panX+cps(0.18)<W-2) {
      ctx.font=`600 ${Math.max(6,cps(0.018))}px 'Courier New',monospace`;
      ctx.fillStyle='rgba(255,255,255,0.25)';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText('LAYERS',panX,panY-cps(0.03));
      S4_LAYERS.forEach((layer,i) => {
        const ly=panY+i*cps(0.075);
        const isHl=i===S4.highlight;
        ctx.fillStyle=s4Col(layer.col,isHl?0.80:0.40);
        ctx.fillRect(panX,ly,cps(0.015),cps(0.015));
        ctx.font=`${Math.max(5,cps(0.016))}px 'Courier New',monospace`;
        ctx.fillStyle=isHl?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.30)';
        ctx.fillText(layer.name,panX+cps(0.022),ly);
      });
    }

    // Title block
    ctx.font=`700 ${Math.max(7,cps(0.022))}px 'Courier New',monospace`;ctx.fillStyle='rgba(255,255,255,0.14)';
    ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText('GERBER OUT REV2.1',_BX+cps(0.04),_BY+_BH-cps(0.025));
    ctx.font=`${Math.max(5,cps(0.016))}px 'Courier New',monospace`;ctx.fillStyle='rgba(200,164,48,0.30)';
    ctx.fillText('4-LAYER · FR4 · 1.6mm',_BX+cps(0.04),_BY+_BH-cps(0.025)-cps(0.030));
  }

  /* ================================================================
     Scene dispatch
  ================================================================ */
  function rebuildScene() {
    buildS0();
    buildS1Signals();
    buildS2Signals();
    buildS3Signals();
  }

  function draw(ts) {
    switch (currentScene) {
      case 0: drawScene0(ts); break;
      case 1: drawScene1(ts); break;
      case 2: drawScene2(ts); break;
      case 3: drawScene3(ts); break;
      case 4: drawScene4(ts); break;
    }
  }

  /* ================================================================
     Scene change (CSS opacity crossfade)
  ================================================================ */
  function changeScene(n) {
    if (n === currentScene) return;
    canvas.style.transition = 'opacity 0.32s ease';
    canvas.style.opacity    = '0';
    setTimeout(() => {
      currentScene = n;
      ctx.clearRect(0, 0, W, H);
      void canvas.offsetHeight;
      canvas.style.opacity = '1';
    }, 340);
  }

  window.addEventListener('hero-slide-change', e => changeScene(e.detail.index));

  /* ================================================================
     Resize + loop
  ================================================================ */
  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    if (!W || !H) return;
    canvas.width  = Math.round(W * devicePixelRatio);
    canvas.height = Math.round(H * devicePixelRatio);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const marg = Math.min(W, H) * 0.056;
    _BX = marg; _BY = marg; _BW = W - 2*marg; _BH = H - 2*marg;
    rebuildScene();
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
