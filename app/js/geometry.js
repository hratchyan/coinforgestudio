/* ============================================================
   CoinForge Studio — geometry.js
   Parametric SVG-path generators for coin artwork.

   Conventions:
   - All paths are in a local coordinate space centered on (0,0).
   - Angles are in DEGREES, 0° = 12 o'clock, positive = clockwise.
   - Generators return SVG path `d` strings (usable in Path2D and SVG).
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const { deg2rad, num, clamp, pathTransform } = CF.util;
  const G = {};

  /* 0° is up, clockwise positive */
  G.polar = (deg, r, cx = 0, cy = 0) => {
    const a = deg2rad(deg);
    return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
  };
  const P = (deg, r, cx = 0, cy = 0) => { const p = G.polar(deg, r, cx, cy); return `${num(p.x)} ${num(p.y)}`; };

  G.circlePath = (r, cx = 0, cy = 0) =>
    `M ${num(cx - r)} ${num(cy)} a ${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0 a ${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0 Z`;

  /* annulus — fill with evenodd */
  G.ringPath = (rOuter, rInner, cx = 0, cy = 0) =>
    G.circlePath(rOuter, cx, cy) + ' ' + G.circlePath(Math.max(0.01, rInner), cx, cy);

  /* open arc (for strokes); sweep clockwise from a0 to a1 */
  G.arcLine = (r, a0, a1, cx = 0, cy = 0) => {
    const sweep = a1 - a0;
    if (Math.abs(sweep) >= 360) return G.circlePath(r, cx, cy);
    const large = Math.abs(sweep) > 180 ? 1 : 0;
    const dir = sweep >= 0 ? 1 : 0;
    return `M ${P(a0, r, cx, cy)} A ${num(r)} ${num(r)} 0 ${large} ${dir} ${P(a1, r, cx, cy)}`;
  };

  /* solid partial annulus (band segment with flat radial ends) */
  G.arcBand = (rMid, thickness, a0, a1, cx = 0, cy = 0) => {
    const rO = rMid + thickness / 2, rI = Math.max(0.01, rMid - thickness / 2);
    const sweep = a1 - a0;
    if (Math.abs(sweep) >= 360) return G.ringPath(rO, rI, cx, cy);
    const large = Math.abs(sweep) > 180 ? 1 : 0;
    return `M ${P(a0, rO, cx, cy)} A ${num(rO)} ${num(rO)} 0 ${large} 1 ${P(a1, rO, cx, cy)}` +
      ` L ${P(a1, rI, cx, cy)} A ${num(rI)} ${num(rI)} 0 ${large} 0 ${P(a0, rI, cx, cy)} Z`;
  };

  G.starPath = (points, rOut, rIn, rot = 0, cx = 0, cy = 0) => {
    let d = '';
    const step = 360 / points;
    for (let i = 0; i < points; i++) {
      const aO = rot + i * step, aI = aO + step / 2;
      d += (i === 0 ? 'M ' : 'L ') + P(aO, rOut, cx, cy) + ' L ' + P(aI, rIn, cx, cy) + ' ';
    }
    return d + 'Z';
  };

  G.polygonPath = (sides, r, rot = 0, cx = 0, cy = 0) => {
    let d = '';
    for (let i = 0; i < sides; i++) d += (i === 0 ? 'M ' : 'L ') + P(rot + i * 360 / sides, r, cx, cy) + ' ';
    return d + 'Z';
  };

  /* sunburst: triangular rays around an inner disc */
  G.burstPath = (rays, rOut, rIn, dutyPct = 55, rot = 0) => {
    let d = '';
    const step = 360 / rays, halfW = step * clamp(dutyPct, 5, 95) / 200;
    for (let i = 0; i < rays; i++) {
      const a = rot + i * step;
      d += `M ${P(a - halfW, rIn)} L ${P(a, rOut)} L ${P(a + halfW, rIn)} Z `;
    }
    return d;
  };

  G.gearPath = (teeth, rOut, depthPct = 16, holePct = 32) => {
    const rRoot = rOut * (1 - clamp(depthPct, 4, 40) / 100);
    const step = 360 / teeth;
    const tw = step * 0.32, gap = step * 0.18;
    let d = '';
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      const s = i === 0 ? 'M' : 'L';
      d += `${s} ${P(a - tw / 2 - gap, rRoot)} L ${P(a - tw / 2, rOut)} L ${P(a + tw / 2, rOut)} L ${P(a + tw / 2 + gap, rRoot)} `;
      d += `A ${num(rRoot)} ${num(rRoot)} 0 0 1 ${P(a + step - tw / 2 - gap, rRoot)} `;
    }
    d += 'Z ' + G.circlePath(rOut * clamp(holePct, 0, 80) / 100);
    return d;
  };

  /* ======== decorative ring patterns (for Ring Band styles & symbols) ======== */

  G.beadRing = (rMid, beadR, count) => {
    let d = '';
    for (let i = 0; i < count; i++) {
      const p = G.polar(i * 360 / count, rMid);
      d += G.circlePath(beadR, p.x, p.y) + ' ';
    }
    return d;
  };

  /* rope: stroked slanted strands (style: stroke, round caps) */
  G.ropeRing = (rMid, thickness, strands) => {
    const rI = rMid - thickness / 2, rO = rMid + thickness / 2;
    const step = 360 / strands, slant = step * 0.9;
    let d = '';
    for (let i = 0; i < strands; i++) {
      const a = i * step;
      d += `M ${P(a, rI)} Q ${P(a + slant * 0.5, rMid)} ${P(a + slant, rO)} `;
    }
    return d;
  };

  /* reeded: radial ticks (style: stroke) */
  G.reededRing = (rMid, thickness, count) => {
    const rI = rMid - thickness / 2, rO = rMid + thickness / 2;
    let d = '';
    for (let i = 0; i < count; i++) {
      const a = i * 360 / count;
      d += `M ${P(a, rI)} L ${P(a, rO)} `;
    }
    return d;
  };

  G.dashRing = (rMid, thickness, count, dutyPct = 55) => {
    let d = '';
    const step = 360 / count, on = step * clamp(dutyPct, 10, 90) / 100;
    for (let i = 0; i < count; i++) {
      const a = i * step;
      d += G.arcBand(rMid, thickness, a, a + on) + ' ';
    }
    return d;
  };

  /* wavy-edged ring (scallop): polar-sampled outer edge + circular inner hole */
  G.scallopRing = (rOuter, rInner, waves, depth) => {
    const n = Math.max(180, waves * 16);
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = i * 360 / n;
      const r = rOuter - depth / 2 + (depth / 2) * Math.cos(deg2rad(a * waves));
      d += (i === 0 ? 'M ' : 'L ') + P(a, r) + ' ';
    }
    d += 'Z ' + G.circlePath(rInner);
    return d;
  };

  /* chain: alternating flat/tilted oval links (evenodd fill) */
  G.chainRing = (rMid, links, linkT) => {
    const k = 0.5523;
    const ellipse = (cx, cy, rx, ry, rotDeg) => {
      const d0 = `M ${num(-rx)} 0 C ${num(-rx)} ${num(-ry * k)} ${num(-rx * k)} ${num(-ry)} 0 ${num(-ry)} C ${num(rx * k)} ${num(-ry)} ${num(rx)} ${num(-ry * k)} ${num(rx)} 0 C ${num(rx)} ${num(ry * k)} ${num(rx * k)} ${num(ry)} 0 ${num(ry)} C ${num(-rx * k)} ${num(ry)} ${num(-rx)} ${num(ry * k)} ${num(-rx)} 0 Z`;
      return pathTransform(d0, { rot: rotDeg, dx: cx, dy: cy });
    };
    const step = 360 / links;
    const linkLen = (Math.PI * 2 * rMid / links) * 0.72;
    let d = '';
    for (let i = 0; i < links; i++) {
      const a = i * step + step / 2;
      const p = G.polar(a, rMid);
      const tangent = a + 90;
      const flat = i % 2 === 0;
      const rx = linkLen / 2, ry = linkT / 2 * (flat ? 1 : 0.62);
      d += ellipse(p.x, p.y, rx, ry, tangent) + ' ' + ellipse(p.x, p.y, rx * 0.55, ry * 0.5, tangent) + ' ';
    }
    return d;
  };

  /* laurel branch along an arc; leaves lean in the direction of travel a0 → a1 */
  G.laurelArc = (rMid, a0, a1, leafLen, leafW, stemT = 0.8) => {
    const sweep = a1 - a0;
    const nLeaves = Math.max(3, Math.round(Math.abs(sweep) / 11));
    let d = G.arcBand(rMid, stemT, Math.min(a0, a1), Math.max(a0, a1)) + ' ';
    const leaf = (angle, len, w, tiltDeg, rBase) => {
      const base = G.polar(angle, rBase);
      const tipA = angle + tiltDeg;
      const tip = G.polar(angle, rBase + len);
      const tipR = { x: base.x + (tip.x - base.x) * Math.cos(deg2rad(tiltDeg)) - (tip.y - base.y) * Math.sin(deg2rad(tiltDeg)), y: base.y + (tip.x - base.x) * Math.sin(deg2rad(tiltDeg)) + (tip.y - base.y) * Math.cos(deg2rad(tiltDeg)) };
      const mx = (base.x + tipR.x) / 2, my = (base.y + tipR.y) / 2;
      const dx = tipR.x - base.x, dy = tipR.y - base.y;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      return `M ${num(base.x)} ${num(base.y)} Q ${num(mx + nx * w)} ${num(my + ny * w)} ${num(tipR.x)} ${num(tipR.y)} Q ${num(mx - nx * w)} ${num(my - ny * w)} ${num(base.x)} ${num(base.y)} Z `;
    };
    const dir = sweep >= 0 ? 1 : -1;
    for (let i = 0; i < nLeaves; i++) {
      const t = (i + 0.5) / nLeaves;
      const a = a0 + sweep * t;
      const tilt = dir * 38;
      d += leaf(a, leafLen, leafW, tilt, rMid + stemT * 0.2);
      d += leaf(a + dir * 4.5, -leafLen * 0.82, leafW * 0.85, tilt * 0.85, rMid - stemT * 0.2);
    }
    return d;
  };

  G.wreathPath = (rMid, gapTopDeg, gapBottomDeg, leafLen, leafW) => {
    const halfTop = gapTopDeg / 2, halfBot = gapBottomDeg / 2;
    return G.laurelArc(rMid, 180 + halfBot, 360 - halfTop, leafLen, leafW) + ' ' +
      G.laurelArc(rMid, 180 - halfBot, halfTop, leafLen, leafW);
  };

  /* wheat stalk: vertical, grains alternating up the stem */
  G.wheatPath = (h, w) => {
    let d = `M ${num(-w * 0.06)} ${num(h / 2)} L ${num(-w * 0.06)} ${num(-h * 0.42)} L ${num(w * 0.06)} ${num(-h * 0.42)} L ${num(w * 0.06)} ${num(h / 2)} Z `;
    const grains = 6;
    for (let i = 0; i < grains; i++) {
      const y = -h * 0.42 + i * (h * 0.78 / grains);
      const len = w * 0.5, gw = w * 0.16;
      for (const s of [-1, 1]) {
        const bx = s * w * 0.05, tx = s * len, ty = y - h * 0.1;
        d += `M ${num(bx)} ${num(y)} Q ${num((bx + tx) / 2 + s * gw)} ${num((y + ty) / 2 + gw)} ${num(tx)} ${num(ty)} Q ${num((bx + tx) / 2 - s * gw * 0.2)} ${num((y + ty) / 2 - gw)} ${num(bx)} ${num(y)} Z `;
      }
    }
    d += `M 0 ${num(-h * 0.42)} Q ${num(w * 0.1)} ${num(-h * 0.52)} 0 ${num(-h * 0.6)} Q ${num(-w * 0.1)} ${num(-h * 0.52)} 0 ${num(-h * 0.42)} Z`;
    return d;
  };

  /* ======== banner / ribbon ======== */
  /* Arc banner. curveDeg: total sweep (+ = ends curl up, like a top smile; - = ends down).
     Returns paths + the text arc description. */
  G.banner = ({ wMM, hMM, curveDeg = 40, tails = 'swallow', tailLen = 0.16 }) => {
    const w = wMM, h = hMM;
    const res = { body: '', folds: '', text: null };
    const abs = Math.abs(curveDeg);

    if (abs < 4) {
      const tl = tails === 'none' ? 0 : w * tailLen;
      let d = `M ${num(-w / 2)} ${num(-h / 2)} L ${num(w / 2)} ${num(-h / 2)} L ${num(w / 2)} ${num(h / 2)} L ${num(-w / 2)} ${num(h / 2)} Z `;
      if (tl > 0) {
        const notch = tails === 'swallow' ? tl * 0.55 : 0;
        d += `M ${num(-w / 2)} ${num(-h / 2 + h * 0.12)} L ${num(-w / 2 - tl)} ${num(-h / 2 + h * 0.12)} ${tails === 'swallow' ? `L ${num(-w / 2 - tl + notch)} ${num(0.12 * h - h / 2 + h * 0.38)} L ${num(-w / 2 - tl)} ${num(h / 2 + h * 0.12 - h * 0.24)}` : `L ${num(-w / 2 - tl)} ${num(h / 2 - h * 0.12)}`} L ${num(-w / 2)} ${num(h / 2 - h * 0.12 + h * 0.24)} Z `;
        d += `M ${num(w / 2)} ${num(-h / 2 + h * 0.12)} L ${num(w / 2 + tl)} ${num(-h / 2 + h * 0.12)} ${tails === 'swallow' ? `L ${num(w / 2 + tl - notch)} ${num(0.12 * h - h / 2 + h * 0.38)} L ${num(w / 2 + tl)} ${num(h / 2 + h * 0.12 - h * 0.24)}` : `L ${num(w / 2 + tl)} ${num(h / 2 - h * 0.12)}`} L ${num(w / 2)} ${num(h / 2 - h * 0.12 + h * 0.24)} Z `;
        res.folds = `M ${num(-w / 2)} ${num(-h / 2 + h * 0.12)} L ${num(-w / 2)} ${num(h / 2 - h * 0.12 + h * 0.24)} L ${num(-w / 2 + h * 0.16)} ${num(h / 2)} L ${num(-w / 2 + h * 0.16)} ${num(-h / 2)} Z ` +
          `M ${num(w / 2)} ${num(-h / 2 + h * 0.12)} L ${num(w / 2)} ${num(h / 2 - h * 0.12 + h * 0.24)} L ${num(w / 2 - h * 0.16)} ${num(h / 2)} L ${num(w / 2 - h * 0.16)} ${num(-h / 2)} Z`;
      }
      res.body = d;
      res.text = { kind: 'line' };
      return res;
    }

    const sweep = clamp(abs, 4, 170);
    const R = w / (2 * Math.sin(deg2rad(sweep / 2)));
    const up = curveDeg > 0;
    /* circle center placed so the band midpoint passes through (0,0) */
    const cy = up ? -R : R;
    const midDeg = up ? 180 : 0;
    const a0 = midDeg - sweep / 2, a1 = midDeg + sweep / 2;
    const band = (aa0, aa1) => G.arcBand(R, h, aa0, aa1, 0, cy);
    res.body = band(a0, a1);
    if (tails !== 'none') {
      const tSweep = sweep * clamp(tailLen, 0.06, 0.4);
      const mk = (edge, dir) => {
        const rO = R + h / 2, rI = R - h / 2;
        const aA = edge, aB = edge + dir * tSweep;
        const pOA = G.polar(aA, rO, 0, cy), pOB = G.polar(aB, rO, 0, cy);
        const pIB = G.polar(aB, rI, 0, cy), pIA = G.polar(aA, rI, 0, cy);
        const notch = G.polar(aB - dir * tSweep * 0.5, R, 0, cy);
        if (tails === 'swallow')
          return `M ${num(pOA.x)} ${num(pOA.y)} L ${num(pOB.x)} ${num(pOB.y)} L ${num(notch.x)} ${num(notch.y)} L ${num(pIB.x)} ${num(pIB.y)} L ${num(pIA.x)} ${num(pIA.y)} Z `;
        return `M ${num(pOA.x)} ${num(pOA.y)} L ${num(pOB.x)} ${num(pOB.y)} L ${num(pIB.x)} ${num(pIB.y)} L ${num(pIA.x)} ${num(pIA.y)} Z `;
      };
      /* tails drop slightly outward radius-wise */
      const shift = up ? 1.06 : 1.06;
      const tailBandR = R * shift;
      const mkShift = (edge, dir) => {
        const rO = tailBandR + h * 0.45, rI = tailBandR - h * 0.45;
        const aA = edge, aB = edge + dir * tSweep;
        const pOA = G.polar(aA, rO, 0, cy), pOB = G.polar(aB, rO, 0, cy);
        const pIB = G.polar(aB, rI, 0, cy), pIA = G.polar(aA, rI, 0, cy);
        const notch = G.polar(aB - dir * tSweep * 0.45, tailBandR, 0, cy);
        if (tails === 'swallow')
          return `M ${num(pOA.x)} ${num(pOA.y)} L ${num(pOB.x)} ${num(pOB.y)} L ${num(notch.x)} ${num(notch.y)} L ${num(pIB.x)} ${num(pIB.y)} L ${num(pIA.x)} ${num(pIA.y)} Z `;
        return `M ${num(pOA.x)} ${num(pOA.y)} L ${num(pOB.x)} ${num(pOB.y)} L ${num(pIB.x)} ${num(pIB.y)} L ${num(pIA.x)} ${num(pIA.y)} Z `;
      };
      res.body += ' ' + mkShift(a0, -1) + mkShift(a1, 1);
      const foldT = sweep * 0.02;
      res.folds = band(a0 - foldT, a0) + ' ' + band(a1, a1 + foldT);
    }
    res.text = { kind: 'arc', R, cy, midDeg, sweep: sweep * 0.86, up };
    return res;
  };

  /* ======== compound symbol helpers ======== */
  G.compassRose = (r) => {
    return G.starPath(4, r, r * 0.18) + ' ' + G.starPath(4, r * 0.62, r * 0.14, 45) + ' ' +
      G.ringPath(r * 0.30, r * 0.24) + ' ' + G.circlePath(r * 0.08);
  };

  G.snowflake = (r, arms = 6) => {
    let d = '';
    for (let i = 0; i < arms; i++) {
      const a = i * 360 / arms;
      d += `M ${P(a, r * 0.12)} L ${P(a, r)} `;
      for (const t of [0.45, 0.68]) {
        const b = G.polar(a, r * t);
        for (const s of [-1, 1]) {
          const tip = G.polar(a + s * 28, r * (t + 0.2));
          d += `M ${num(b.x)} ${num(b.y)} L ${num(tip.x)} ${num(tip.y)} `;
        }
      }
    }
    return d;
  };

  G.crescent = (r, biteOffset = 0.42, biteScale = 0.85) => {
    const r2 = r * biteScale;
    const off = r * biteOffset;
    const topY = -Math.sqrt(Math.max(0, r * r));
    /* outer circle arc from top to bottom (left side), inner arc back (right bulge) */
    return `M 0 ${num(-r)} A ${num(r)} ${num(r)} 0 1 0 0 ${num(r)} A ${num(r2)} ${num(r2)} 0 1 1 0 ${num(-r)} Z`;
  };

  G.heartPath = (s) => {
    const w = s, h = s;
    return `M 0 ${num(h * 0.32)} C ${num(-w * 0.5)} ${num(-h * 0.12)} ${num(-w * 0.36)} ${num(-h * 0.5)} 0 ${num(-h * 0.24)} C ${num(w * 0.36)} ${num(-h * 0.5)} ${num(w * 0.5)} ${num(-h * 0.12)} 0 ${num(h * 0.32)} Z`;
  };

  G.dropPath = (s) => `M 0 ${num(-s * 0.5)} C ${num(s * 0.35)} ${num(-s * 0.05)} ${num(s * 0.32)} ${num(s * 0.18)} 0 ${num(s * 0.5)} C ${num(-s * 0.32)} ${num(s * 0.18)} ${num(-s * 0.35)} ${num(-s * 0.05)} 0 ${num(-s * 0.5)} Z`;

  G.crossPath = (kind, s = 100) => {
    const u = s / 100;
    if (kind === 'greek') {
      const a = 16 * u, b = 46 * u;
      return `M ${num(-a)} ${num(-b)} L ${num(a)} ${num(-b)} L ${num(a)} ${num(-a)} L ${num(b)} ${num(-a)} L ${num(b)} ${num(a)} L ${num(a)} ${num(a)} L ${num(a)} ${num(b)} L ${num(-a)} ${num(b)} L ${num(-a)} ${num(a)} L ${num(-b)} ${num(a)} L ${num(-b)} ${num(-a)} L ${num(-a)} ${num(-a)} Z`;
    }
    if (kind === 'latin') {
      const a = 12 * u;
      return `M ${num(-a)} ${num(-48 * u)} L ${num(a)} ${num(-48 * u)} L ${num(a)} ${num(-18 * u)} L ${num(34 * u)} ${num(-18 * u)} L ${num(34 * u)} ${num(6 * u)} L ${num(a)} ${num(6 * u)} L ${num(a)} ${num(50 * u)} L ${num(-a)} ${num(50 * u)} L ${num(-a)} ${num(6 * u)} L ${num(-34 * u)} ${num(6 * u)} L ${num(-34 * u)} ${num(-18 * u)} L ${num(-a)} ${num(-18 * u)} Z`;
    }
    if (kind === 'pattee') {
      const arm = `M -7 -7 C -11 -20 -20 -37 -28 -46 L 28 -46 C 20 -37 11 -20 7 -7 Z`;
      let d = '';
      for (let i = 0; i < 4; i++) d += pathTransform(arm, { rot: i * 90, sx: u, sy: u }) + ' ';
      return d;
    }
    /* maltese */
    const arm = `M 0 -5 L -27 -50 L 0 -40 L 27 -50 Z`;
    let d = '';
    for (let i = 0; i < 4; i++) d += pathTransform(arm, { rot: i * 90, sx: u, sy: u }) + ' ';
    return d;
  };

  G.shieldPath = (kind = 'heater', s = 100) => {
    const u = s / 100;
    if (kind === 'badge')
      return pathTransform(`M 0 -46 C 14 -40 30 -38 44 -40 C 46 -12 40 22 0 48 C -40 22 -46 -12 -44 -40 C -30 -38 -14 -40 0 -46 Z`, { sx: u, sy: u });
    if (kind === 'flat')
      return pathTransform(`M -44 -46 L 44 -46 L 44 2 C 44 24 28 40 0 50 C -28 40 -44 24 -44 2 Z`, { sx: u, sy: u });
    /* heater */
    return pathTransform(`M 0 -46 C 20 -44 34 -44 46 -48 C 48 -14 44 18 0 50 C -44 18 -48 -14 -46 -48 C -34 -44 -20 -44 0 -46 Z`, { sx: u, sy: u });
  };

  /* Eternity pinwheel: a ring of n overlapping circles; each blade is one
     circle minus an offset neighbor. Arcs are sampled, so the result is
     exact at any scale with no arc-flag guesswork. */
  G.eternityPath = (blades = 8, rOut = 46, holeFrac = 0.08, fat = 0.66, chirality = 1) => {
    /* each blade = circle minus a neighbor offset by `fat` of the blade
       period; the leftover slivers between blades are the background swirls */
    const period = 360 / blades;
    const step = period * clamp(fat, 0.35, 0.95) * (chirality >= 0 ? 1 : -1);
    const c = rOut * (1 + holeFrac) / 2;   /* ring radius   */
    const r = rOut * (1 - holeFrac) / 2;   /* blade circles */
    const center = a => G.polar(a, c);

    const intersections = (a0, a1) => {
      const A = center(a0), B = center(a1);
      const dx = B.x - A.x, dy = B.y - A.y;
      const d = Math.hypot(dx, dy);
      const h = Math.sqrt(Math.max(0, r * r - d * d / 4));
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      const ux = -dy / d, uy = dx / d;
      const p1 = { x: mx + ux * h, y: my + uy * h };
      const p2 = { x: mx - ux * h, y: my - uy * h };
      return Math.hypot(p1.x, p1.y) < Math.hypot(p2.x, p2.y)
        ? { near: p1, far: p2 } : { near: p2, far: p1 };
    };

    const sampleArc = (C, from, to, other, wantInsideOther, N = 30) => {
      const f = Math.atan2(from.y - C.y, from.x - C.x);
      const t = Math.atan2(to.y - C.y, to.x - C.x);
      const trySpan = (dir) => {
        let span = (t - f) * dir;
        while (span < 0) span += Math.PI * 2;
        const mid = f + dir * span / 2;
        const m = { x: C.x + r * Math.cos(mid), y: C.y + r * Math.sin(mid) };
        const inside = Math.hypot(m.x - other.x, m.y - other.y) < r;
        return inside === wantInsideOther ? span : null;
      };
      let dir = 1, span = trySpan(1);
      if (span === null) { dir = -1; span = trySpan(-1); }
      const pts = [];
      for (let i = 1; i <= N; i++) {
        const a = f + dir * span * (i / N);
        pts.push({ x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a) });
      }
      return pts;
    };

    let d = '';
    for (let i = 0; i < blades; i++) {
      const a0 = i * period, a1 = a0 + step;
      const Ci = center(a0), Cn = center(a1);
      const I = intersections(a0, a1);
      /* outer edge along C_i (outside the neighbor), back along the neighbor
         (inside C_i) — together: the crescent blade */
      const out = sampleArc(Ci, I.near, I.far, Cn, false);
      const back = sampleArc(Cn, I.far, I.near, Ci, true);
      d += `M ${num(I.near.x)} ${num(I.near.y)} ` +
        out.map(p => `L ${num(p.x)} ${num(p.y)}`).join(' ') + ' ' +
        back.map(p => `L ${num(p.x)} ${num(p.y)}`).join(' ') + ' Z ';
    }
    return d;
  };

  CF.geo = G;
})();