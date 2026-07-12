/* ============================================================
   CoinForge Studio — renderer.js
   Canvas pipeline: metal preview → art layer (grayscale ink)
   → mark-dark/mark-light compositing → relief illusion →
   guides & selection chrome.
   The same art layer feeds screen, thumbnails and PNG export,
   so what you see is what engraves.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;

  const METALS = {
    brass: { label: 'Brass', hi: '#fdf3cd', mid: '#d9b544', lo: '#7d611c', rim: '#5c4713', text: '#3a2e0c' },
    gold: { label: 'Gold', hi: '#fff3c4', mid: '#e8c04a', lo: '#96721a', rim: '#6d5313', text: '#3a2e0c' },
    silver: { label: 'Silver', hi: '#ffffff', mid: '#c4c9d2', lo: '#787f8c', rim: '#565c66', text: '#2c3138' },
    copper: { label: 'Copper', hi: '#ffd9b8', mid: '#c87f4a', lo: '#7a4423', rim: '#5a2f16', text: '#3a1f0e' },
    bronze: { label: 'Antique Bronze', hi: '#e6c896', mid: '#9c7a3c', lo: '#57431c', rim: '#3d2f12', text: '#2b210d' },
    black: { label: 'Matte Black', hi: '#4a4a4a', mid: '#282828', lo: '#111111', rim: '#000000', text: '#e8e8e8' },
    gunmetal: { label: 'Gunmetal', hi: '#9aa2ac', mid: '#5a626e', lo: '#2e343c', rim: '#1c2026', text: '#dfe3e8' },
  };

  const R = { canvas: null, ctx: null, basePx: 4, hoverId: null };
  let brushCache = new Map();

  R.metals = METALS;

  R.init = function (canvas) {
    R.canvas = canvas;
    R.ctx = canvas.getContext('2d');
    const onResize = () => { R.resize(); R.render(); };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement);
    window.addEventListener('resize', onResize);
    /* layout can settle after boot — measure again on the next frames */
    requestAnimationFrame(() => requestAnimationFrame(onResize));
    setTimeout(onResize, 400);
    CF.bus.on('doc', () => R.render());
    CF.bus.on('doc-soft', () => R.render());
    CF.bus.on('sel', () => R.render());
    CF.bus.on('ui', () => R.render());
    CF.bus.on('fonts-ready', () => R.render());
    R.resize();
  };

  R.resize = function () {
    const p = R.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(50, p.clientWidth), h = Math.max(50, p.clientHeight);
    R.canvas.width = Math.round(w * dpr);
    R.canvas.height = Math.round(h * dpr);
    R.canvas.style.width = w + 'px';
    R.canvas.style.height = h + 'px';
    R.dpr = dpr;
    R.fitBase();
  };

  R.fitBase = function () {
    if (!S().doc) return;
    const D = CF.substrate.maxDimMM(S().doc);
    const avail = Math.min(R.canvas.width, R.canvas.height);
    R.basePx = avail * 0.8 / D;
  };

  R.fit = function () {
    R.fitBase();
    S().setUI({ zoom: 1, panX: 0, panY: 0 });
  };

  R.scale = () => R.basePx * (S().ui.zoom || 1);
  R.centerPx = () => ({
    cx: R.canvas.width / 2 + (S().ui.panX || 0) * R.dpr,
    cy: R.canvas.height / 2 + (S().ui.panY || 0) * R.dpr
  });

  /* CSS-pixel event coords → document mm */
  R.screenToMM = function (px, py) {
    const s = R.scale(), { cx, cy } = R.centerPx();
    return { x: (px * R.dpr - cx) / s, y: (py * R.dpr - cy) / s };
  };
  R.mmToScreen = function (x, y) {
    const s = R.scale(), { cx, cy } = R.centerPx();
    return { x: (x * s + cx) / R.dpr, y: (y * s + cy) / R.dpr };
  };

  /* ---------- art layer ---------- */
  /* renders all elements, ink = grayscale, transparent bg.
     Returns canvas whose center = doc center; sides = substrate*pad*pxPerMM.
     filter: optional (el)=>bool (group solo/mute, per-group export). */
  R.renderArt = function (doc, pxPerMM, pad = 1.5, filter) {
    const { w: wMM, h: hMM } = CF.substrate.sizeMM(doc);
    const sideW = Math.max(4, Math.round(wMM * pad * pxPerMM));
    const sideH = Math.max(4, Math.round(hMM * pad * pxPerMM));
    const { canvas, ctx } = U.makeCanvas(sideW, sideH);
    ctx.translate(sideW / 2, sideH / 2);
    ctx.scale(pxPerMM, pxPerMM);
    for (const el of doc.elements) {
      if (el.type === 'outline') continue; /* machine path, never engraved art */
      if (filter && !filter(el)) continue;
      CF.Elements.render(ctx, el, { pxPerMM, preview: true });
    }
    return canvas;
  };

  /* Path2D cache for outline overlays */
  const outlineP2D = new Map();
  function outlinePath(el) {
    let p = outlineP2D.get(el.d);
    if (!p) {
      p = new Path2D(el.d);
      if (outlineP2D.size > 8) outlineP2D.clear();
      outlineP2D.set(el.d, p);
    }
    return p;
  }

  function tinted(src, filter) {
    const { canvas, ctx } = U.makeCanvas(src.width, src.height);
    ctx.filter = filter;
    ctx.drawImage(src, 0, 0);
    return canvas;
  }

  function drawBrushed(ctx, cx, cy, r, seedKey) {
    let c = brushCache.get(seedKey);
    if (!c) {
      const size = Math.round(r * 2);
      const off = U.makeCanvas(size, size);
      const octx = off.ctx;
      octx.translate(size / 2, size / 2);
      let rnd = 12345;
      const rand = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; };
      for (let i = 0; i < 90; i++) {
        const rr = rand() * r * 0.97;
        const a0 = rand() * Math.PI * 2;
        const sweep = 0.4 + rand() * 2.2;
        octx.beginPath();
        octx.arc(0, 0, rr, a0, a0 + sweep);
        octx.strokeStyle = rand() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)';
        octx.lineWidth = 0.6 + rand() * 1.3;
        octx.stroke();
      }
      c = off.canvas;
      if (brushCache.size > 6) brushCache.clear();
      brushCache.set(seedKey, c);
    }
    ctx.drawImage(c, cx - r, cy - r, r * 2, r * 2);
  }

  R.drawMetal = function (ctx, cx, cy, rPx, metalId) {
    const m = METALS[metalId] || METALS.brass;
    /* drop shadow */
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + rPx * 0.02, cy + rPx * 0.04, rPx * 1.01, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.filter = `blur(${Math.max(2, rPx * 0.04)}px)`;
    ctx.fill();
    ctx.restore();

    /* base */
    const g = ctx.createRadialGradient(cx - rPx * 0.45, cy - rPx * 0.5, rPx * 0.1, cx, cy, rPx * 1.35);
    g.addColorStop(0, m.hi);
    g.addColorStop(0.45, m.mid);
    g.addColorStop(1, m.lo);
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    /* spun-finish brushing */
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rPx * 0.985, 0, Math.PI * 2);
    ctx.clip();
    drawBrushed(ctx, cx, cy, rPx, metalId + '|' + Math.round(rPx / 40));
    ctx.restore();

    /* diagonal sheen */
    const sh = ctx.createLinearGradient(cx - rPx, cy - rPx, cx + rPx, cy + rPx);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(0.42, 'rgba(255,255,255,0.13)');
    sh.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    sh.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.fillStyle = sh;
    ctx.fill();

    /* rim */
    ctx.beginPath();
    ctx.arc(cx, cy, rPx - rPx * 0.012, 0, Math.PI * 2);
    ctx.lineWidth = rPx * 0.025;
    ctx.strokeStyle = m.rim;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, rPx - rPx * 0.04, 0, Math.PI * 2);
    ctx.lineWidth = rPx * 0.008;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
  };

  /* horizontal brushed-slab finish (cards) — seeded like drawBrushed */
  function drawBrushedSlab(ctx, cx, cy, wPx, hPx, seedKey) {
    let c = brushCache.get(seedKey);
    if (!c) {
      const W = Math.max(2, Math.round(wPx)), H = Math.max(2, Math.round(hPx));
      const off = U.makeCanvas(W, H);
      const octx = off.ctx;
      let rnd = 98765;
      const rand = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; };
      for (let i = 0; i < 120; i++) {
        const y = rand() * H;
        const x0 = rand() * W * 0.5;
        const len = W * (0.3 + rand() * 0.7);
        octx.beginPath();
        octx.moveTo(x0, y);
        octx.lineTo(Math.min(W, x0 + len), y + (rand() - 0.5) * 2);
        octx.strokeStyle = rand() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)';
        octx.lineWidth = 0.6 + rand() * 1.3;
        octx.stroke();
      }
      c = off.canvas;
      if (brushCache.size > 6) brushCache.clear();
      brushCache.set(seedKey, c);
    }
    ctx.drawImage(c, cx - wPx / 2, cy - hPx / 2, wPx, hPx);
  }

  /* substrate-aware blank dispatcher — circles keep the original drawMetal
     path untouched; rect/rounded get the slab treatment */
  R.drawBlank = function (ctx, doc, cx, cy, pxPerMM, metalId) {
    const sub = CF.substrate.get(doc);
    if (sub.kind === 'circle') {
      R.drawMetal(ctx, cx, cy, sub.diameterMM / 2 * pxPerMM, metalId);
      return;
    }
    const m = METALS[metalId] || METALS.brass;
    const { w, h } = CF.substrate.sizeMM(doc);
    const wPx = w * pxPerMM, hPx = h * pxPerMM;
    const minPx = Math.min(wPx, hPx);

    /* drop shadow */
    ctx.save();
    CF.substrate.trace(ctx, doc, cx + minPx * 0.015, cy + minPx * 0.03, pxPerMM);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.filter = `blur(${Math.max(2, minPx * 0.035)}px)`;
    ctx.fill();
    ctx.restore();

    /* base */
    const g = ctx.createLinearGradient(cx - wPx * 0.5, cy - hPx * 0.6, cx + wPx * 0.5, cy + hPx * 0.65);
    g.addColorStop(0, m.hi);
    g.addColorStop(0.48, m.mid);
    g.addColorStop(1, m.lo);
    CF.substrate.trace(ctx, doc, cx, cy, pxPerMM);
    ctx.fillStyle = g;
    ctx.fill();

    /* brushed finish + sheen, clipped inside the blank */
    ctx.save();
    CF.substrate.trace(ctx, doc, cx, cy, pxPerMM, { shrink: 0.995 });
    ctx.clip();
    drawBrushedSlab(ctx, cx, cy, wPx, hPx, 'slab|' + metalId + '|' + Math.round(wPx / 40) + 'x' + Math.round(hPx / 40));
    const sh = ctx.createLinearGradient(cx - wPx / 2, cy - hPx / 2, cx + wPx / 2, cy + hPx / 2);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(0.42, 'rgba(255,255,255,0.13)');
    sh.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    sh.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = sh;
    ctx.fillRect(cx - wPx / 2, cy - hPx / 2, wPx, hPx);
    ctx.restore();

    /* rim */
    ctx.save();
    CF.substrate.trace(ctx, doc, cx, cy, pxPerMM, { insetMM: Math.min(w, h) * 0.008 });
    ctx.lineWidth = minPx * 0.014;
    ctx.strokeStyle = m.rim;
    ctx.stroke();
    CF.substrate.trace(ctx, doc, cx, cy, pxPerMM, { insetMM: Math.min(w, h) * 0.024 });
    ctx.lineWidth = minPx * 0.005;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
    ctx.restore();
  };

  /* ---------- main render ---------- */
  R.render = function () {
    const doc = S().doc;
    if (!doc || !R.ctx) return;
    const ctx = R.ctx;
    const W = R.canvas.width, H = R.canvas.height;
    const s = R.scale();
    const { cx, cy } = R.centerPx();
    const sub = CF.substrate.get(doc);
    const D = CF.substrate.maxDimMM(doc);
    const rPx = D / 2 * s;
    const ui = S().ui;

    /* workspace */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.75);
    bg.addColorStop(0, '#20242b');
    bg.addColorStop(1, '#15181d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    R.drawBlank(ctx, doc, cx, cy, s, ui.metal);

    /* art */
    const pad = 1.5;
    const art = R.renderArt(doc, s, pad, el => S().groupVisible(el));
    let inked = art;
    if (ui.markLight) inked = tinted(art, 'invert(1)');
    const ax = cx - art.width / 2, ay = cy - art.height / 2;

    /* ghost of overflow outside the blank */
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.drawImage(inked, ax, ay);
    ctx.restore();

    ctx.save();
    if (sub.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(cx, cy, rPx * 0.995, 0, Math.PI * 2);
    } else {
      CF.substrate.trace(ctx, doc, cx, cy, s, { shrink: 0.995 });
    }
    ctx.clip();
    if (ui.relief) {
      const d = Math.max(0.6, s * 0.045);
      ctx.globalAlpha = 0.5;
      ctx.drawImage(tinted(inked, 'brightness(0) invert(1)'), ax + d, ay + d);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(tinted(inked, 'brightness(0)'), ax - d * 0.7, ay - d * 0.7);
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.92;
    ctx.drawImage(inked, ax, ay);
    ctx.globalAlpha = 1;
    ctx.restore();

    /* cut-outline overlay — red machine path, drawn above the metal, never engraved */
    for (const el of doc.elements) {
      if (el.type !== 'outline' || !el.visible || !el.d) continue;
      if (!S().groupVisible(el)) continue;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.translate(el.x || 0, el.y || 0);
      if (el.rotation) ctx.rotate(U.deg2rad(el.rotation));
      ctx.lineWidth = Math.max(0.05, 1.7 * R.dpr / s);
      ctx.strokeStyle = '#ff4545';
      ctx.stroke(outlinePath(el));
      ctx.restore();
    }

    /* guides */
    if (ui.showGuides) {
      ctx.save();
      ctx.strokeStyle = 'rgba(94,197,255,0.5)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1;
      if (sub.kind === 'circle') {
        const mr = (sub.diameterMM / 2 - sub.marginMM) * s;
        ctx.beginPath(); ctx.arc(cx, cy, mr, 0, Math.PI * 2);
      } else {
        CF.substrate.trace(ctx, doc, cx, cy, s, { insetMM: sub.marginMM || 0 });
      }
      ctx.stroke();
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = 'rgba(94,197,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(cx - rPx * 1.08, cy); ctx.lineTo(cx + rPx * 1.08, cy);
      ctx.moveTo(cx, cy - rPx * 1.08); ctx.lineTo(cx, cy + rPx * 1.08);
      ctx.stroke();
      ctx.restore();
    }

    /* hover + selection */
    const hovered = R.hoverId && !S().sel.has(R.hoverId) ? doc.elements.find(e => e.id === R.hoverId) : null;
    if (hovered) drawChrome(ctx, hovered, s, cx, cy, 'rgba(120,200,255,0.55)', false);
    const sels = S().selEls();
    for (const el of sels) {
      drawChrome(ctx, el, s, cx, cy, '#5ec5ff', sels.length === 1);
    }
  };

  function elCorners(el, s, cx, cy) {
    const b = CF.Elements.boundsOf(el);
    const a = U.deg2rad(el.rotation || 0);
    const cos = Math.cos(a), sin = Math.sin(a);
    const pts = [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [b.w / 2, b.h / 2], [-b.w / 2, b.h / 2]];
    return pts.map(([x, y]) => {
      const rx = x * cos - y * sin + el.x, ry = x * sin + y * cos + el.y;
      return { x: rx * s + cx, y: ry * s + cy };
    });
  }

  function drawChrome(ctx, el, s, cx, cy, color, withHandles) {
    const cs = elCorners(el, s, cx, cy);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4 * R.dpr;
    ctx.setLineDash([]);
    ctx.beginPath();
    cs.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();

    if (withHandles && !el.locked) {
      const dpr = R.dpr, hw = (R.touchMode ? 8 : 4.5) * dpr;
      ctx.lineWidth = 1.2 * dpr;
      const hs = R.handles(el);
      for (const h of hs) {
        ctx.beginPath();
        if (h.kind === 'rotate') {
          const top = { x: (cs[0].x + cs[1].x) / 2, y: (cs[0].y + cs[1].y) / 2 };
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(h.x * dpr, h.y * dpr);
          ctx.strokeStyle = color;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(h.x * dpr, h.y * dpr, (R.touchMode ? 8.5 : 5) * dpr, 0, Math.PI * 2);
          ctx.fillStyle = '#ffd66b';
          ctx.fill();
          ctx.strokeStyle = '#1c1c1c';
          ctx.stroke();
        } else if (h.kind === 'radius') {
          ctx.save();
          ctx.translate(h.x * dpr, h.y * dpr);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = '#7bf59a';
          ctx.fillRect(-hw, -hw, hw * 2, hw * 2);
          ctx.strokeStyle = '#1c1c1c';
          ctx.strokeRect(-hw, -hw, hw * 2, hw * 2);
          ctx.restore();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(h.x * dpr - hw, h.y * dpr - hw, hw * 2, hw * 2);
          ctx.strokeStyle = '#1c1c1c';
          ctx.strokeRect(h.x * dpr - hw, h.y * dpr - hw, hw * 2, hw * 2);
        }
      }
    }
    ctx.restore();
  }

  /* handle positions in CSS pixels (for hit-testing too) */
  R.handles = function (el) {
    const s = R.scale(), { cx, cy } = R.centerPx();
    const cs = elCorners(el, s, cx, cy).map(p => ({ x: p.x / R.dpr, y: p.y / R.dpr }));
    const out = cs.map((p, i) => ({ kind: 'scale', idx: i, x: p.x, y: p.y }));
    /* rotate handle above top edge */
    const top = { x: (cs[0].x + cs[1].x) / 2, y: (cs[0].y + cs[1].y) / 2 };
    const c = { x: (cs[0].x + cs[2].x) / 2, y: (cs[0].y + cs[2].y) / 2 };
    const dx = top.x - c.x, dy = top.y - c.y;
    const L = Math.hypot(dx, dy) || 1;
    const stem = R.touchMode ? 38 : 26;
    out.push({ kind: 'rotate', x: top.x + dx / L * stem, y: top.y + dy / L * stem });
    if (CF.Elements.getRadius(el) !== null) {
      const r = CF.Elements.getRadius(el);
      const p = CF.geo.polar(135, r, el.x, el.y);
      const sp = R.mmToScreen(p.x, p.y);
      out.push({ kind: 'radius', x: sp.x, y: sp.y });
    }
    return out;
  };

  /* ---------- export & thumbnails ---------- */
  /* black-on-transparent art at precise DPI (or on white) */
  R.exportArt = function (doc, dpi, { bg = 'white', invert = false, includeOutline = false, mirror = false, filter = undefined } = {}) {
    const pxPerMM = dpi / 25.4;
    const sub = CF.substrate.get(doc);
    const { w: wMM, h: hMM } = CF.substrate.sizeMM(doc);
    const side = Math.round(wMM * pxPerMM);
    const sideH = Math.round(hMM * pxPerMM);
    const { canvas, ctx } = U.makeCanvas(side, sideH);
    if (bg === 'white') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, side, sideH); }
    ctx.save();
    if (mirror) { ctx.translate(side, 0); ctx.scale(-1, 1); }
    /* clip to the blank so overflow art doesn't export
       (rect: the canvas bounds ARE the blank — no clip needed) */
    if (sub.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(side / 2, side / 2, side / 2, 0, Math.PI * 2);
      ctx.clip();
    } else if (sub.kind !== 'rect') { /* rounded + shaped tokens */
      CF.substrate.trace(ctx, doc, side / 2, sideH / 2, pxPerMM);
      ctx.clip();
    }
    const art = R.renderArt(doc, pxPerMM, 1.0, filter);
    ctx.drawImage(art, Math.round(side / 2 - art.width / 2), Math.round(sideH / 2 - art.height / 2));
    ctx.restore();
    if (includeOutline) {
      ctx.save();
      if (mirror) { ctx.translate(side, 0); ctx.scale(-1, 1); }
      if (sub.kind === 'circle') {
        ctx.beginPath();
        ctx.arc(side / 2, side / 2, side / 2 - Math.max(1, pxPerMM * 0.05), 0, Math.PI * 2);
      } else {
        CF.substrate.trace(ctx, doc, side / 2, sideH / 2, pxPerMM, { insetMM: 0.05 });
      }
      ctx.lineWidth = Math.max(1, pxPerMM * 0.1);
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.restore();
    }
    if (invert) {
      const img = ctx.getImageData(0, 0, side, sideH);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2];
      }
      ctx.putImageData(img, 0, 0);
    }
    return canvas;
  };

  R.thumbnail = function (doc, sizePx = 220, metalId) {
    const { canvas, ctx } = U.makeCanvas(sizePx, sizePx);
    const rPx = sizePx * 0.46;
    const sub = CF.substrate.get(doc);
    ctx.fillStyle = '#1b1e24';
    ctx.fillRect(0, 0, sizePx, sizePx);
    const metal = metalId || (CF.store.ui ? CF.store.ui.metal : 'brass');
    const pxPerMM = (rPx * 2) / CF.substrate.maxDimMM(doc);
    if (sub.kind === 'circle') {
      R.drawMetal(ctx, sizePx / 2, sizePx / 2, rPx, metal);
    } else {
      R.drawBlank(ctx, doc, sizePx / 2, sizePx / 2, pxPerMM, metal);
    }
    const art = R.renderArt(doc, pxPerMM, 1.0);
    ctx.save();
    if (sub.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(sizePx / 2, sizePx / 2, rPx * 0.99, 0, Math.PI * 2);
    } else {
      CF.substrate.trace(ctx, doc, sizePx / 2, sizePx / 2, pxPerMM, { shrink: 0.99 });
    }
    ctx.clip();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(art, sizePx / 2 - art.width / 2, sizePx / 2 - art.height / 2);
    ctx.restore();
    return canvas;
  };

  CF.renderer = R;
})();