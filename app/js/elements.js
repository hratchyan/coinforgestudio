/* ============================================================
   CoinForge Studio — elements.js
   Element type system. Every element on the coin is a plain
   object; handlers know how to render (canvas, mm units,
   centered/rotated ctx), export to SVG, measure, and hit-test.

   Shade: 0 = full mark (black) … 100 = no mark (bare metal).
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, G = CF.geo;
  const num = U.num;

  /* shared measuring context */
  const mctx = document.createElement('canvas').getContext('2d');

  const CAP = 0.72, DESC = 0.26; /* em fractions used to anchor arc text by its outer edge */

  /* ---------- text layout helpers ---------- */
  function measureLine(el, text) {
    mctx.font = CF.Fonts.css(el, 100);
    const w = mctx.measureText(text).width / 100 * el.sizeMM;
    return w + Math.max(0, text.length - 1) * (el.letterSpacing || 0);
  }

  function arcLayout(el, radiusOverride, centerOverride) {
    const chars = Array.from(el.text || '');
    mctx.font = CF.Fonts.css(el, 100);
    const widths = chars.map(c => mctx.measureText(c).width / 100 * el.sizeMM);
    const ls = el.letterSpacing || 0;
    const r = radiusOverride !== undefined ? radiusOverride
      : (el.side === 'bottom' ? el.radiusMM - DESC * el.sizeMM : el.radiusMM - CAP * el.sizeMM);
    const rr = Math.max(1, r);
    const degOf = w => U.rad2deg(w / rr);
    let gaps = ls;
    const natural = widths.reduce((a, b) => a + b, 0) + ls * Math.max(0, chars.length - 1);
    if (el.sweepDeg > 0 && chars.length > 1) {
      const target = U.deg2rad(el.sweepDeg) * rr;
      gaps = ls + Math.max(0, (target - natural) / (chars.length - 1) + ls * 0);
      if (target > natural) gaps = (target - widths.reduce((a, b) => a + b, 0)) / (chars.length - 1);
    }
    const totalW = widths.reduce((a, b) => a + b, 0) + gaps * Math.max(0, chars.length - 1);
    const totalDeg = degOf(totalW);
    const center = centerOverride !== undefined ? centerOverride : (el.centerDeg || 0);
    const bottom = el.side === 'bottom';
    const placements = [];
    let cursor = 0;
    for (let i = 0; i < chars.length; i++) {
      const half = degOf(widths[i]) / 2;
      const off = degOf(cursor) + half;
      const a = bottom ? center + totalDeg / 2 - off : center - totalDeg / 2 + off;
      placements.push({ ch: chars[i], angleDeg: a, rot: bottom ? a + 180 : a });
      cursor += widths[i] + gaps;
    }
    return { placements, r: rr, totalDeg, bottom };
  }

  function drawArcChars(ctx, el, layout, cx = 0, cy = 0) {
    ctx.font = CF.Fonts.css(el, el.sizeMM);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const p of layout.placements) {
      const pos = G.polar(p.angleDeg, layout.r, cx, cy);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(U.deg2rad(p.rot));
      ctx.fillText(p.ch, 0, 0);
      ctx.restore();
    }
  }

  function arcCharsSVG(el, layout, fill, cx = 0, cy = 0) {
    const fam = U.svgEsc(el.font || CF.Fonts.default());
    let s = `<g font-family="${fam}" font-size="${num(el.sizeMM)}" font-weight="${el.weight || 400}"${el.italic ? ' font-style="italic"' : ''} fill="${fill}" text-anchor="middle">`;
    for (const p of layout.placements) {
      const pos = G.polar(p.angleDeg, layout.r, cx, cy);
      s += `<text transform="translate(${num(pos.x)} ${num(pos.y)}) rotate(${num(p.rot)})">${U.svgEsc(p.ch)}</text>`;
    }
    return s + '</g>';
  }

  /* ---------- image processing cache ---------- */
  const imgCache = new Map(); /* el.id -> {srcKey, baseImg, key, processed} */

  function imageEntry(el) {
    let e = imgCache.get(el.id);
    const srcKey = el.src ? el.src.length + ':' + el.src.slice(30, 62) : '';
    if (!e || e.srcKey !== srcKey) {
      e = { srcKey, baseImg: null, key: null, processed: null, loading: false };
      imgCache.set(el.id, e);
    }
    if (!e.baseImg && !e.loading && el.src) {
      e.loading = true;
      U.loadImage(el.src).then(img => {
        e.baseImg = img; e.loading = false;
        CF.bus.emit('doc-soft');
      }).catch(() => { e.loading = false; });
    }
    return e;
  }

  function processedCanvas(el) {
    const e = imageEntry(el);
    if (!e.baseImg) return null;
    const key = JSON.stringify([el.fx, el.mask, el.maskFeatherMM, el.maskScale, Math.round(el.widthMM * 4)]);
    if (e.key === key && e.processed) return e.processed;
    let cnv = U.canvasFromImage(e.baseImg);
    cnv = CF.Img.applyFx(cnv, el.fx);
    if (el.mask === 'circle') {
      const w = cnv.width, h = cnv.height;
      const R = Math.min(w, h) / 2 * (el.maskScale || 1);
      const pxPerMM = w / Math.max(0.1, el.widthMM);
      const featherPx = Math.max(0, (el.maskFeatherMM || 0) * pxPerMM);
      const { canvas: mk, ctx: mctx2 } = U.makeCanvas(w, h);
      const grad = mctx2.createRadialGradient(w / 2, h / 2, Math.max(0, R - featherPx), w / 2, h / 2, R);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      mctx2.fillStyle = grad;
      mctx2.fillRect(0, 0, w, h);
      const octx = cnv.getContext('2d');
      octx.globalCompositeOperation = 'destination-in';
      octx.drawImage(mk, 0, 0);
      octx.globalCompositeOperation = 'source-over';
    }
    e.key = key; e.processed = cnv;
    return cnv;
  }

  /* Path2D cache for symbols */
  const p2dCache = new Map();
  function path2d(d) {
    let p = p2dCache.get(d);
    if (!p) { p = new Path2D(d); p2dCache.set(d, p); }
    return p;
  }

  function symbolSource(el) {
    if (el.glyph) return { glyph: el.glyph };
    return CF.Symbols.get(el.symbolId || 'star5') || CF.Symbols.get('star5');
  }

  function glyphMetrics(glyph, fontFamily) {
    mctx.font = `100px ${fontFamily || CF.Glyphs.font}`;
    const m = mctx.measureText(glyph);
    const asc = m.actualBoundingBoxAscent || 75, desc = m.actualBoundingBoxDescent || 10;
    return { h: asc + desc, asc, desc, w: m.width };
  }

  function drawSymbolLocal(ctx, el, sizeMM, extraRot = 0) {
    const src = symbolSource(el);
    ctx.save();
    if (extraRot) ctx.rotate(U.deg2rad(extraRot));
    if (src.glyph) {
      const gm = glyphMetrics(src.glyph.char, src.glyph.fontFamily);
      const scale = sizeMM / (gm.h / 100 * 100) * 100 / 100; /* size = ink height */
      const fontPx = 100 * (sizeMM / gm.h);
      ctx.font = `${fontPx}px ${src.glyph.fontFamily || CF.Glyphs.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const yOff = (gm.asc - gm.desc) / 2 * (fontPx / 100);
      if (el.flipX) ctx.scale(-1, 1);
      ctx.fillText(src.glyph.char, 0, yOff);
    } else {
      const s = sizeMM / 100;
      ctx.scale(el.flipX ? -s : s, s);
      if (src.fill) ctx.fill(path2d(src.fill), src.fillRule || 'evenodd');
      if (src.stroke) {
        ctx.lineWidth = src.strokeW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(path2d(src.stroke));
      }
    }
    ctx.restore();
  }

  function symbolSVGLocal(el, sizeMM, fill, extraRot = 0) {
    const src = symbolSource(el);
    const rot = extraRot ? `rotate(${num(extraRot)}) ` : '';
    if (src.glyph) {
      const gm = glyphMetrics(src.glyph.char, src.glyph.fontFamily);
      const fontPx = 100 * (sizeMM / gm.h);
      const yOff = (gm.asc - gm.desc) / 2 * (fontPx / 100);
      return `<text transform="${rot ? rot.trim() : ''}${el.flipX ? ' scale(-1 1)' : ''}" x="0" y="${num(yOff)}" font-family="${U.svgEsc((src.glyph.fontFamily || CF.Glyphs.font).replace(/"/g, ''))}" font-size="${num(fontPx)}" fill="${fill}" text-anchor="middle">${U.svgEsc(src.glyph.char)}</text>`;
    }
    const s = sizeMM / 100;
    let out = `<g transform="${rot}scale(${num(el.flipX ? -s : s)} ${num(s)})">`;
    if (src.fill) out += `<path d="${src.fill}" fill="${fill}" fill-rule="${src.fillRule || 'evenodd'}"/>`;
    if (src.stroke) out += `<path d="${src.stroke}" fill="none" stroke="${fill}" stroke-width="${src.strokeW}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return out + '</g>';
  }

  /* ============================================================
     Handlers
     ============================================================ */
  const H = {};

  /* ---------- text ---------- */
  H.text = {
    label: 'Text',
    defaults: () => ({
      text: 'TEXT', font: CF.Fonts.default(), weight: 700, italic: false,
      sizeMM: 6, letterSpacing: 0.4, align: 'center', lineHeight: 1.15
    }),
    render(ctx, el) {
      ctx.font = CF.Fonts.css(el, el.sizeMM);
      try { ctx.letterSpacing = (el.letterSpacing || 0) + 'px'; } catch (e) { }
      ctx.textAlign = el.align || 'center';
      ctx.textBaseline = 'middle';
      const lines = String(el.text || '').split('\n');
      const lh = el.sizeMM * (el.lineHeight || 1.15);
      lines.forEach((line, i) => {
        const y = (i - (lines.length - 1) / 2) * lh;
        ctx.fillText(line, 0, y);
      });
      try { ctx.letterSpacing = '0px'; } catch (e) { }
    },
    bounds(el) {
      const lines = String(el.text || '').split('\n');
      const w = Math.max(4, ...lines.map(l => measureLine(el, l)));
      const h = lines.length * el.sizeMM * (el.lineHeight || 1.15);
      return { w, h };
    },
    scaleBy(el, f) { el.sizeMM = Math.max(1, el.sizeMM * f); el.letterSpacing = (el.letterSpacing || 0) * f; },
    toSVG(el, fill) {
      const lines = String(el.text || '').split('\n');
      const lh = el.sizeMM * (el.lineHeight || 1.15);
      const anchor = el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'middle';
      let s = `<g font-family="${U.svgEsc(el.font)}" font-size="${num(el.sizeMM)}" font-weight="${el.weight || 400}"${el.italic ? ' font-style="italic"' : ''} fill="${fill}" text-anchor="${anchor}"${el.letterSpacing ? ` letter-spacing="${num(el.letterSpacing)}"` : ''}>`;
      lines.forEach((line, i) => {
        const y = (i - (lines.length - 1) / 2) * lh;
        s += `<text x="0" y="${num(y)}" dominant-baseline="central">${U.svgEsc(line)}</text>`;
      });
      return s + '</g>';
    },
    inspector: [
      { key: 'text', label: 'Text', kind: 'textarea' },
      { key: 'font', label: 'Font', kind: 'font' },
      { key: 'weight', label: 'Weight', kind: 'weight' },
      { key: 'sizeMM', label: 'Size', kind: 'number', min: 1, max: 60, step: 0.5, unit: 'mm' },
      { key: 'letterSpacing', label: 'Letter spacing', kind: 'number', min: -2, max: 10, step: 0.1, unit: 'mm' },
      { key: 'lineHeight', label: 'Line height', kind: 'number', min: 0.7, max: 2.5, step: 0.05 },
      { key: 'italic', label: 'Italic', kind: 'checkbox' },
    ]
  };

  /* ---------- arc text ---------- */
  H.arctext = {
    label: 'Arc Text',
    defaults: () => ({
      text: 'ARC TEXT', font: CF.Fonts.default(), weight: 700, italic: false,
      sizeMM: 5, radiusMM: 18, centerDeg: 0, side: 'top', letterSpacing: 0.6, sweepDeg: 0, lockCenter: true
    }),
    render(ctx, el) {
      const layout = arcLayout(el);
      drawArcChars(ctx, el, layout);
    },
    bounds(el) { const d = 2 * (el.radiusMM + el.sizeMM * 0.15); return { w: d, h: d }; },
    hitTest(el, lx, ly, tol) {
      const r = Math.hypot(lx, ly);
      const mid = el.radiusMM - el.sizeMM * 0.5;
      if (Math.abs(r - mid) > el.sizeMM * 0.7 + tol) return false;
      const layout = arcLayout(el);
      let a = U.rad2deg(Math.atan2(lx, -ly));
      const center = el.centerDeg || 0;
      const half = layout.totalDeg / 2 + U.rad2deg(tol / Math.max(1, el.radiusMM));
      let diff = ((a - center) % 360 + 540) % 360 - 180;
      return Math.abs(diff) <= half;
    },
    scaleBy(el, f) { el.sizeMM = Math.max(1, el.sizeMM * f); el.radiusMM = Math.max(2, el.radiusMM * f); el.letterSpacing = (el.letterSpacing || 0) * f; },
    toSVG(el, fill) { return arcCharsSVG(el, arcLayout(el), fill); },
    inspector: [
      { key: 'text', label: 'Text', kind: 'textarea' },
      { key: 'font', label: 'Font', kind: 'font' },
      { key: 'weight', label: 'Weight', kind: 'weight' },
      { key: 'sizeMM', label: 'Size', kind: 'number', min: 1, max: 30, step: 0.25, unit: 'mm' },
      { key: 'radiusMM', label: 'Radius (outer edge)', kind: 'number', min: 2, max: 80, step: 0.25, unit: 'mm' },
      { key: 'side', label: 'Reads along', kind: 'select', options: [['top', 'Top of circle'], ['bottom', 'Bottom of circle']] },
      { key: 'centerDeg', label: 'Center angle', kind: 'number', min: -360, max: 360, step: 1, unit: '°' },
      { key: 'letterSpacing', label: 'Letter spacing', kind: 'number', min: -2, max: 10, step: 0.1, unit: 'mm' },
      { key: 'sweepDeg', label: 'Spread over arc (0 = natural)', kind: 'number', min: 0, max: 360, step: 5, unit: '°' },
      { key: 'lockCenter', label: 'Lock to blank center', kind: 'checkbox' },
    ]
  };

  /* ---------- symbol ---------- */
  H.symbol = {
    label: 'Symbol',
    defaults: () => ({ symbolId: 'star5', glyph: null, sizeMM: 12, flipX: false }),
    render(ctx, el) { drawSymbolLocal(ctx, el, el.sizeMM); },
    bounds(el) { return { w: el.sizeMM, h: el.sizeMM }; },
    scaleBy(el, f) { el.sizeMM = Math.max(0.5, el.sizeMM * f); },
    toSVG(el, fill) { return symbolSVGLocal(el, el.sizeMM, fill); },
    inspector: [
      { key: '_symbol', label: 'Symbol', kind: 'symbolpick' },
      { key: 'sizeMM', label: 'Size', kind: 'number', min: 1, max: 80, step: 0.5, unit: 'mm' },
      { key: 'flipX', label: 'Mirror', kind: 'checkbox' },
    ]
  };

  /* ---------- symbol ring ---------- */
  H.symbolring = {
    label: 'Symbol Ring',
    defaults: () => ({
      symbolId: 'star5', glyph: null, count: 24, radiusMM: 19.5, itemSizeMM: 2.6,
      startDeg: 0, sweepDeg: 360, rotateItems: true, itemRotDeg: 0, lockCenter: true
    }),
    render(ctx, el) {
      const n = Math.max(1, el.count | 0);
      const full = Math.abs(el.sweepDeg) >= 360;
      const step = full ? el.sweepDeg / n : (n > 1 ? el.sweepDeg / (n - 1) : 0);
      const start = full ? el.startDeg : el.startDeg - el.sweepDeg / 2;
      for (let i = 0; i < n; i++) {
        const a = start + i * step;
        const p = G.polar(a, el.radiusMM);
        ctx.save();
        ctx.translate(p.x, p.y);
        drawSymbolLocal(ctx, el, el.itemSizeMM, (el.rotateItems ? a : 0) + (el.itemRotDeg || 0));
        ctx.restore();
      }
    },
    bounds(el) { const d = 2 * (el.radiusMM + el.itemSizeMM / 2); return { w: d, h: d }; },
    hitTest(el, lx, ly, tol) {
      const r = Math.hypot(lx, ly);
      return Math.abs(r - el.radiusMM) <= el.itemSizeMM / 2 + tol;
    },
    scaleBy(el, f) { el.radiusMM = Math.max(1, el.radiusMM * f); el.itemSizeMM = Math.max(0.4, el.itemSizeMM * f); },
    toSVG(el, fill) {
      const n = Math.max(1, el.count | 0);
      const full = Math.abs(el.sweepDeg) >= 360;
      const step = full ? el.sweepDeg / n : (n > 1 ? el.sweepDeg / (n - 1) : 0);
      const start = full ? el.startDeg : el.startDeg - el.sweepDeg / 2;
      let s = '<g>';
      for (let i = 0; i < n; i++) {
        const a = start + i * step;
        const p = G.polar(a, el.radiusMM);
        s += `<g transform="translate(${num(p.x)} ${num(p.y)})">` +
          symbolSVGLocal(el, el.itemSizeMM, fill, (el.rotateItems ? a : 0) + (el.itemRotDeg || 0)) + '</g>';
      }
      return s + '</g>';
    },
    inspector: [
      { key: '_symbol', label: 'Symbol', kind: 'symbolpick' },
      { key: 'count', label: 'Count', kind: 'number', min: 1, max: 120, step: 1 },
      { key: 'radiusMM', label: 'Ring radius', kind: 'number', min: 1, max: 80, step: 0.25, unit: 'mm' },
      { key: 'itemSizeMM', label: 'Symbol size', kind: 'number', min: 0.5, max: 30, step: 0.1, unit: 'mm' },
      { key: 'startDeg', label: 'Start / center angle', kind: 'number', min: -360, max: 360, step: 1, unit: '°' },
      { key: 'sweepDeg', label: 'Sweep', kind: 'number', min: 10, max: 360, step: 5, unit: '°' },
      { key: 'rotateItems', label: 'Rotate with ring', kind: 'checkbox' },
      { key: 'itemRotDeg', label: 'Item rotation', kind: 'number', min: -180, max: 180, step: 5, unit: '°' },
      { key: 'lockCenter', label: 'Lock to blank center', kind: 'checkbox' },
    ]
  };

  /* ---------- ring band ---------- */
  H.ringband = {
    label: 'Ring Band',
    defaults: () => ({ radiusMM: 21, thicknessMM: 1.2, style: 'solid', detail: 1, lockCenter: true }),
    render(ctx, el) {
      const r = el.radiusMM, t = el.thicknessMM;
      const rO = r + t / 2, rI = r - t / 2;
      const style = el.style || 'solid';
      const C = Math.PI * 2 * r;
      if (style === 'solid') {
        ctx.fill(path2d(G.ringPath(rO, rI)), 'evenodd');
      } else if (style === 'double') {
        const lw = Math.min(t * 0.3, 0.8);
        ctx.fill(path2d(G.ringPath(rO, rO - lw) + ' ' + G.ringPath(rI + lw, rI)), 'evenodd');
      } else if (style === 'triple') {
        const lw = Math.min(t * 0.24, 0.7);
        ctx.fill(path2d(G.ringPath(rO, rO - lw) + ' ' + G.ringPath(r + lw / 2, r - lw / 2) + ' ' + G.ringPath(rI + lw, rI)), 'evenodd');
      } else if (style === 'beaded') {
        const beadR = t / 2;
        const count = Math.max(8, Math.round(C / (beadR * 2.6) * (el.detail || 1)));
        ctx.fill(path2d(G.beadRing(r, beadR, count)), 'nonzero');
      } else if (style === 'rope') {
        const count = Math.max(12, Math.round(C / (t * 1.15) * (el.detail || 1)));
        ctx.lineWidth = t * 0.52;
        ctx.lineCap = 'round';
        ctx.stroke(path2d(G.ropeRing(r, t, count)));
      } else if (style === 'reeded') {
        const count = Math.max(24, Math.round(C / (t * 0.5) * (el.detail || 1)));
        ctx.lineWidth = Math.max(0.15, t * 0.16);
        ctx.lineCap = 'butt';
        ctx.stroke(path2d(G.reededRing(r, t, count)));
      } else if (style === 'dashed') {
        const count = Math.max(8, Math.round(C / (t * 3.2) * (el.detail || 1)));
        ctx.fill(path2d(G.dashRing(r, t, count, 55)), 'evenodd');
      } else if (style === 'scallop') {
        const waves = Math.max(8, Math.round(C / (t * 2.6) * (el.detail || 1)));
        ctx.fill(path2d(G.scallopRing(rO, rI, waves, t * 0.5)), 'evenodd');
      } else if (style === 'chain') {
        const links = 2 * Math.max(6, Math.round(C / (t * 2.6) * (el.detail || 1) / 2));
        ctx.fill(path2d(G.chainRing(r, links, t)), 'evenodd');
      } else if (style === 'laurel') {
        ctx.fill(path2d(G.wreathPath(r, 30, 10, t * 1.6, t * 0.55, Math.max(0.5, t * 0.28))), 'nonzero');
      }
    },
    bounds(el) { const d = 2 * (el.radiusMM + el.thicknessMM); return { w: d, h: d }; },
    hitTest(el, lx, ly, tol) {
      const r = Math.hypot(lx, ly);
      return Math.abs(r - el.radiusMM) <= el.thicknessMM / 2 + tol + (el.style === 'laurel' ? el.thicknessMM : 0);
    },
    scaleBy(el, f) { el.radiusMM = Math.max(1, el.radiusMM * f); el.thicknessMM = Math.max(0.2, el.thicknessMM * f); },
    toSVG(el, fill) {
      const r = el.radiusMM, t = el.thicknessMM;
      const rO = r + t / 2, rI = r - t / 2;
      const style = el.style || 'solid';
      const C = Math.PI * 2 * r;
      const fillPath = d => `<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`;
      const strokePath = (d, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${num(w)}" stroke-linecap="${cap}"/>`;
      if (style === 'solid') return fillPath(G.ringPath(rO, rI));
      if (style === 'double') { const lw = Math.min(t * 0.3, 0.8); return fillPath(G.ringPath(rO, rO - lw) + ' ' + G.ringPath(rI + lw, rI)); }
      if (style === 'triple') { const lw = Math.min(t * 0.24, 0.7); return fillPath(G.ringPath(rO, rO - lw) + ' ' + G.ringPath(r + lw / 2, r - lw / 2) + ' ' + G.ringPath(rI + lw, rI)); }
      if (style === 'beaded') { const beadR = t / 2; const count = Math.max(8, Math.round(C / (beadR * 2.6) * (el.detail || 1))); return `<path d="${G.beadRing(r, beadR, count)}" fill="${fill}"/>`; }
      if (style === 'rope') { const count = Math.max(12, Math.round(C / (t * 1.15) * (el.detail || 1))); return strokePath(G.ropeRing(r, t, count), t * 0.52); }
      if (style === 'reeded') { const count = Math.max(24, Math.round(C / (t * 0.5) * (el.detail || 1))); return strokePath(G.reededRing(r, t, count), Math.max(0.15, t * 0.16), 'butt'); }
      if (style === 'dashed') { const count = Math.max(8, Math.round(C / (t * 3.2) * (el.detail || 1))); return fillPath(G.dashRing(r, t, count, 55)); }
      if (style === 'scallop') { const waves = Math.max(8, Math.round(C / (t * 2.6) * (el.detail || 1))); return fillPath(G.scallopRing(rO, rI, waves, t * 0.5)); }
      if (style === 'chain') { const links = 2 * Math.max(6, Math.round(C / (t * 2.6) * (el.detail || 1) / 2)); return fillPath(G.chainRing(r, links, t)); }
      if (style === 'laurel') return `<path d="${G.wreathPath(r, 30, 10, t * 1.6, t * 0.55, Math.max(0.5, t * 0.28))}" fill="${fill}" fill-rule="nonzero"/>`;
      return '';
    },
    inspector: [
      {
        key: 'style', label: 'Style', kind: 'select', options: [
          ['solid', 'Solid band'], ['double', 'Double pinstripe'], ['triple', 'Triple line'],
          ['beaded', 'Beaded'], ['rope', 'Rope'], ['reeded', 'Reeded (coin edge)'],
          ['dashed', 'Dashed'], ['scallop', 'Scalloped'], ['chain', 'Chain'], ['laurel', 'Laurel wreath']]
      },
      { key: 'radiusMM', label: 'Radius (centerline)', kind: 'number', min: 1, max: 80, step: 0.25, unit: 'mm' },
      { key: 'thicknessMM', label: 'Thickness', kind: 'number', min: 0.2, max: 20, step: 0.1, unit: 'mm' },
      { key: 'detail', label: 'Pattern density', kind: 'number', min: 0.3, max: 3, step: 0.1 },
      { key: 'lockCenter', label: 'Lock to blank center', kind: 'checkbox' },
    ]
  };

  /* ---------- banner (motto ribbon) ---------- */
  H.banner = {
    label: 'Banner',
    defaults: () => ({
      wMM: 26, hMM: 5.5, curveDeg: 55, tails: 'swallow',
      text: 'MOTTO', font: CF.Fonts.default(), weight: 700, italic: false,
      sizeMM: 3.2, letterSpacing: 0.5, textShade: 100
    }),
    _geo(el) { return G.banner({ wMM: el.wMM, hMM: el.hMM, curveDeg: el.curveDeg, tails: el.tails }); },
    render(ctx, el, env) {
      const b = this._geo(el);
      const base = ctx.fillStyle;
      ctx.fill(path2d(b.body), 'nonzero');
      if (b.folds) {
        ctx.save();
        ctx.fillStyle = U.shadeColor(Math.max(0, (el.shade || 0) * 0.4));
        ctx.fill(path2d(b.folds), 'nonzero');
        ctx.restore();
      }
      /* text */
      ctx.save();
      ctx.fillStyle = U.shadeColor(el.textShade === undefined ? 100 : el.textShade);
      const tEl = { text: el.text, font: el.font, weight: el.weight, italic: el.italic, sizeMM: el.sizeMM, letterSpacing: el.letterSpacing, sweepDeg: 0 };
      if (b.text && b.text.kind === 'arc') {
        const up = b.text.up;
        tEl.side = up ? 'bottom' : 'top';
        tEl.centerDeg = b.text.midDeg;
        tEl.sweepDeg = 0;
        const rBase = up ? b.text.R + (CAP - DESC) / 2 * el.sizeMM : b.text.R - (CAP - DESC) / 2 * el.sizeMM;
        const layout = arcLayout(tEl, rBase, b.text.midDeg);
        drawArcChars(ctx, tEl, layout, 0, b.text.cy);
      } else {
        ctx.font = CF.Fonts.css(el, el.sizeMM);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        try { ctx.letterSpacing = (el.letterSpacing || 0) + 'px'; } catch (e) { }
        ctx.fillText(el.text, 0, 0);
        try { ctx.letterSpacing = '0px'; } catch (e) { }
      }
      ctx.restore();
    },
    bounds(el) {
      const sag = Math.abs(el.curveDeg) < 4 ? 0 : (el.wMM / (2 * Math.sin(U.deg2rad(Math.min(170, Math.abs(el.curveDeg)) / 2)))) * (1 - Math.cos(U.deg2rad(Math.min(170, Math.abs(el.curveDeg)) / 2)));
      return { w: el.wMM * 1.4, h: el.hMM * 2.2 + sag };
    },
    scaleBy(el, f) { el.wMM *= f; el.hMM *= f; el.sizeMM *= f; },
    toSVG(el, fill, flat) {
      const b = this._geo(el);
      let s = `<path d="${b.body}" fill="${fill}" fill-rule="nonzero"/>`;
      if (b.folds) s += `<path d="${b.folds}" fill="${flat ? fill : U.shadeColor(Math.max(0, (el.shade || 0) * 0.4))}" fill-rule="nonzero"/>`;
      const tfill = flat ? fill : U.shadeColor(el.textShade === undefined ? 100 : el.textShade);
      const tEl = { text: el.text, font: el.font, weight: el.weight, italic: el.italic, sizeMM: el.sizeMM, letterSpacing: el.letterSpacing, sweepDeg: 0 };
      if (b.text && b.text.kind === 'arc') {
        const up = b.text.up;
        tEl.side = up ? 'bottom' : 'top';
        tEl.centerDeg = b.text.midDeg;
        const rBase = up ? b.text.R + (CAP - DESC) / 2 * el.sizeMM : b.text.R - (CAP - DESC) / 2 * el.sizeMM;
        const layout = arcLayout(tEl, rBase, b.text.midDeg);
        s += arcCharsSVG(tEl, layout, tfill, 0, b.text.cy);
      } else {
        s += `<text x="0" y="0" font-family="${U.svgEsc(el.font)}" font-size="${num(el.sizeMM)}" font-weight="${el.weight || 400}" fill="${tfill}" text-anchor="middle" dominant-baseline="central">${U.svgEsc(el.text)}</text>`;
      }
      return s;
    },
    inspector: [
      { key: 'text', label: 'Text', kind: 'text' },
      { key: 'font', label: 'Font', kind: 'font' },
      { key: 'weight', label: 'Weight', kind: 'weight' },
      { key: 'sizeMM', label: 'Text size', kind: 'number', min: 1, max: 20, step: 0.25, unit: 'mm' },
      { key: 'textShade', label: 'Text shade (100 = bare metal)', kind: 'slider', min: 0, max: 100, step: 1 },
      { key: 'wMM', label: 'Width', kind: 'number', min: 5, max: 90, step: 0.5, unit: 'mm' },
      { key: 'hMM', label: 'Ribbon height', kind: 'number', min: 2, max: 25, step: 0.25, unit: 'mm' },
      { key: 'curveDeg', label: 'Curve (+up / −down)', kind: 'number', min: -170, max: 170, step: 5, unit: '°' },
      { key: 'tails', label: 'Tails', kind: 'select', options: [['swallow', 'Swallowtail'], ['square', 'Square'], ['none', 'None']] },
      { key: 'letterSpacing', label: 'Letter spacing', kind: 'number', min: -2, max: 8, step: 0.1, unit: 'mm' },
    ]
  };

  /* ---------- image ---------- */
  H.image = {
    label: 'Image',
    defaults: () => ({
      src: null, natW: 100, natH: 100, widthMM: 20,
      mask: 'none', maskFeatherMM: 0.6, maskScale: 1,
      fx: { gray: true, invert: false, bri: 0, con: 0, gamma: 1, levLo: 0, levHi: 255, posterize: 0, sharpen: 0 }
    }),
    render(ctx, el, env) {
      const cnv = el.src ? processedCanvas(el) : null;
      const w = el.widthMM, h = el.widthMM * (el.natH / el.natW);
      if (!cnv) {
        ctx.save();
        ctx.globalAlpha *= 0.35;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.4;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2);
        ctx.moveTo(w / 2, -h / 2); ctx.lineTo(-w / 2, h / 2);
        ctx.stroke();
        ctx.restore();
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cnv, -w / 2, -h / 2, w, h);
    },
    bounds(el) { return { w: el.widthMM, h: el.widthMM * (el.natH / el.natW) }; },
    scaleBy(el, f) { el.widthMM = Math.max(1, el.widthMM * f); },
    toSVG(el) {
      const cnv = el.src ? processedCanvas(el) : null;
      if (!cnv) return '';
      const w = el.widthMM, h = el.widthMM * (el.natH / el.natW);
      return `<image x="${num(-w / 2)}" y="${num(-h / 2)}" width="${num(w)}" height="${num(h)}" href="${cnv.toDataURL('image/png')}" preserveAspectRatio="none"/>`;
    },
    inspector: [
      { key: '_imgtools', label: '', kind: 'imagetools' },
      { key: 'widthMM', label: 'Width', kind: 'number', min: 1, max: 120, step: 0.5, unit: 'mm' },
      { key: 'mask', label: 'Mask', kind: 'select', options: [['none', 'None'], ['circle', 'Circle']] },
      { key: 'maskScale', label: 'Mask size', kind: 'slider', min: 0.3, max: 1.5, step: 0.01, showIf: e => e.mask === 'circle' },
      { key: 'maskFeatherMM', label: 'Mask feather', kind: 'number', min: 0, max: 8, step: 0.1, unit: 'mm', showIf: e => e.mask === 'circle' },
      { key: 'fx.bri', label: 'Brightness', kind: 'slider', min: -100, max: 100, step: 1 },
      { key: 'fx.con', label: 'Contrast', kind: 'slider', min: -100, max: 100, step: 1 },
      { key: 'fx.gamma', label: 'Gamma', kind: 'slider', min: 0.25, max: 3, step: 0.05 },
      { key: 'fx.levLo', label: 'Levels · black point', kind: 'slider', min: 0, max: 254, step: 1 },
      { key: 'fx.levHi', label: 'Levels · white point', kind: 'slider', min: 1, max: 255, step: 1 },
      { key: 'fx.sharpen', label: 'Sharpen', kind: 'slider', min: 0, max: 100, step: 1 },
      { key: 'fx.posterize', label: 'Posterize (0 = off)', kind: 'slider', min: 0, max: 8, step: 1 },
      { key: 'fx.gray', label: 'Grayscale', kind: 'checkbox' },
      { key: 'fx.invert', label: 'Invert', kind: 'checkbox' },
    ]
  };

  /* ---------- parametric shape ---------- */
  const SHAPE_KINDS = {
    star: { label: 'Star', params: { points: [5, 3, 20, 1], innerPct: [45, 10, 90, 1] } },
    burst: { label: 'Sunburst', params: { rays: [16, 4, 64, 1], innerPct: [55, 10, 95, 1], duty: [55, 10, 95, 1] } },
    polygon: { label: 'Polygon', params: { sides: [6, 3, 16, 1] } },
    ring: { label: 'Ring', params: { thickPct: [22, 2, 90, 1] } },
    circle: { label: 'Circle', params: {} },
    gear: { label: 'Gear', params: { teeth: [10, 4, 40, 1], depthPct: [18, 4, 40, 1], holePct: [32, 0, 80, 1] } },
    cross: { label: 'Cross', params: {} },
    heart: { label: 'Heart', params: {} },
    drop: { label: 'Drop', params: {} },
    crescent: { label: 'Crescent', params: {} },
    line: { label: 'Bar / Line', params: { thickPct: [8, 1, 100, 1] } },
  };

  function shapePath(el) {
    const s = el.sizeMM / 2;
    const p = el.params || {};
    switch (el.kind) {
      case 'star': return G.starPath(p.points || 5, s, s * (p.innerPct || 45) / 100);
      case 'burst': return G.burstPath(p.rays || 16, s, s * (p.innerPct || 55) / 100, p.duty || 55);
      case 'polygon': return G.polygonPath(p.sides || 6, s);
      case 'ring': return G.ringPath(s, s * (1 - (p.thickPct || 22) / 100));
      case 'circle': return G.circlePath(s);
      case 'gear': return G.gearPath(p.teeth || 10, s, p.depthPct || 18, p.holePct || 32);
      case 'cross': return G.crossPath('greek', el.sizeMM);
      case 'heart': return G.heartPath(el.sizeMM);
      case 'drop': return G.dropPath(el.sizeMM);
      case 'crescent': return G.crescent(s, 0.4, 0.85);
      case 'line': { const t = el.sizeMM * (p.thickPct || 8) / 200; return `M ${num(-s)} ${num(-t)} L ${num(s)} ${num(-t)} L ${num(s)} ${num(t)} L ${num(-s)} ${num(t)} Z`; }
      default: return G.circlePath(s);
    }
  }

  H.shape = {
    label: 'Shape',
    kinds: SHAPE_KINDS,
    defaults: () => ({ kind: 'star', params: { points: 5, innerPct: 45 }, sizeMM: 14, fillStyle: 'fill', strokeWMM: 0.6 }),
    render(ctx, el) {
      const p = path2d(shapePath(el));
      if (el.fillStyle === 'stroke') {
        ctx.lineWidth = el.strokeWMM || 0.6;
        ctx.stroke(p);
      } else {
        ctx.fill(p, 'evenodd');
      }
    },
    bounds(el) { return { w: el.sizeMM, h: el.sizeMM }; },
    scaleBy(el, f) { el.sizeMM = Math.max(0.5, el.sizeMM * f); },
    toSVG(el, fill) {
      if (el.fillStyle === 'stroke')
        return `<path d="${shapePath(el)}" fill="none" stroke="${fill}" stroke-width="${num(el.strokeWMM || 0.6)}"/>`;
      return `<path d="${shapePath(el)}" fill="${fill}" fill-rule="evenodd"/>`;
    },
    inspector: [
      { key: 'kind', label: 'Shape', kind: 'select', options: Object.entries(SHAPE_KINDS).map(([k, v]) => [k, v.label]) },
      { key: '_shapeparams', label: '', kind: 'shapeparams' },
      { key: 'sizeMM', label: 'Size', kind: 'number', min: 1, max: 100, step: 0.5, unit: 'mm' },
      { key: 'fillStyle', label: 'Render as', kind: 'select', options: [['fill', 'Filled'], ['stroke', 'Outline']] },
      { key: 'strokeWMM', label: 'Outline width', kind: 'number', min: 0.1, max: 5, step: 0.05, unit: 'mm', showIf: e => e.fillStyle === 'stroke' },
    ]
  };

  /* ---------- cut outline (machine path — red stroke, never engraved) ---------- */
  H.outline = {
    label: 'Cut Outline',
    defaults: () => ({ d: '', bw: 10, bh: 10, offsetMM: 2, smooth: 1, outerOnly: true, strokeWMM: 0.2 }),
    render() { /* excluded from the art layer; renderer draws it as a red overlay */ },
    bounds(el) { return { w: el.bw || 10, h: el.bh || 10 }; },
    hitTest(el, lx, ly, tol) {
      if (!el.d) return false;
      mctx.lineWidth = Math.max(0.5, tol * 2);
      try { return mctx.isPointInStroke(path2d(el.d), lx, ly); } catch (e) { return false; }
    },
    scaleBy() { /* regenerate instead — Tools → Generate Cut Outline */ },
    toSVG(el) {
      if (!el.d) return '';
      return `<path d="${el.d}" fill="none" stroke="#FF0000" stroke-width="${num(el.strokeWMM || 0.2)}"/>`;
    },
    inspector: [
      { key: '_outlinetools', label: '', kind: 'outlinetools' },
      { key: 'strokeWMM', label: 'Export stroke width', kind: 'number', min: 0.05, max: 2, step: 0.05, unit: 'mm' },
    ]
  };

  /* ---------- rectangular frame (stamp & card borders) ---------- */
  H.frame = {
    label: 'Frame',
    defaults: () => ({ wMM: 40, hMM: 20, thicknessMM: 0.8, cornerRMM: 1, style: 'solid' }),
    render(ctx, el) {
      const draw = (w, h, r, lw) => {
        if (w <= 0 || h <= 0) return;
        ctx.lineWidth = lw;
        ctx.beginPath();
        if (r > 0) ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(r, Math.min(w, h) / 2));
        else ctx.rect(-w / 2, -h / 2, w, h);
        ctx.stroke();
      };
      const t = el.thicknessMM || 0.8;
      draw(el.wMM, el.hMM, el.cornerRMM || 0, t);
      if (el.style === 'double') {
        const g = t * 2.4;
        draw(el.wMM - g * 2, el.hMM - g * 2, Math.max(0, (el.cornerRMM || 0) - g), t * 0.55);
      }
    },
    bounds(el) { return { w: el.wMM + (el.thicknessMM || 0.8), h: el.hMM + (el.thicknessMM || 0.8) }; },
    scaleBy(el, f) { el.wMM = Math.max(2, el.wMM * f); el.hMM = Math.max(2, el.hMM * f); },
    toSVG(el, fill) {
      const rect = (w, h, r, sw) => (w <= 0 || h <= 0) ? '' :
        `<rect x="${num(-w / 2)}" y="${num(-h / 2)}" width="${num(w)}" height="${num(h)}"${r > 0 ? ` rx="${num(Math.min(r, Math.min(w, h) / 2))}"` : ''} fill="none" stroke="${fill}" stroke-width="${num(sw)}"/>`;
      const t = el.thicknessMM || 0.8;
      let s = rect(el.wMM, el.hMM, el.cornerRMM || 0, t);
      if (el.style === 'double') {
        const g = t * 2.4;
        s += rect(el.wMM - g * 2, el.hMM - g * 2, Math.max(0, (el.cornerRMM || 0) - g), t * 0.55);
      }
      return s;
    },
    inspector: [
      { key: 'wMM', label: 'Width', kind: 'number', min: 2, max: 300, step: 0.5, unit: 'mm' },
      { key: 'hMM', label: 'Height', kind: 'number', min: 2, max: 300, step: 0.5, unit: 'mm' },
      { key: 'thicknessMM', label: 'Line thickness', kind: 'number', min: 0.1, max: 5, step: 0.05, unit: 'mm' },
      { key: 'cornerRMM', label: 'Corner radius', kind: 'number', min: 0, max: 20, step: 0.25, unit: 'mm' },
      { key: 'style', label: 'Style', kind: 'select', options: [['solid', 'Single line'], ['double', 'Double line']] },
    ]
  };

  /* ---------- QR code (generated fully offline by qr.js) ---------- */
  H.qr = {
    label: 'QR Code',
    defaults: () => ({ text: 'https://coinforgestudio.com', ecl: 'M', sizeMM: 16, quiet: true }),
    render(ctx, el) {
      const qr = CF.QR.cached(el.text || ' ', el.ecl || 'M');
      const s = el.sizeMM / 2;
      if (!qr) { /* too long for v10 — hollow warning frame instead of stale art */
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-s, -s, el.sizeMM, el.sizeMM);
        ctx.beginPath();
        ctx.moveTo(-s, -s); ctx.lineTo(s, s);
        ctx.moveTo(s, -s); ctx.lineTo(-s, s);
        ctx.stroke();
        return;
      }
      const quiet = el.quiet === false ? 0 : 4;
      const mod = el.sizeMM / (qr.size + quiet * 2);
      const o = -s;
      for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
          if (qr.get(x, y)) ctx.fillRect(o + (x + quiet) * mod, o + (y + quiet) * mod, mod * 1.002, mod * 1.002);
        }
      }
    },
    bounds(el) { return { w: el.sizeMM, h: el.sizeMM }; },
    scaleBy(el, f) { el.sizeMM = Math.max(4, el.sizeMM * f); },
    toSVG(el, fill) {
      const qr = CF.QR.cached(el.text || ' ', el.ecl || 'M');
      if (!qr) return '';
      const quiet = el.quiet === false ? 0 : 4;
      const mod = el.sizeMM / (qr.size + quiet * 2);
      const o = -el.sizeMM / 2;
      let s = `<g fill="${fill}">`;
      for (let y = 0; y < qr.size; y++) {
        let x = 0;
        while (x < qr.size) { /* merge horizontal runs to keep the SVG small */
          if (!qr.get(x, y)) { x++; continue; }
          let x2 = x;
          while (x2 < qr.size && qr.get(x2, y)) x2++;
          s += `<rect x="${num(o + (x + quiet) * mod)}" y="${num(o + (y + quiet) * mod)}" width="${num((x2 - x) * mod)}" height="${num(mod)}"/>`;
          x = x2;
        }
      }
      return s + '</g>';
    },
    inspector: [
      { key: 'text', label: 'Content (URL / text)', kind: 'textarea' },
      { key: 'sizeMM', label: 'Size', kind: 'number', min: 6, max: 100, step: 0.5, unit: 'mm' },
      { key: 'ecl', label: 'Error correction', kind: 'select', options: [['L', 'L — 7% (densest)'], ['M', 'M — 15% (default)'], ['Q', 'Q — 25%'], ['H', 'H — 30% (engraving-safe)']] },
      { key: 'quiet', label: 'Quiet zone (keep on for scanning)', kind: 'checkbox' },
    ]
  };

  /* ============================================================
     Public API
     ============================================================ */
  CF.Elements = {
    handlers: H,

    create(type, overrides) {
      const h = H[type];
      if (!h) throw new Error('unknown element type ' + type);
      return Object.assign({
        id: U.uid(), type, name: h.label, visible: true, locked: false,
        x: 0, y: 0, rotation: 0, shade: 0, opacity: 1
      }, h.defaults(), overrides || {});
    },

    render(ctx, el, env) {
      if (!el.visible) return;
      const h = H[el.type];
      if (!h) return;
      ctx.save();
      ctx.translate(el.x, el.y);
      if (el.rotation) ctx.rotate(U.deg2rad(el.rotation));
      ctx.globalAlpha *= (el.opacity === undefined ? 1 : el.opacity);
      ctx.fillStyle = U.shadeColor(el.shade || 0);
      ctx.strokeStyle = U.shadeColor(el.shade || 0);
      try { h.render(ctx, el, env || {}); }
      catch (e) { console.error('render error', el.type, e); }
      ctx.restore();
    },

    /* fillOverride: flatten to a single color (laser-layer SVG export) */
    toSVG(el, fillOverride) {
      if (!el.visible) return '';
      const h = H[el.type];
      if (!h) return '';
      const fill = fillOverride || U.shadeColor(el.shade || 0);
      let inner = '';
      try { inner = h.toSVG(el, fill, !!fillOverride); } catch (e) { console.error('svg error', el.type, e); }
      const op = (el.opacity !== undefined && el.opacity < 1) ? ` opacity="${num(el.opacity)}"` : '';
      return `<g transform="translate(${num(el.x)} ${num(el.y)})${el.rotation ? ` rotate(${num(el.rotation)})` : ''}"${op}>${inner}</g>`;
    },

    boundsOf(el) {
      const h = H[el.type];
      return h ? h.bounds(el) : { w: 10, h: 10 };
    },

    /* point in element? lx/ly are doc-space mm */
    hitTest(el, px, py, tolMM) {
      if (!el.visible || el.locked) return false;
      const h = H[el.type];
      if (!h) return false;
      /* to local space */
      const dx = px - el.x, dy = py - el.y;
      const a = -U.deg2rad(el.rotation || 0);
      const lx = dx * Math.cos(a) - dy * Math.sin(a);
      const ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (h.hitTest) return h.hitTest(el, lx, ly, tolMM);
      const b = h.bounds(el);
      return Math.abs(lx) <= b.w / 2 + tolMM && Math.abs(ly) <= b.h / 2 + tolMM;
    },

    scaleBy(el, f) {
      const h = H[el.type];
      if (h && h.scaleBy) h.scaleBy(el, f);
    },

    isRingLike(el) {
      return (el.type === 'arctext' || el.type === 'symbolring' || el.type === 'ringband') && el.lockCenter !== false;
    },

    /* radius property used when dragging a ring-like element */
    getRadius(el) {
      return el.type === 'ringband' || el.type === 'symbolring' ? el.radiusMM : el.type === 'arctext' ? el.radiusMM : null;
    },
    setRadius(el, r) {
      if (el.type === 'ringband' || el.type === 'symbolring' || el.type === 'arctext') el.radiusMM = Math.max(1, r);
    },

    invalidateImage(id) { imgCache.delete(id); },
    processedCanvas,
  };
})();