/* ============================================================
   CoinForge Studio — substrate.js
   The physical blank a design sits on. Canonical model:
     doc.substrate = { kind:'circle', diameterMM, marginMM }
                   | { kind:'rect',    wMM, hMM, marginMM }
                   | { kind:'rounded', wMM, hMM, cornerRMM, marginMM }
     doc.material  = 'metal' | 'rubber'
   Circle docs also carry a legacy `doc.coin` mirror so files stay
   readable by pre-1.7 clients and legacy reads keep working.
   Round-only tools gate on `radiusMM(doc) !== null`.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const DEFAULT_D = 44.45, DEFAULT_MARGIN = 2;

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
    const rc = s.kind === 'rounded'
      ? Math.min(Math.max(0, ((s.cornerRMM || 0) - insetMM)) * pxPerMM * shrink, Math.min(w, h) / 2)
      : 0;
    if (rc > 0) ctx.roundRect(cx - w / 2, cy - h / 2, w, h, rc);
    else ctx.rect(cx - w / 2, cy - h / 2, w, h);
  }

  CF.substrate = { norm, get, kind, sizeMM, maxDimMM, radiusMM, marginMM, trace, fromCoin };
})();
