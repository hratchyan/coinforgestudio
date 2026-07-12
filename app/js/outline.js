/* ============================================================
   CoinForge Studio — outline.js
   Cut-outline generator: rasterizes the visible art, dilates it
   by the requested offset (exact Euclidean distance transform),
   traces the contour (marching squares), simplifies (Douglas–
   Peucker) and smooths (Chaikin). Result is a stroke-only
   'outline' element that exports as a red cut layer.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util, S = () => CF.store;

  /* ---------- exact squared EDT (Felzenszwalb & Huttenlocher) ---------- */
  function edt1d(f, n, d, v, z) {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  }

  /* squared distance to nearest "on" pixel */
  function edt(mask, w, h) {
    const INF = 1e12;
    const dist = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) dist[i] = mask[i] ? 0 : INF;
    const size = Math.max(w, h);
    const f = new Float64Array(size), d = new Float64Array(size);
    const v = new Int32Array(size), z = new Float64Array(size + 1);
    for (let x = 0; x < w; x++) {           /* columns */
      for (let y = 0; y < h; y++) f[y] = dist[y * w + x];
      edt1d(f, h, d, v, z);
      for (let y = 0; y < h; y++) dist[y * w + x] = d[y];
    }
    for (let y = 0; y < h; y++) {           /* rows */
      const row = y * w;
      for (let x = 0; x < w; x++) f[x] = dist[row + x];
      edt1d(f, w, d, v, z);
      for (let x = 0; x < w; x++) dist[row + x] = d[x];
    }
    return dist;
  }

  /* ---------- marching squares with segment chaining ---------- */
  function traceContours(mask, w, h) {
    /* sample with 1px virtual empty border so edge blobs close */
    const s = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : mask[y * w + x];
    const key = (x, y) => (x * 2 + 1) * 100000 + (y * 2 + 1); /* points at half-steps */
    const segs = new Map(); /* startKey -> [ {ex, ey} , ... ] */

    const addSeg = (x1, y1, x2, y2) => {
      const k = key(x1, y1);
      let arr = segs.get(k);
      if (!arr) { arr = []; segs.set(k, arr); }
      arr.push({ x: x2, y: y2 });
    };

    for (let y = -1; y < h; y++) {
      for (let x = -1; x < w; x++) {
        const tl = s(x, y), tr = s(x + 1, y), br = s(x + 1, y + 1), bl = s(x, y + 1);
        const c = (tl << 3) | (tr << 2) | (br << 1) | bl;
        if (c === 0 || c === 15) continue;
        const T = [x + 0.5, y], R = [x + 1, y + 0.5], B = [x + 0.5, y + 1], L = [x, y + 0.5];
        switch (c) {
          case 1: addSeg(L[0], L[1], B[0], B[1]); break;
          case 2: addSeg(B[0], B[1], R[0], R[1]); break;
          case 3: addSeg(L[0], L[1], R[0], R[1]); break;
          case 4: addSeg(R[0], R[1], T[0], T[1]); break;
          case 5: addSeg(R[0], R[1], B[0], B[1]); addSeg(L[0], L[1], T[0], T[1]); break;
          case 6: addSeg(B[0], B[1], T[0], T[1]); break;
          case 7: addSeg(L[0], L[1], T[0], T[1]); break;
          case 8: addSeg(T[0], T[1], L[0], L[1]); break;
          case 9: addSeg(T[0], T[1], B[0], B[1]); break;
          case 10: addSeg(T[0], T[1], R[0], R[1]); addSeg(B[0], B[1], L[0], L[1]); break;
          case 11: addSeg(T[0], T[1], R[0], R[1]); break;
          case 12: addSeg(R[0], R[1], L[0], L[1]); break;
          case 13: addSeg(R[0], R[1], B[0], B[1]); break;
          case 14: addSeg(B[0], B[1], L[0], L[1]); break;
        }
      }
    }

    const loops = [];
    for (const [startK, arr] of segs) {
      while (arr.length) {
        const first = arr.pop();
        /* reconstruct the start point from the key */
        const sx = (Math.floor(startK / 100000) - 1) / 2, sy = ((startK % 100000) - 1) / 2;
        const pts = [[sx, sy], [first.x, first.y]];
        let guard = w * h * 4;
        while (guard-- > 0) {
          const cur = pts[pts.length - 1];
          if (Math.abs(cur[0] - sx) < 1e-6 && Math.abs(cur[1] - sy) < 1e-6) { pts.pop(); break; }
          const nk = key(cur[0], cur[1]);
          const nxtArr = segs.get(nk);
          if (!nxtArr || !nxtArr.length) break;
          const nxt = nxtArr.pop();
          pts.push([nxt.x, nxt.y]);
        }
        if (pts.length >= 3) loops.push(pts);
      }
    }
    return loops;
  }

  function signedArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
    }
    return a / 2;
  }

  /* ---------- simplify + smooth ---------- */
  function dpSimplify(pts, eps) {
    if (pts.length < 5) return pts;
    const keep = new Uint8Array(pts.length);
    const seg = (i0, i1) => {
      if (i1 <= i0 + 1) return;
      const [ax, ay] = pts[i0], [bx, by] = pts[i1];
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1e-9;
      let maxD = -1, maxI = -1;
      for (let i = i0 + 1; i < i1; i++) {
        const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
        if (d > maxD) { maxD = d; maxI = i; }
      }
      if (maxD > eps) { keep[maxI] = 1; seg(i0, maxI); seg(maxI, i1); }
    };
    const mid = Math.floor(pts.length / 2);
    keep[0] = keep[mid] = 1;
    seg(0, mid);
    seg(mid, pts.length - 1);
    keep[pts.length - 1] = 1;
    const out = [];
    for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
    return out;
  }

  function chaikin(pts, iters) {
    let p = pts;
    for (let k = 0; k < iters; k++) {
      const out = [];
      for (let i = 0; i < p.length; i++) {
        const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
        out.push([0.75 * x1 + 0.25 * x2, 0.75 * y1 + 0.25 * y2]);
        out.push([0.25 * x1 + 0.75 * x2, 0.25 * y1 + 0.75 * y2]);
      }
      p = out;
    }
    return p;
  }

  /* ---------- public: generate outline path from the current doc ---------- */
  const O = {};

  O.generate = function (doc, opts = {}) {
    const offsetMM = opts.offsetMM === undefined ? 2 : opts.offsetMM;
    const smooth = opts.smooth === undefined ? 1 : opts.smooth;
    const outerOnly = opts.outerOnly !== false;
    const pxPerMM = opts.pxPerMM || 8;

    /* art without any existing outline elements */
    const artDoc = Object.assign({}, doc, {
      elements: doc.elements.filter(e => e.type !== 'outline' && e.visible)
    });
    if (!artDoc.elements.length) return null;

    const art = CF.renderer.renderArt(artDoc, pxPerMM, 1.5);
    const w = art.width, h = art.height;
    const data = art.getContext('2d').getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    let any = false;
    for (let p = 0; p < w * h; p++) {
      if (data[p * 4 + 3] > 24) { mask[p] = 1; any = true; }
    }
    if (!any) return null;

    let dilated = mask;
    if (offsetMM > 0.01) {
      const r2 = Math.pow(offsetMM * pxPerMM, 2);
      const dist = edt(mask, w, h);
      dilated = new Uint8Array(w * h);
      for (let p = 0; p < w * h; p++) dilated[p] = dist[p] <= r2 ? 1 : 0;
    }

    let loops = traceContours(dilated, w, h);
    if (!loops.length) return null;

    /* drop specks, classify solids vs holes by winding sign of the biggest loop */
    const minArea = Math.pow(pxPerMM * 0.8, 2);
    loops = loops.filter(l => Math.abs(signedArea(l)) > minArea);
    let big = loops[0], bigA = 0;
    for (const l of loops) {
      const a = Math.abs(signedArea(l));
      if (a > bigA) { bigA = a; big = l; }
    }
    const solidSign = Math.sign(signedArea(big));
    if (outerOnly) loops = loops.filter(l => Math.sign(signedArea(l)) === solidSign);

    const cx = w / 2, cy = h / 2;
    let d = '';
    let bw = 0, bh = 0;
    for (let l of loops) {
      l = dpSimplify(l, 0.75);
      if (smooth > 0) l = chaikin(l, Math.min(3, Math.round(smooth)));
      l = dpSimplify(l, 0.35);
      d += l.map(([x, y], i) => {
        const mx = (x - cx) / pxPerMM, my = (y - cy) / pxPerMM;
        bw = Math.max(bw, Math.abs(mx) * 2);
        bh = Math.max(bh, Math.abs(my) * 2);
        return `${i ? 'L' : 'M'} ${U.num(mx)} ${U.num(my)}`;
      }).join(' ') + ' Z ';
    }
    return { d: d.trim(), loops: loops.length, bw, bh };
  };

  /* replace-or-create the outline element on the doc */
  O.applyToDoc = function (result, opts) {
    S().mutate(dd => {
      let el = dd.elements.find(e => e.type === 'outline');
      if (!el) {
        el = CF.Elements.create('outline', {});
        dd.elements.push(el);
      }
      el.d = result.d;
      el.bw = result.bw;
      el.bh = result.bh;
      el.offsetMM = opts.offsetMM;
      el.smooth = opts.smooth;
      el.outerOnly = opts.outerOnly;
      el.name = 'Cut outline';
      el.x = 0; el.y = 0; el.rotation = 0;
    });
  };

  /* ---------- dialog ---------- */
  O.openModal = function () {
    const doc = S().doc;
    const existing = doc.elements.find(e => e.type === 'outline');
    const st = {
      offsetMM: existing ? existing.offsetMM : 2,
      smooth: existing ? existing.smooth : 1,
      outerOnly: existing ? existing.outerOnly !== false : true,
    };
    let result = null;

    const modal = CF.ui.modal({ title: 'Generate Cut Outline', width: '760px', modal: true });
    const grid = U.el('div', { class: 'cf-export-grid' });
    const left = U.el('div');
    const right = U.el('div');
    grid.appendChild(left);
    grid.appendChild(right);
    modal.body.appendChild(grid);

    const preview = U.el('canvas', { class: 'cf-export-preview' });
    const info = U.el('div', { class: 'cf-hint' }, '…');
    right.appendChild(preview);
    right.appendChild(info);

    const slider = (label, key, min, max, step) => {
      const inp = U.el('input', { class: 'cf-slider', type: 'range', min, max, step, value: st[key] });
      const val = U.el('span', { class: 'cf-slider-val' }, String(st[key]));
      inp.addEventListener('input', () => { val.textContent = inp.value; });
      inp.addEventListener('change', () => { st[key] = parseFloat(inp.value); refresh(); });
      left.appendChild(U.el('div', { class: 'cf-field' },
        U.el('label', { class: 'cf-field-label' }, label),
        U.el('div', { class: 'cf-slider-wrap' }, inp, val)));
    };
    slider('Offset from art (mm)', 'offsetMM', 0, 10, 0.25);
    slider('Corner smoothing', 'smooth', 0, 3, 1);

    const oo = U.el('input', { type: 'checkbox' });
    oo.checked = st.outerOnly;
    oo.addEventListener('change', () => { st.outerOnly = oo.checked; refresh(); });
    left.appendChild(U.el('div', { class: 'cf-field cf-field-check' },
      U.el('label', { class: 'cf-check-label' }, oo, ' Outer silhouette only (no holes)')));

    left.appendChild(U.el('p', { class: 'cf-hint' },
      'The outline hugs everything currently visible. Raise the offset to merge nearby parts (e.g. a star ring + center art) into one continuous cut path. The result is a red stroke layer — it never engraves, and exports separately or as the red layer in SVG.'));

    const refresh = U.debounce(() => {
      result = O.generate(doc, st);
      const side = 340;
      preview.width = side; preview.height = side;
      const ctx = preview.getContext('2d');
      ctx.fillStyle = '#14171c';
      ctx.fillRect(0, 0, side, side);
      if (!result) { info.textContent = 'Nothing visible to outline.'; return; }
      /* ghost art + outline */
      const artDoc = Object.assign({}, doc, { elements: doc.elements.filter(e => e.type !== 'outline' && e.visible) });
      const pxPerMM = side / (CF.substrate.maxDimMM(doc) * 1.5);
      const art = CF.renderer.renderArt(artDoc, pxPerMM, 1.5);
      ctx.globalAlpha = 0.45;
      ctx.drawImage(art, side / 2 - art.width / 2, side / 2 - art.height / 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff4545';
      ctx.lineWidth = 1.6;
      ctx.save();
      ctx.translate(side / 2, side / 2);
      ctx.scale(pxPerMM, pxPerMM);
      ctx.lineWidth = 1.6 / pxPerMM;
      ctx.stroke(new Path2D(result.d));
      ctx.restore();
      /* blank edge reference */
      ctx.strokeStyle = 'rgba(94,197,255,0.4)';
      ctx.setLineDash([4, 4]);
      CF.substrate.trace(ctx, doc, side / 2, side / 2, pxPerMM);
      ctx.stroke();
      ctx.setLineDash([]);
      info.textContent = `${result.loops} path${result.loops === 1 ? '' : 's'} · spans ${U.round(result.bw, 1)} × ${U.round(result.bh, 1)} mm`;
    }, 120);

    modal.foot.appendChild(U.el('div', { class: 'cf-foot-spread' },
      (() => { const b = U.el('button', { class: 'cf-btn' }, 'Cancel'); b.addEventListener('click', () => modal.close()); return b; })(),
      (() => {
        const b = U.el('button', { class: 'cf-btn primary' }, existing ? 'Update outline' : 'Add to design');
        b.addEventListener('click', () => {
          if (!result) { CF.ui.toast('Nothing to outline', 2200, 'error'); return; }
          O.applyToDoc(result, st);
          modal.close();
          CF.ui.toast('Cut outline ' + (existing ? 'updated' : 'added') + ' — red layer');
        });
        return b;
      })()
    ));
    modal.root.querySelector('.cf-modal').appendChild(modal.foot);
    refresh();
  };

  CF.outline = O;
})();