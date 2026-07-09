/* ============================================================
   CoinForge Studio — imagetools.js
   Pixel-level image processing for laser prep and background
   removal. Everything works on canvases / ImageData.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const { makeCanvas, clamp } = CF.util;
  const I = {};

  I.clone = (src) => {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    ctx.drawImage(src, 0, 0);
    return canvas;
  };

  /* ---------- tone adjustments (fx: object stored on image elements) ----------
     fx = { gray, invert, bri (-100..100), con (-100..100), gamma (0.2..3),
            levLo (0..255), levHi (0..255), posterize (0|2..8), sharpen (0..100) } */
  I.applyFx = (srcCanvas, fx) => {
    if (!fx) return srcCanvas;
    const { canvas, ctx } = makeCanvas(srcCanvas.width, srcCanvas.height);
    ctx.drawImage(srcCanvas, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    const n = d.length;

    const bri = (fx.bri || 0) * 1.275;
    const con = clamp(fx.con || 0, -100, 100);
    const cf = (259 * (con + 255)) / (255 * (259 - con));
    const gamma = fx.gamma || 1;
    const invGamma = 1 / gamma;
    const lo = fx.levLo || 0, hi = fx.levHi === undefined ? 255 : fx.levHi;
    const levRange = Math.max(1, hi - lo);
    const post = fx.posterize || 0;
    const doGray = fx.gray !== false;
    const doInvert = !!fx.invert;

    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      let x = v;
      x = cf * (x - 128) + 128 + bri;
      x = clamp(x, 0, 255);
      x = 255 * Math.pow(x / 255, invGamma);
      x = (x - lo) * 255 / levRange;
      x = clamp(x, 0, 255);
      if (post >= 2) x = Math.round(Math.round(x / 255 * (post - 1)) / (post - 1) * 255);
      if (doInvert) x = 255 - x;
      lut[v] = x;
    }

    for (let i = 0; i < n; i += 4) {
      if (doGray) {
        const y = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
        const v = lut[y];
        d[i] = d[i + 1] = d[i + 2] = v;
      } else {
        d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]];
      }
    }
    ctx.putImageData(img, 0, 0);

    if (fx.sharpen > 0) return I.unsharp(canvas, fx.sharpen / 100);
    return canvas;
  };

  I.unsharp = (src, amount) => {
    const w = src.width, h = src.height;
    const { canvas: blurC, ctx: blurCtx } = makeCanvas(w, h);
    blurCtx.filter = `blur(${Math.max(1, Math.round(Math.min(w, h) / 300))}px)`;
    blurCtx.drawImage(src, 0, 0);
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const blur = blurCtx.getImageData(0, 0, w, h);
    const d = img.data, b = blur.data;
    const k = amount * 1.6;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(d[i] + k * (d[i] - b[i]), 0, 255);
      d[i + 1] = clamp(d[i + 1] + k * (d[i + 1] - b[i + 1]), 0, 255);
      d[i + 2] = clamp(d[i + 2] + k * (d[i + 2] - b[i + 2]), 0, 255);
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  };

  /* ---------- dithering (operates in place on ImageData, assumes grayscale) ---------- */
  I.dither = (imgData, method, threshold = 128) => {
    const d = imgData.data, w = imgData.width, h = imgData.height;
    const lum = new Float32Array(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) lum[p] = d[i];

    const out = (p, v) => { const i = p * 4; d[i] = d[i + 1] = d[i + 2] = v; };

    if (method === 'threshold') {
      for (let p = 0; p < lum.length; p++) out(p, lum[p] < threshold ? 0 : 255);
      return imgData;
    }
    if (method === 'ordered') {
      const M = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = y * w + x;
        out(p, lum[p] / 255 * 64 > M[y % 8][x % 8] + 0.5 ? 255 : 0);
      }
      return imgData;
    }
    /* error diffusion */
    const fs = method !== 'atkinson';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const oldv = lum[p];
        const newv = oldv < 128 ? 0 : 255;
        out(p, newv);
        const err = oldv - newv;
        if (fs) { /* Floyd–Steinberg */
          if (x + 1 < w) lum[p + 1] += err * 7 / 16;
          if (y + 1 < h) {
            if (x > 0) lum[p + w - 1] += err * 3 / 16;
            lum[p + w] += err * 5 / 16;
            if (x + 1 < w) lum[p + w + 1] += err * 1 / 16;
          }
        } else { /* Atkinson */
          const e = err / 8;
          if (x + 1 < w) lum[p + 1] += e;
          if (x + 2 < w) lum[p + 2] += e;
          if (y + 1 < h) {
            if (x > 0) lum[p + w - 1] += e;
            lum[p + w] += e;
            if (x + 1 < w) lum[p + w + 1] += e;
          }
          if (y + 2 < h) lum[p + 2 * w] += e;
        }
      }
    }
    return imgData;
  };

  /* ================= background removal =================
     A mask is a Float32Array (w*h) with 1 = keep, 0 = remove. */

  I.getData = (canvas) => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);

  const colorDist2 = (d, i, r, g, b) => {
    const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
    /* perceptual-ish weights */
    return 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
  };

  /* dominant border color(s) via coarse histogram of edge pixels */
  I.borderColors = (imgData, maxColors = 2) => {
    const { data: d, width: w, height: h } = imgData;
    const hist = new Map();
    const bump = (i) => {
      const key = (d[i] >> 4 << 8) | (d[i + 1] >> 4 << 4) | (d[i + 2] >> 4);
      const e = hist.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
      hist.set(key, e);
    };
    for (let x = 0; x < w; x++) { bump((x) * 4); bump(((h - 1) * w + x) * 4); }
    for (let y = 0; y < h; y++) { bump((y * w) * 4); bump((y * w + w - 1) * 4); }
    const top = [...hist.values()].sort((a, b) => b.n - a.n).slice(0, maxColors);
    const total = 2 * (w + h);
    return top.filter(e => e.n > total * 0.05).map(e => ({ r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, frac: e.n / total }));
  };

  /* flood fill from all border pixels matching bg colors within tolerance */
  I.floodMask = (imgData, bgColors, tolerance) => {
    const { data: d, width: w, height: h } = imgData;
    const mask = new Float32Array(w * h).fill(1);
    const tol2 = tolerance * tolerance * 3;
    const match = (p) => {
      const i = p * 4;
      if (d[i + 3] < 8) return true; /* already transparent */
      for (const c of bgColors) if (colorDist2(d, i, c.r, c.g, c.b) < tol2) return true;
      return false;
    };
    const stack = [];
    const seen = new Uint8Array(w * h);
    const push = (p) => { if (!seen[p] && match(p)) { seen[p] = 1; mask[p] = 0; stack.push(p); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }
    return mask;
  };

  /* global color-key: remove everywhere the color appears (not just connected) */
  I.colorKeyMask = (imgData, color, tolerance) => {
    const { data: d, width: w, height: h } = imgData;
    const mask = new Float32Array(w * h).fill(1);
    const tol2 = tolerance * tolerance * 3;
    for (let p = 0; p < w * h; p++) {
      if (colorDist2(d, p * 4, color.r, color.g, color.b) < tol2) mask[p] = 0;
    }
    return mask;
  };

  /* luminance key: 'white' removes bright, 'black' removes dark */
  I.lumaKeyMask = (imgData, mode, threshold) => {
    const { data: d, width: w, height: h } = imgData;
    const mask = new Float32Array(w * h).fill(1);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (mode === 'white' ? y >= threshold : y <= threshold) mask[p] = 0;
    }
    return mask;
  };

  /* remove small isolated islands (keep/remove speckles) */
  I.despeckle = (mask, w, h, minArea) => {
    const labels = new Int32Array(w * h).fill(-1);
    let next = 0;
    const sizes = [];
    const stack = [];
    for (let p0 = 0; p0 < w * h; p0++) {
      if (labels[p0] >= 0) continue;
      const val = mask[p0] > 0.5 ? 1 : 0;
      const id = next++;
      labels[p0] = id;
      let size = 0;
      stack.push(p0);
      while (stack.length) {
        const p = stack.pop();
        size++;
        const x = p % w, y = (p / w) | 0;
        const nb = [];
        if (x > 0) nb.push(p - 1);
        if (x < w - 1) nb.push(p + 1);
        if (y > 0) nb.push(p - w);
        if (y < h - 1) nb.push(p + w);
        for (const q of nb) {
          if (labels[q] < 0 && (mask[q] > 0.5 ? 1 : 0) === val) { labels[q] = id; stack.push(q); }
        }
      }
      sizes[id] = { size, val };
    }
    for (let p = 0; p < w * h; p++) {
      const s = sizes[labels[p]];
      if (s.size < minArea) mask[p] = s.val ? 0 : 1;
    }
    return mask;
  };

  /* soften mask edges with a box blur (radius px) */
  I.featherMask = (mask, w, h, radius) => {
    if (radius <= 0) return mask;
    const r = Math.round(radius);
    const tmp = new Float32Array(w * h);
    /* horizontal */
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += mask[row + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / (2 * r + 1);
        const xO = clamp(x - r, 0, w - 1), xI = clamp(x + r + 1, 0, w - 1);
        acc += mask[row + xI] - mask[row + xO];
      }
    }
    /* vertical */
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        mask[y * w + x] = acc / (2 * r + 1);
        const yO = clamp(y - r, 0, h - 1), yI = clamp(y + r + 1, 0, h - 1);
        acc += tmp[yI * w + x] - tmp[yO * w + x];
      }
    }
    return mask;
  };

  I.applyMask = (srcCanvas, mask) => {
    const w = srcCanvas.width, h = srcCanvas.height;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.drawImage(srcCanvas, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let p = 0; p < w * h; p++) {
      d[p * 4 + 3] = Math.round(d[p * 4 + 3] * clamp(mask[p], 0, 1));
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  };

  /* bounding box of alpha > threshold; null if empty */
  I.alphaBounds = (canvas, thresh = 12) => {
    const { data: d, width: w, height: h } = I.getData(canvas);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > thresh) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };

  I.crop = (canvas, box, padPct = 0.02) => {
    const pad = Math.round(Math.max(box.w, box.h) * padPct);
    const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
    const w = Math.min(canvas.width - x, box.w + 2 * pad), h = Math.min(canvas.height - y, box.h + 2 * pad);
    const { canvas: out, ctx } = makeCanvas(w, h);
    ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    return out;
  };

  /* one-call smart auto removal: border color detect → flood → despeckle → feather */
  I.autoRemove = (srcCanvas, opts = {}) => {
    const tolerance = opts.tolerance === undefined ? 38 : opts.tolerance;
    const img = I.getData(srcCanvas);
    const colors = I.borderColors(img, 2);
    if (!colors.length) return { mask: new Float32Array(srcCanvas.width * srcCanvas.height).fill(1), colors: [] };
    let mask = I.floodMask(img, colors, tolerance);
    if (opts.global) {
      const gm = I.colorKeyMask(img, colors[0], tolerance * 0.8);
      for (let p = 0; p < mask.length; p++) mask[p] = Math.min(mask[p], gm[p]);
    }
    const minArea = Math.round(srcCanvas.width * srcCanvas.height * 0.0004);
    I.despeckle(mask, srcCanvas.width, srcCanvas.height, Math.max(12, minArea));
    if (opts.feather !== 0) I.featherMask(mask, srcCanvas.width, srcCanvas.height, opts.feather || 1.2);
    return { mask, colors };
  };

  CF.Img = I;
})();