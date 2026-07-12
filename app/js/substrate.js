/* ============================================================
   CoinForge Studio — substrate.js
   The physical blank a design sits on. Canonical model:
     doc.substrate = { kind:'circle', diameterMM, marginMM }
                   | { kind:'rect',    wMM, hMM, marginMM }
                   | { kind:'rounded', wMM, hMM, cornerRMM, marginMM }
                   | { kind:'shape',   shape, wMM, hMM, marginMM }
     doc.material  = 'metal' | 'rubber'
   Circle docs also carry a legacy `doc.coin` mirror so files stay
   readable by pre-1.7 clients and legacy reads keep working.
   Round-only tools gate on `radiusMM(doc) !== null`.
   Shaped blanks (tokens) come from the SHAPES registry below —
   one normalized definition feeds both canvas tracing and the
   SVG export clip path.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const DEFAULT_D = 44.45, DEFAULT_MARGIN = 2;

  /* ---------- token shape registry (unit box −0.5…0.5, y down) ----------
     poly: straight-edge vertex list · cmds: M/L/C command list ·
     ellipse/bone: parametric specials. defaultMM = natural preset size. */
  const OCT = 0.2071; /* regular-octagon corner cut in the unit box */
  const SHAPES = {
    hexagon: {
      label: 'Hexagon', defaultMM: [38.1, 33],
      poly: [[-0.5, 0], [-0.25, -0.5], [0.25, -0.5], [0.5, 0], [0.25, 0.5], [-0.25, 0.5]]
    },
    octagon: {
      label: 'Octagon', defaultMM: [40, 40],
      poly: [[-OCT, -0.5], [OCT, -0.5], [0.5, -OCT], [0.5, OCT], [OCT, 0.5], [-OCT, 0.5], [-0.5, OCT], [-0.5, -OCT]]
    },
    oval: { label: 'Oval', defaultMM: [50, 35], ellipse: true },
    shield: {
      label: 'Shield', defaultMM: [45, 55],
      cmds: [['M', -0.5, -0.5], ['L', 0.5, -0.5], ['C', 0.5, -0.08, 0.42, 0.18, 0, 0.5], ['C', -0.42, 0.18, -0.5, -0.08, -0.5, -0.5], ['Z']]
    },
    heart: {
      label: 'Heart', defaultMM: [45, 40],
      cmds: [['M', 0, 0.5], ['C', -0.55, 0.12, -0.52, -0.2, -0.35, -0.35], ['C', -0.18, -0.5, -0.02, -0.42, 0, -0.22],
        ['C', 0.02, -0.42, 0.18, -0.5, 0.35, -0.35], ['C', 0.52, -0.2, 0.55, 0.12, 0, 0.5], ['Z']]
    },
    bone: { label: 'Dog Bone', defaultMM: [70, 22], bone: true },
  };

  /* dog bone: elliptical lobes at each end joined by a bar. Lobes fill the
     box height (ry 0.5) and are circular at the natural ~70×22 aspect
     (rx 0.157); the visible bar is ~40% of the width. */
  function boneGeom() {
    const rx = 0.157, ry = 0.5, b = 0.22, c = 0.5 - rx;
    return { c, rx, ry, b, t: Math.asin(b / ry) };
  }

  function traceShapePath(ctx, shapeId, cx, cy, wPx, hPx) {
    const sh = SHAPES[shapeId] || SHAPES.hexagon;
    if (sh.ellipse) {
      ctx.ellipse(cx, cy, wPx / 2, hPx / 2, 0, 0, Math.PI * 2);
      return;
    }
    if (sh.bone) {
      const { c, rx, ry, b, t } = boneGeom();
      /* build in unit space under a baked transform; path survives restore() */
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(wPx, hPx);
      /* around the left lobe the long way, along the bar, around the right */
      ctx.ellipse(-c, 0, rx, ry, 0, -t, t, true);
      ctx.lineTo(c - rx * Math.cos(t), b);
      ctx.ellipse(c, 0, rx, ry, 0, Math.PI - t, t - Math.PI, true);
      ctx.closePath();
      ctx.restore();
      return;
    }
    const pts = sh.poly;
    if (pts) {
      pts.forEach(([x, y], i) => i ? ctx.lineTo(cx + x * wPx, cy + y * hPx) : ctx.moveTo(cx + x * wPx, cy + y * hPx));
      ctx.closePath();
      return;
    }
    for (const cmd of sh.cmds) {
      const [op, ...n] = cmd;
      if (op === 'M') ctx.moveTo(cx + n[0] * wPx, cy + n[1] * hPx);
      else if (op === 'L') ctx.lineTo(cx + n[0] * wPx, cy + n[1] * hPx);
      else if (op === 'C') ctx.bezierCurveTo(cx + n[0] * wPx, cy + n[1] * hPx, cx + n[2] * wPx, cy + n[3] * hPx, cx + n[4] * wPx, cy + n[5] * hPx);
      else if (op === 'Z') ctx.closePath();
    }
  }

  /* same geometry as an SVG path string in mm, centered on the origin */
  function svgShapePath(shapeId, wMM, hMM) {
    const N = v => CF.util.num(v);
    const sh = SHAPES[shapeId] || SHAPES.hexagon;
    if (sh.ellipse) {
      const rx = wMM / 2, ry = hMM / 2;
      return `M ${N(-rx)} 0 A ${N(rx)} ${N(ry)} 0 1 0 ${N(rx)} 0 A ${N(rx)} ${N(ry)} 0 1 0 ${N(-rx)} 0 Z`;
    }
    if (sh.bone) {
      const { c, rx, ry, b, t } = boneGeom();
      const RX = rx * wMM, RY = ry * hMM;
      const xa = (-c + rx * Math.cos(t)) * wMM, xb = (c - rx * Math.cos(t)) * wMM;
      const yb = b * hMM;
      /* mirror of the canvas construction: two long lobe arcs + bar edges */
      return `M ${N(xa)} ${N(-yb)} A ${N(RX)} ${N(RY)} 0 1 0 ${N(xa)} ${N(yb)} ` +
        `L ${N(xb)} ${N(yb)} A ${N(RX)} ${N(RY)} 0 1 0 ${N(xb)} ${N(-yb)} Z`;
    }
    if (sh.poly) {
      return sh.poly.map(([x, y], i) => `${i ? 'L' : 'M'} ${N(x * wMM)} ${N(y * hMM)}`).join(' ') + ' Z';
    }
    return sh.cmds.map(cmd => {
      const [op, ...n] = cmd;
      if (op === 'Z') return 'Z';
      const s = n.map((v, i) => N(v * (i % 2 === 0 ? wMM : hMM))).join(' ');
      return `${op} ${s}`;
    }).join(' ');
  }

  /* legacy coin → substrate; copies marginMM verbatim (no defaulting)
     so migrated docs behave exactly as they did */
  function fromCoin(coin) {
    const c = coin || { diameterMM: DEFAULT_D, marginMM: DEFAULT_MARGIN };
    return { kind: 'circle', diameterMM: c.diameterMM, marginMM: c.marginMM };
  }

  /* Migrate a doc in place and keep the legacy mirror in sync.
     Runs at the store's mutation choke points — must stay cheap and
     idempotent, and must write `coin` keys in a fixed order so
     serialized docs are stable across repeated norms. */
  function norm(doc) {
    if (!doc) return doc;
    if (!doc.substrate) doc.substrate = fromCoin(doc.coin);
    if (!doc.material) doc.material = 'metal';
    /* non-circle docs are a v1.7 format — older clients would misread them */
    if (doc.substrate.kind !== 'circle' && (doc.version || 0) < 3) doc.version = 3;
    if (doc.substrate.kind === 'circle') {
      doc.coin = { diameterMM: doc.substrate.diameterMM, marginMM: doc.substrate.marginMM };
    } else if (doc.coin) {
      delete doc.coin;
    }
    return doc;
  }

  /* read accessor — never mutates; tolerates docs that bypassed setDoc
     (template/preset preview docs go straight to the renderer) */
  function get(doc) { return doc.substrate || fromCoin(doc.coin); }

  const kind = (doc) => get(doc).kind;

  function sizeMM(doc) {
    const s = get(doc);
    return s.kind === 'circle' ? { w: s.diameterMM, h: s.diameterMM } : { w: s.wMM, h: s.hMM };
  }

  function maxDimMM(doc) {
    const s = get(doc);
    return s.kind === 'circle' ? s.diameterMM : Math.max(s.wMM, s.hMM);
  }

  /* null for non-circle substrates — the gate for round-only tools */
  function radiusMM(doc) {
    const s = get(doc);
    return s.kind === 'circle' ? s.diameterMM / 2 : null;
  }

  const marginMM = (doc) => get(doc).marginMM;

  /* beginPath + substrate outline in px space centered on (cx, cy).
     shrink is multiplicative, insetMM absolute (both about the center).
     The circle expressions keep the same float evaluation order as the
     renderer's original inline code — bit-identical radii. */
  function trace(ctx, doc, cx, cy, pxPerMM, { shrink = 1, insetMM = 0 } = {}) {
    const s = get(doc);
    ctx.beginPath();
    if (s.kind === 'circle') {
      const r = insetMM ? (s.diameterMM / 2 - insetMM) * pxPerMM * shrink
        : s.diameterMM / 2 * pxPerMM * shrink;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      return;
    }
    const w = (s.wMM - insetMM * 2) * pxPerMM * shrink;
    const h = (s.hMM - insetMM * 2) * pxPerMM * shrink;
    if (s.kind === 'shape') {
      /* inset approximated by shrinking the bounding box about center —
         advisory (margin guide); exact clip uses insetMM 0 */
      traceShapePath(ctx, s.shape, cx, cy, w, h);
      return;
    }
    const rc = s.kind === 'rounded'
      ? Math.min(Math.max(0, ((s.cornerRMM || 0) - insetMM)) * pxPerMM * shrink, Math.min(w, h) / 2)
      : 0;
    if (rc > 0) ctx.roundRect(cx - w / 2, cy - h / 2, w, h, rc);
    else ctx.rect(cx - w / 2, cy - h / 2, w, h);
  }

  /* SVG path (mm, origin-centered) for shape substrates; insetMM shrinks
     the bounding box about center (same approximation as trace) */
  function svgPath(doc, insetMM = 0) {
    const s = get(doc);
    if (s.kind !== 'shape') return null;
    return svgShapePath(s.shape, s.wMM - insetMM * 2, s.hMM - insetMM * 2);
  }

  const shapeInfo = (id) => SHAPES[id] || null;
  const shapeIds = () => Object.keys(SHAPES);

  CF.substrate = { norm, get, kind, sizeMM, maxDimMM, radiusMM, marginMM, trace, fromCoin, svgPath, shapeInfo, shapeIds };
})();
