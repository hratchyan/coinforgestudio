/* ============================================================
   CoinForge Studio — symbols.js
   Curated vector symbol library. Every symbol lives in a
   100×100 box centered on (0,0)  (coords −50…+50).

   Entry: { id, label, cat, fill?, stroke?, strokeW, fillRule }
   - fill: SVG path string filled with the mark shade
   - stroke: SVG path string stroked (round caps/joins)
   To add your own symbols, append an add(...) call — see
   docs/CUSTOMIZING.md.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const G = CF.geo, T = CF.util.pathTransform;
  const defs = [];
  const CATS = [
    ['stars', 'Stars & Bursts'],
    ['milpat', 'Military & Patriotic'],
    ['firepol', 'Fire · Police · EMS'],
    ['heraldry', 'Heraldry & Crowns'],
    ['faith', 'Faith & Peace'],
    ['nature', 'Nature & Animals'],
    ['nautical', 'Nautical & Aviation'],
    ['tools', 'Tools & Trade'],
    ['scitech', 'Science & Tech'],
    ['sports', 'Sports & Games'],
    ['edge', 'Skulls & Edge'],
    ['ornament', 'Ornaments & Dividers'],
    ['shapes', 'Basic Shapes'],
  ];

  function add(cat, id, label, spec) {
    defs.push(Object.assign({ id, label, cat, strokeW: 4, fillRule: 'evenodd' }, spec));
  }

  /* ============ Stars & Bursts ============ */
  add('stars', 'star5', 'Star (5-point)', { fill: () => G.starPath(5, 48, 20) });
  add('stars', 'star6', 'Star (6-point)', { fill: () => G.starPath(6, 48, 26) });
  add('stars', 'star4', 'Star (4-point)', { fill: () => G.starPath(4, 48, 13) });
  add('stars', 'sparkle', 'Sparkle', { fill: () => G.starPath(4, 48, 9) + ' ' + G.starPath(4, 22, 5, 45) });
  add('stars', 'starcircle', 'Star in Ring', { fill: () => G.ringPath(48, 40) + ' ' + G.starPath(5, 34, 14) });
  add('stars', 'burst16', 'Sunburst 16', { fill: () => G.burstPath(16, 48, 26) + ' ' + G.circlePath(20) });
  add('stars', 'burst24', 'Sunburst 24', { fill: () => G.burstPath(24, 48, 30) + ' ' + G.circlePath(24) });
  add('stars', 'rays', 'Glory Rays', { fill: () => G.burstPath(32, 48, 20, 34) });
  add('stars', 'compass', 'Compass Rose', { fill: () => G.starPath(4, 48, 9) + ' ' + G.starPath(4, 30, 7, 45) });
  add('stars', 'starofdavid', 'Star of David', { stroke: () => G.polygonPath(3, 42, 0) + ' ' + G.polygonPath(3, 42, 60), strokeW: 6 });
  add('stars', 'starcrescent', 'Star & Crescent', {
    fill: () => G.crescent(40, 0.4, 0.82) + ' ' + T(G.starPath(5, 14, 5.6), { dx: 22, dy: 0 })
  });
  add('stars', 'starlife', 'Star of Life', {
    fill: () => [0, 60, 120].map(a => T('M -9 -46 L 9 -46 L 9 46 L -9 46 Z', { rot: a })).join(' '),
    fillRule: 'nonzero'
  });

  /* ============ Military & Patriotic ============ */
  add('milpat', 'eaglehead', 'Eagle Head', {
    fill: () => `M -30 -24 C -22 -31 -12 -34 -2 -33 C 6 -32.5 13 -30 17 -27 L 19 -26.5
      C 27 -27 36 -23 41 -16 C 44 -11 45 -5 43 0 C 42 3 39 4 37 2 C 35 0.5 34 -2 33 -4
      C 30 -3 27 -4 25 -6 C 23 -4 21 -1 18 1 C 15 4 12 7 9 9 C 11 13 12 16 12 18
      L 3 19 L 9 25 L -1 27 L 5 33 L -7 35 L -1 41 L -13 42 L -7 47 L -24 46
      C -33 42 -39 33 -41 22 C -43 10 -42 -3 -38 -13 C -36 -18 -33 -21 -30 -24 Z
      M 12 -21 a 3.6 3.6 0 1 0 7.2 0 a 3.6 3.6 0 1 0 -7.2 0 Z
      M 8 -26.5 L 22 -25.5 L 20 -22.8 L 9 -23.8 Z
      M 18 0.5 C 22 -2 27 -4 32 -4.5 L 32 -3 C 27 -2.5 22.5 -0.5 19 2 Z`
  });
  add('milpat', 'eaglespread', 'Eagle Spread Wings', {
    fill: () => {
      const wing = `M 4 -11 C 12 -26 26 -35 48 -37 C 45 -30 40 -26 34 -23 C 40 -23.5 44 -25 48 -27
        C 46 -19 40 -14 33 -12 C 38 -11 43 -12 47 -13.5 C 44 -6 37 -2 29 -1.5 C 33 0.5 37 0.6 41 -0.5
        C 37 6 28 8.6 20 6.5 C 14 5 8 1 4 -3.5 Z`;
      const body = `M 0 -17 C 4 -14 6 -9 6 -1 C 6 9 4 17 0 23 C -4 17 -6 9 -6 -1 C -6 -9 -4 -14 0 -17 Z`;
      const head = `M 0 -17 C 3.4 -21 3.4 -26 0.6 -29 L 6.5 -27.4 L 1 -24.6 L 0.4 -24.8 C -2 -25.6 -3.4 -21 0 -17 Z
        M -0.4 -29 C -3.2 -26 -3.2 -21 -0.6 -18 C -4.2 -21 -4.6 -27 -0.4 -29 Z`;
      const head2 = `M 0 -16 C -3.6 -20.4 -3.8 -25.8 0.2 -28.8 C 2.6 -30.4 5.4 -29.8 6.6 -27.6 L 1.4 -25.4 L 5 -23.6 C 3.6 -20 2 -17.6 0 -16 Z`;
      const tail = `M -7 21 L -11 36 L -5.4 31.6 L -4 40 L 0 33 L 4 40 L 5.4 31.6 L 11 36 L 7 21 C 2 24 -2 24 -7 21 Z`;
      return wing + ' ' + T(wing, { rot: 0, sx: -1 }) + ' ' + body + ' ' + head2 + ' ' + tail;
    }
  });
  add('milpat', 'shieldstripes', 'US Shield', {
    fill: () => G.shieldPath('heater') +
      ' M -36 -20 L 36 -20 L 36 -16.5 L -36 -16.5 Z' +
      ' M -16 -12 L -10 -12 L -10 24 L -16 24 Z M -3 -12 L 3 -12 L 3 26 L -3 26 Z M 10 -12 L 16 -12 L 16 24 L 10 24 Z'
  });
  add('milpat', 'chevrons', 'Rank Chevrons', {
    fill: () => [0, 16, 32].map(dy =>
      `M -32 ${-24 + dy} L 0 ${-10 + dy} L 32 ${-24 + dy} L 32 ${-14 + dy} L 0 ${0 + dy} L -32 ${-14 + dy} Z`).join(' ')
  });
  add('milpat', 'crossedswords', 'Crossed Swords', {
    fill: () => {
      const sw = `M 0 -50 C 2 -46 3 -42 3 -38 L 3 18 L -3 18 L -3 -38 C -3 -42 -2 -46 0 -50 Z
        M -10 18 L 10 18 L 10 23 L 3.2 23 L 3.2 34 C 3.2 37 2 39 0 40.5 C -2 39 -3.2 37 -3.2 34 L -3.2 23 L -10 23 Z`;
      return T(sw, { rot: 35 }) + ' ' + T(sw, { rot: -35 });
    },
    fillRule: 'nonzero'
  });
  add('milpat', 'crossedrifles', 'Crossed Rifles', {
    fill: () => {
      const r = `M -1.6 -48 L 1.6 -48 L 2.2 -20 L 2.2 10 C 4.5 14 5.5 22 5 30 L 4 46 L -2.5 46 L -2.2 30 L -2.2 -20 Z M -1 -38 L 4 -37 L 4 -34.6 L -1 -35.6 Z`;
      return T(r, { rot: 30 }) + ' ' + T(r, { rot: -30 });
    },
    fillRule: 'nonzero'
  });
  add('milpat', 'dogtags', 'Dog Tags', {
    fill: () => {
      const tag = `M -9 -17 C -9 -22.5 9 -22.5 9 -17 L 9 17 C 9 22.5 -9 22.5 -9 17 Z M -3 -16 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 Z`;
      let chain = '';
      for (let i = 0; i < 9; i++) { const p = G.polar(-52 + i * 13, 40, 2, -2); chain += G.circlePath(2, p.x, p.y) + ' '; }
      return T(tag, { rot: -10, dx: -7, dy: 12 }) + ' ' + T(tag, { rot: 9, dx: 10, dy: 14 }) + ' ' + chain;
    }
  });
  add('milpat', 'bullet', 'Bullet', {
    fill: () => `M -9 12 L -9 -10 C -9 -25 -4 -34 0 -39 C 4 -34 9 -25 9 -10 L 9 12 Z M -10 15 L 10 15 L 10 20 L -10 20 Z M -9 23 L 9 23 L 9 39 L -9 39 Z`
  });
  add('milpat', 'grenade', 'Grenade', {
    fill: () => G.circlePath(19, 0, 12) + ' M -7 -12 L 7 -12 L 7 -5 L -7 -5 Z' +
      ' M 7 -13 C 15 -12 21 -4 21 4 L 16.5 4 C 16.5 -2 12 -8 6 -9.5 Z' + ' ' + G.ringPath(6.5, 3.5, -12, -16)
  });
  add('milpat', 'rocket', 'Rocket', {
    fill: () => `M 0 -45 C 8 -37 12 -25 12 -11 L 12 13 L -12 13 L -12 -11 C -12 -25 -8 -37 0 -45 Z
      M -12 -2 L -24 20 L -12 20 Z M 12 -2 L 24 20 L 12 20 Z
      M 0 33 C 5 27 6 21 5.4 16 L -5.4 16 C -6 21 -5 27 0 33 Z
      M -5 -16 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 Z`
  });
  add('milpat', 'jet', 'Jet Fighter', {
    fill: () => `M 0 -46 C 3 -38 4 -30 4 -22 L 31 1 L 31 8 L 4 0 L 4 18 L 14 28 L 14 33 L 0 28 L -14 33 L -14 28 L -4 18 L -4 0 L -31 8 L -31 1 L -4 -22 C -4 -30 -3 -38 0 -46 Z`
  });
  add('milpat', 'torch', 'Torch', {
    fill: () => T(`M 0 -48 C 10 -30 22 -24 20 -6 C 19 4 14 10 8 14 C 12 4 10 -2 2 -8 C -2 0 -8 4 -6 14 C -14 10 -20 0 -18 -12 C -16 -26 -6 -32 0 -48 Z`, { sx: 0.62, sy: 0.55, dy: -22 }) +
      ' M -13 -13 L 13 -13 L 8 -1 L -8 -1 Z M -4 -1 L 4 -1 L 2 44 L -2 44 Z'
  });
  const wingPath = `M 2 16 C -2 6 -2 -6 6 -16 C 16 -28 32 -34 47 -32 C 43 -26 38 -22 32 -20 C 38 -20 42.5 -21 47 -22.5
    C 43 -14 36 -10 28 -9 C 33 -8 38 -9 42.5 -10.5 C 38 -2 30 2 22 2 C 26 4 30 4.4 34 4
    C 28 12 16 16 8 14 C 5.6 15.4 3.6 16 2 16 Z`;
  add('milpat', 'wing', 'Wing', { fill: () => wingPath });
  add('milpat', 'wingspair', 'Wings Pair', { fill: () => T(wingPath, { dx: 2 }) + ' ' + T(wingPath, { sx: -1, dx: -2 }) });

  /* ============ Fire · Police · EMS ============ */
  add('firepol', 'maltese', 'Maltese Cross', { fill: () => G.crossPath('maltese') });
  add('firepol', 'maltesedisc', 'Fire Maltese', {
    fill: () => [0, 90, 180, 270].map(a => T('M 0 -14 L -27 -50 L 0 -40 L 27 -50 Z', { rot: a })).join(' ') +
      ' ' + G.ringPath(14, 9.5) + ' ' + G.circlePath(6)
  });
  add('firepol', 'crosspattee', 'Cross Pattée', { fill: () => G.crossPath('pattee') });
  add('firepol', 'badge7', 'Sheriff Star', {
    fill: () => {
      let balls = '';
      for (let i = 0; i < 7; i++) { const p = G.polar(i * 360 / 7, 44); balls += G.circlePath(4, p.x, p.y) + ' '; }
      return G.starPath(7, 40, 26) + ' ' + balls + ' ' + G.ringPath(13, 9);
    }
  });
  add('firepol', 'badgeshield', 'Badge Shield', {
    fill: () => G.shieldPath('badge') + ' M -30 2 L 30 2 L 30 12 L -30 12 Z ' + T(G.starPath(5, 13, 5.4), { dy: -18 })
  });
  add('firepol', 'handcuffs', 'Handcuffs', {
    fill: () => G.ringPath(14, 8.5, -17, 6) + ' ' + G.ringPath(14, 8.5, 17, 6) +
      ' ' + G.ringPath(5, 2.5, -7, -13) + ' ' + G.ringPath(5, 2.5, 7, -13)
  });
  add('firepol', 'scales', 'Scales of Justice', {
    fill: () => `M -2 -32 L 2 -32 L 2 30 L -2 30 Z M -30 -36 L 30 -36 L 30 -31.5 L -30 -31.5 Z
      M -3 -40 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 Z
      M -16 30 L 16 30 L 20 38 L -20 38 Z
      M -30.8 -31 L -21 -7 L -19.6 -7.6 L -29.2 -31.6 Z M -21.2 -31.6 L -30.8 -7.6 L -29.4 -7 L -19.8 -31 Z
      M 29.2 -31.6 L 19.6 -7.6 L 21 -7 L 30.6 -31 Z M 19.8 -31 L 29.4 -7 L 30.8 -7.6 L 21.2 -31.6 Z
      M -34 -6 A 9 9 0 0 0 -16 -6 Z M 16 -6 A 9 9 0 0 0 34 -6 Z`
  });
  add('firepol', 'gavel', 'Gavel', {
    fill: () => T(`M -16 -9 L 16 -9 L 16 9 L -16 9 Z M -21 -11 L -16.5 -11 L -16.5 11 L -21 11 Z M 16.5 -11 L 21 -11 L 21 11 L 16.5 11 Z M -2.6 9.5 L 2.6 9.5 L 2.6 42 L -2.6 42 Z`, { rot: -38, dy: -14 }) +
      ' M -26 30 L 8 30 L 8 36 L -26 36 Z M -30 36 L 12 36 L 12 40.5 L -30 40.5 Z'
  });
  add('firepol', 'medcross', 'Medical Cross', {
    fill: () => `M -15 -44 L 15 -44 L 15 -15 L 44 -15 L 44 15 L 15 15 L 15 44 L -15 44 L -15 15 L -44 15 L -44 -15 L -15 -15 Z`
  });
  add('firepol', 'axes', 'Crossed Axes', {
    fill: () => {
      const ax = `M -2.4 -46 L 2.4 -46 L 3 44 L -3 44 Z M 2.5 -44 C 14 -42 22 -34 24 -22 C 16 -26 9 -27 2.8 -26.4 Z`;
      return T(ax, { rot: 28 }) + ' ' + T(ax, { rot: -28 });
    },
    fillRule: 'nonzero'
  });

  /* ============ Heraldry & Crowns ============ */
  add('heraldry', 'crownpoints', 'Crown', {
    fill: () => `M -30 22 L -30 -6 L -15 8 L 0 -16 L 15 8 L 30 -6 L 30 22 Z M -30 25 L 30 25 L 30 33 L -30 33 Z` +
      ' ' + G.circlePath(4, -30, -10) + ' ' + G.circlePath(4, 0, -21) + ' ' + G.circlePath(4, 30, -10)
  });
  add('heraldry', 'crownroyal', 'Royal Crown', {
    fill: () => `M -32 24 L -35 -6 C -23 -15 -14 -7 -12.5 1 C -10 -17 10 -17 12.5 1 C 14 -7 23 -15 35 -6 L 32 24 Z
      M -32 27 L 32 27 L 32 35 L -32 35 Z
      M -2 -32 L 2 -32 L 2 -22 L -2 -22 Z M -6 -29.5 L 6 -29.5 L 6 -25.5 L -6 -25.5 Z` +
      ' ' + G.circlePath(3.4, 0, -18.5)
  });
  add('heraldry', 'fleurdelis', 'Fleur-de-lis', {
    fill: () => `M 0 -48 C 5 -40 7 -32 6 -22 C 5.5 -16 4.5 -10 3.2 -6 L -3.2 -6 C -4.5 -10 -5.5 -16 -6 -22 C -7 -32 -5 -40 0 -48 Z
      M -7.5 -7 C -17 -9 -25 -15 -28 -24 C -30 -30 -28 -36 -22.5 -38.5 C -19.5 -32 -15 -26.5 -9.5 -23.5 C -8 -18 -7.2 -12 -7.5 -7 Z
      M 7.5 -7 C 17 -9 25 -15 28 -24 C 30 -30 28 -36 22.5 -38.5 C 19.5 -32 15 -26.5 9.5 -23.5 C 8 -18 7.2 -12 7.5 -7 Z
      M -14 -4 L 14 -4 L 12 4 L -12 4 Z
      M 0 6 C 4 14 5.6 22 4 30 C 8 28 11.4 24 12.6 18.5 C 15 26 11.6 34 4 38 L -4 38 C -11.6 34 -15 26 -12.6 18.5 C -11.4 24 -8 28 -4 30 C -5.6 22 -4 14 0 6 Z
      M -3.4 39.5 L 3.4 39.5 L 2.4 47 L -2.4 47 Z`
  });
  add('heraldry', 'shieldheater', 'Shield (Heater)', { fill: () => G.shieldPath('heater') });
  add('heraldry', 'shieldbadge', 'Shield (Badge)', { fill: () => G.shieldPath('badge') });
  add('heraldry', 'shieldflat', 'Shield (Flat Top)', { fill: () => G.shieldPath('flat') });
  add('heraldry', 'tower', 'Castle Tower', {
    fill: () => `M -24 38 L -24 -18 L -16 -18 L -16 -29 L -8 -29 L -8 -18 L -4 -18 L -4 -29 L 4 -29 L 4 -18 L 8 -18 L 8 -29 L 16 -29 L 16 -18 L 24 -18 L 24 38 Z
      M -7 38 L -7 18 A 7 7 0 0 1 7 18 L 7 38 Z M -14 -8 L -10 -8 L -10 2 L -14 2 Z M 10 -8 L 14 -8 L 14 2 L 10 2 Z`
  });
  add('heraldry', 'crossceltic', 'Celtic Cross', {
    fill: () => G.crossPath('latin') + ' ' + G.ringPath(24, 18)
  });
  add('heraldry', 'trophy', 'Trophy', {
    fill: () => `M -18 -40 L 18 -40 L 18 -36 C 18 -18 13 -6 0 -2 C -13 -6 -18 -18 -18 -36 Z M -3.4 -2 L 3.4 -2 L 3.4 8 L -3.4 8 Z M -12 8 L 12 8 L 16 17 L -16 17 Z M -18 17 L 18 17 L 18 23 L -18 23 Z`,
    stroke: () => `M -18 -34 C -30 -34 -30 -17 -16.5 -15 M 18 -34 C 30 -34 30 -17 16.5 -15`,
    strokeW: 4
  });
  add('heraldry', 'rosette', 'Award Rosette', {
    fill: () => T(G.scallopRing(27, 12, 11, 7), { dy: -10 }) + ' ' + G.circlePath(8, 0, -10) +
      ' M -13 12 L -4 14 L -9 38 L -17 32 Z M 4 14 L 13 12 L 17 32 L 9 38 Z'
  });
  add('heraldry', 'laurelwreath', 'Laurel Wreath', { fill: () => G.wreathPath(38, 70, 14, 11, 3.6) });
  add('heraldry', 'laurelbranch', 'Laurel Branch', { fill: () => G.laurelArc(40, 140, 40, 12, 4) });
  add('heraldry', 'wheat', 'Wheat Stalks', {
    fill: () => T(G.wheatPath(88, 34), { rot: 14, dx: -12 }) + ' ' + T(G.wheatPath(88, 34), { rot: -14, dx: 12 })
  });
  add('heraldry', 'key', 'Key', {
    fill: () => G.ringPath(11, 5.5, 0, -30) + ' M -3 -20 L 3 -20 L 3 32 L -3 32 Z M 3 16 L 13 16 L 13 21 L 3 21 Z M 3 25 L 10 25 L 10 30 L 3 30 Z'
  });

  /* ============ Faith & Peace ============ */
  add('faith', 'crosslatin', 'Latin Cross', { fill: () => G.crossPath('latin') });
  add('faith', 'crossgreek', 'Greek Cross', { fill: () => G.crossPath('greek') });
  add('faith', 'ankh', 'Ankh', {
    fill: () => G.ringPath(14, 7.5, 0, -28) + ' M -4 -16 L 4 -16 L 4 46 L -4 46 Z M -24 -2 L 24 -2 L 24 6 L -24 6 Z',
    fillRule: 'nonzero'
  });
  add('faith', 'yinyang', 'Yin Yang', {
    fill: () => `M 0 -46 A 46 46 0 0 1 0 46 A 23 23 0 0 1 0 0 A 23 23 0 0 0 0 -46 Z` +
      ' ' + G.circlePath(6.5, 0, -23) + ' ' + G.circlePath(6.5, 0, 23),
    stroke: () => G.circlePath(46), strokeW: 2.5
  });
  add('faith', 'dharma', 'Dharma Wheel', {
    fill: () => G.circlePath(7) + ' ' + (() => {
      let d = '';
      for (let i = 0; i < 8; i++) {
        const a = i * 45;
        d += T('M -2.6 -9 L 2.6 -9 L 2.6 -33 L -2.6 -33 Z', { rot: a }) + ' ';
      }
      return d;
    })(),
    stroke: () => G.circlePath(38) + ' ' + G.circlePath(45), strokeW: 4.5
  });
  add('faith', 'triquetra', 'Triquetra', {
    stroke: () => {
      let d = '';
      for (let i = 0; i < 3; i++) {
        const a0 = i * 120;
        const p1 = G.polar(a0, 34), p2 = G.polar(a0 + 120, 34);
        d += `M ${CF.util.num(p1.x)} ${CF.util.num(p1.y)} A 34 34 0 0 1 ${CF.util.num(p2.x)} ${CF.util.num(p2.y)} `;
      }
      return d;
    }, strokeW: 5
  });
  add('faith', 'crescentmoon', 'Crescent Moon', { fill: () => G.crescent(42, 0.4, 0.84) });
  add('faith', 'dove', 'Dove', {
    fill: () => `M -38 -2 C -30 -10 -18 -13 -8 -11 C -4 -23 6 -31 19 -31 C 13 -25 10.5 -19 10.5 -12.5
      C 21 -15 31 -12 39 -6 C 31 -2 22.5 -0.5 14.5 -1 C 22 5 26 12 26 20 C 16 13.5 6 10 -2 10
      C -12 10 -24 8 -32 2 L -45 8 C -42.6 2 -40.4 -0.6 -38 -2 Z`
  });
  add('faith', 'menorah', 'Menorah', {
    fill: () => {
      let d = 'M -16 40 L 16 40 L 12 33 L -12 33 Z M -3 10 L 3 10 L 3 33 L -3 33 Z ';
      for (const x of [-30, -20, -10, 0, 10, 20, 30]) d += T('M -2.6 -14 L 2.6 -14 L 2.6 -5 L -2.6 -5 Z', { dx: x }) + ' ' + T(G.dropPath(8), { dx: x, dy: -20 }) + ' ';
      return d;
    },
    stroke: () => `M -30 -6 A 30 30 0 0 0 30 -6 M -20 -6 A 20 20 0 0 0 20 -6 M -10 -6 A 10 10 0 0 0 10 -6 M 0 -5 L 0 10`,
    strokeW: 5
  });
  add('faith', 'eternity', 'Eternity', { fill: () => G.eternityPath(8, 47, 0.08, 0.76, -1), fillRule: 'nonzero' });
  add('faith', 'peace', 'Peace', {
    stroke: () => G.circlePath(42) + ' M 0 -42 L 0 42 M 0 0 L -29.7 29.7 M 0 0 L 29.7 29.7',
    strokeW: 6
  });
  add('faith', 'prayinghands', 'Praying Hands', {
    fill: () => `M -3 -38 C -1.5 -42 1.5 -42 3 -38 L 8 -18 C 10 -10 11 0 10 12 L 14 20 C 15.4 24 14 28 10 30 L 4 33 C 1.4 34 -1.4 34 -4 33 L -10 30 C -14 28 -15.4 24 -14 20 L -10 12 C -11 0 -10 -10 -8 -18 Z M -1.2 -34 L 1.2 -34 L 1.4 8 L -1.4 8 Z`
  });

  /* ============ Nature & Animals ============ */
  add('nature', 'sun', 'Sun', { fill: () => G.burstPath(20, 47, 30) + ' ' + G.circlePath(23) });
  add('nature', 'mapleleaf', 'Maple Leaf', {
    fill: () => `M 0 -44 L 7 -31 C 11 -35 15 -37 19 -37 L 16 -25 C 24 -27 32 -25 38 -19 L 30 -13 C 36 -9 40 -3 40 3 L 24 1 C 26 7 26 13 22 17 L 6 5 L 10 29 L 4 25 L 0 39 L -4 25 L -10 29 L -6 5 L -22 17 C -26 13 -26 7 -24 1 L -40 3 C -40 -3 -36 -9 -30 -13 L -38 -19 C -32 -25 -24 -27 -16 -25 L -19 -37 C -15 -37 -11 -35 -7 -31 Z`
  });
  add('nature', 'oakleaf', 'Oak Leaf', {
    fill: () => `M 0 -44 C 8 -42 12 -34 8 -28 C 16 -30 22 -22 16 -16 C 24 -16 28 -8 22 -2 C 30 0 30 10 22 12 C 26 18 22 26 14 24 C 16 32 8 36 2 32 L 2 38 L -2 38 L -2 32 C -8 36 -16 32 -14 24 C -22 26 -26 18 -22 12 C -30 10 -30 0 -22 -2 C -28 -8 -24 -16 -16 -16 C -22 -22 -16 -30 -8 -28 C -12 -34 -8 -42 0 -44 Z M -0.9 -36 L 0.9 -36 L 0.9 28 L -0.9 28 Z`
  });
  add('nature', 'pine', 'Pine Tree', {
    fill: () => `M 0 -45 L 16 -20 L 8 -20 L 23 3 L 13 3 L 27 25 L 4 25 L 4 38 L -4 38 L -4 25 L -27 25 L -13 3 L -23 3 L -8 -20 L -16 -20 Z`
  });
  add('nature', 'palm', 'Palm Tree', {
    fill: () => `M -1 42 C -3 22 -1 2 4 -14 L 10 -12 C 6 2 6 22 8 42 Z` +
      `M 7 -14 C -4 -25 -18 -27 -30 -20 C -18 -29 -2 -30 8 -19 Z M 7 -15 C 1 -29 -9 -37 -22 -38 C -8 -41 5 -33 10 -18 Z M 8 -16 C 10 -30 18 -40 30 -43 C 20 -35 15 -25 14 -13 Z M 9 -14 C 20 -22 33 -23 43 -17 C 32 -25 17 -25 8 -18 Z M 8 -13 C 18 -8 30 -8 40 -13 C 31 -3 16 -2 7 -9 Z`
  });
  add('nature', 'mountains', 'Mountains', {
    fill: () => `M -46 28 L -17 -25 L -4 0 L 13 -35 L 46 28 Z M -17 -19 L -11 -8 L -14 -4 L -18 -10 L -22 -8 Z M 13 -28 L 20 -14 L 15 -10 L 11 -17 L 6 -14 Z`
  });
  add('nature', 'snowflake', 'Snowflake', { stroke: () => G.snowflake(45, 6), strokeW: 4.5 });
  add('nature', 'paw', 'Paw Print', {
    fill: () => `M 0 4 C 11 4 19 11 19 20 C 19 28 11 33 0 33 C -11 33 -19 28 -19 20 C -19 11 -11 4 0 4 Z` +
      [[-19, -8, -14], [-7, -16, -4], [7, -16, 4], [19, -8, 14]].map(([x, y, rot]) =>
        T('M -6 -9 C -2.5 -12 2.5 -12 6 -9 C 9 -5 9 4 6 8 C 2.5 11 -2.5 11 -6 8 C -9 4 -9 -5 -6 -9 Z', { rot, dx: x, dy: y, sx: 0.9, sy: 0.9 })).join(' ')
  });
  add('nature', 'horseshoe', 'Horseshoe', {
    fill: () => {
      let d = G.arcBand(31, 13, -131, 131);
      for (const a of [-105, -63, -21, 21, 63, 105]) { const p = G.polar(a, 31); d += ' ' + G.circlePath(2.6, p.x, p.y); }
      return d;
    }
  });
  add('nature', 'fish', 'Fish', {
    fill: () => `M -36 0 C -22 -15 -5 -19 10 -14 C 18 -19 27 -21 34 -19 C 30 -12 30 -6 31 0 C 30 6 30 12 34 19 C 27 21 18 19 10 14 C -5 19 -22 15 -36 0 Z M -27 -5 a 2.8 2.8 0 1 0 5.6 0 a 2.8 2.8 0 1 0 -5.6 0 Z`
  });
  add('nature', 'shamrock', 'Shamrock', {
    fill: () => [0, 120, 240].map(a => T(G.heartPath(36), { rot: a, dx: G.polar(a, -16).x, dy: G.polar(a, -16).y })).join(' ') +
      ' M -1 4 C 1 14 1 24 -3 33 L 3.5 35 C 7.5 25 7 13 4.5 3 Z'
  });
  add('nature', 'clover4', 'Four-leaf Clover', {
    fill: () => [45, 135, 225, 315].map(a => T(G.heartPath(32), { rot: a, dx: G.polar(a, -14).x, dy: G.polar(a, -14).y })).join(' ') +
      ' M -1 6 C 1 16 1 24 -3 33 L 3.5 35 C 7.5 25 7 13 4.5 5 Z'
  });
  add('nature', 'bear', 'Bear Paw Slash', {
    fill: () => `M 0 4 C 11 4 19 11 19 20 C 19 28 11 33 0 33 C -11 33 -19 28 -19 20 C -19 11 -11 4 0 4 Z` +
      [[-19, -8, -14], [-7, -16, -4], [7, -16, 4], [19, -8, 14]].map(([x, y, rot]) =>
        T('M -5 -10 C -2 -13 2 -13 5 -10 L 3 6 L -3 6 Z', { rot, dx: x, dy: y })).join(' ')
  });

  /* ============ Nautical & Aviation ============ */
  add('nautical', 'anchor', 'Anchor', {
    fill: () => G.ringPath(7, 3.8, 0, -38) + ' M -17 -28 L 17 -28 L 17 -23 L -17 -23 Z M -3 -23 L 3 -23 L 3 30 L -3 30 Z' +
      ' M -1 31 C -14 29 -24 19 -26 7 L -35 10 L -27 -3 L -21.5 5 C -19 13.6 -11 20.6 -1 22.6 Z' +
      ' M 1 31 C 14 29 24 19 26 7 L 35 10 L 27 -3 L 21.5 5 C 19 13.6 11 20.6 1 22.6 Z' +
      ' M -4 30 L 0 37 L 4 30 Z'
  });
  add('nautical', 'shipwheel', 'Ship Wheel', {
    fill: () => {
      let d = G.ringPath(34, 24) + ' ' + G.ringPath(9, 5) + ' ';
      for (let i = 0; i < 8; i++) {
        d += T('M -2.4 -9.4 L 2.4 -9.4 L 2.4 -24.2 L -2.4 -24.2 Z', { rot: i * 45 }) + ' ';
        const p = G.polar(i * 45, 41);
        d += G.circlePath(4, p.x, p.y) + ' ' + T('M -2 -34.2 L 2 -34.2 L 2 -38 L -2 -38 Z', { rot: i * 45 }) + ' ';
      }
      return d;
    }
  });
  add('nautical', 'sailboat', 'Sailboat', {
    fill: () => `M -30 24 L 30 24 L 22 34 L -22 34 Z M 0 -40 L 2 -40 L 2 24 L 0 24 Z
      M 4 -38 C 20 -20 24 -4 22 20 L 4 20 Z M -2 -30 C -14 -16 -18 -2 -16 20 L -2 20 Z`
  });
  add('nautical', 'fishhook', 'Fish Hook', {
    stroke: () => `M 2 -40 L 2 8 A 15 15 0 1 0 -28 8 M -28 8 L -32 0` + ' ' + G.circlePath(4, 2, -44),
    strokeW: 5
  });
  add('nautical', 'trident', 'Trident', {
    fill: () => `M -3 -10 L -3 -32 L 0 -42 L 3 -32 L 3 -10 Z
      M -15 -9 C -19 -18 -19 -28 -15 -36 L -10.6 -34 C -13.8 -27 -13.8 -18 -10.2 -11 Z
      M 15 -9 C 19 -18 19 -28 15 -36 L 10.6 -34 C 13.8 -27 13.8 -18 10.2 -11 Z
      M -15 -9 L 15 -9 L 15 -4 L -15 -4 Z M -2.8 -4 L 2.8 -4 L 2.8 42 L -2.8 42 Z M -6 44 L 0 38 L 6 44 L 0 47 Z`
  });
  add('nautical', 'propeller', 'Propeller', {
    fill: () => [0, 120, 240].map(a =>
      T('M 0 -7.5 C 9 -12 13 -27 8 -38 C 3 -44 -6 -42 -8 -32 C -9 -21 -6 -12 0 -7.5 Z', { rot: a })).join(' ') + ' ' + G.circlePath(6)
  });
  add('nautical', 'lifering', 'Life Ring', {
    fill: () => G.ringPath(40, 22) + ' ' + [45, 135, 225, 315].map(a => T('M -7 -40 L 7 -40 L 5 -23 L -5 -23 Z', { rot: a })).join(' '),
    fillRule: 'nonzero'
  });

  /* ============ Tools & Trade ============ */
  add('tools', 'gear', 'Gear', { fill: () => G.gearPath(10, 45, 20, 34) });
  add('tools', 'wrench', 'Wrench', {
    fill: () => `M -10 -44 C -16 -40 -18 -31 -14 -25 L -5 -21 L -5 27 C -5 31 -3 33 0 33 C 3 33 5 31 5 27 L 5 -21 L 14 -25 C 18 -31 16 -40 10 -44 L 10 -33 L 0 -29 L -10 -33 Z`
  });
  add('tools', 'hammer', 'Hammer', {
    fill: () => T('M -20 -38 L 14 -38 L 14 -24 L -20 -24 Z M 14 -37 C 20 -36 24 -32 25 -26 L 14 -25 Z M -3 -24 L 3 -24 L 5.5 40 L -5.5 40 Z', { rot: 12 })
  });
  add('tools', 'bookopen', 'Open Book', {
    fill: () => `M 0 -18 C -10 -25 -26 -27 -41 -25 L -41 22 C -26 20 -10 22 0 29 C 10 22 26 20 41 22 L 41 -25 C 26 -27 10 -25 0 -18 Z M -1 -17 L 1 -17 L 1 28 L -1 28 Z
      M -34 -17 L -8 -14 L -8 -11 L -34 -14 Z M -34 -8 L -8 -5 L -8 -2 L -34 -5 Z M 8 -14 L 34 -17 L 34 -14 L 8 -11 Z M 8 -5 L 34 -8 L 34 -5 L 8 -2 Z`
  });
  add('tools', 'gradcap', 'Graduation Cap', {
    fill: () => `M 0 -35 L 40 -22 L 0 -9 L -40 -22 Z M -17 -13 L -17 0 C -17 6 17 6 17 0 L 17 -13 L 0 -7.5 Z M 38 -20 L 40 -20 L 40 4 L 38 4 Z` + ' ' + G.circlePath(3.6, 39, 8)
  });
  add('tools', 'scroll', 'Scroll', {
    fill: () => `M -28 -34 L 28 -34 C 32 -34 34 -31 34 -27 C 34 -23 32 -20 28 -20 L -28 -20 C -32 -20 -34 -23 -34 -27 C -34 -31 -32 -34 -28 -34 Z
      M -26 -20 L 26 -20 L 26 20 L -26 20 Z
      M -28 20 L 28 20 C 32 20 34 23 34 27 C 34 31 32 34 28 34 L -28 34 C -32 34 -34 31 -34 27 C -34 23 -32 20 -28 20 Z
      M -18 -12 L 18 -12 L 18 -9 L -18 -9 Z M -18 -3 L 18 -3 L 18 0 L -18 0 Z M -18 6 L 18 6 L 18 9 L -18 9 Z`
  });
  add('tools', 'hourglass', 'Hourglass', {
    fill: () => `M -20 -38 L 20 -38 L 20 -32 L -20 -32 Z M -20 32 L 20 32 L 20 38 L -20 38 Z
      M -16 -32 C -16 -18 -6 -11 -2 -4 L -2 4 C -6 11 -16 18 -16 32 L 16 32 C 16 18 6 11 2 4 L 2 -4 C 6 -11 16 -18 16 -32 Z`
  });
  add('tools', 'clock', 'Clock', {
    fill: () => {
      let d = '';
      for (let i = 0; i < 12; i++) d += T('M -1.8 -33 L 1.8 -33 L 1.8 -28 L -1.8 -28 Z', { rot: i * 30 }) + ' ';
      d += 'M -2.2 -5 L 2.2 -5 L 2.2 -24 L -2.2 -24 Z ' + T('M -2.2 5 L 2.2 5 L 2.2 -15 L -2.2 -15 Z', { rot: 118 }) + ' ' + G.circlePath(3.6);
      return d;
    },
    stroke: () => G.circlePath(40), strokeW: 5
  });
  add('tools', 'bell', 'Bell', {
    fill: () => `M 0 -36 C 2.6 -36 4 -34 4 -31.6 C 15 -28 20 -16 20 -4 C 20 6 22 11 26 15 L -26 15 C -22 11 -20 6 -20 -4 C -20 -16 -15 -28 -4 -31.6 C -4 -34 -2.6 -36 0 -36 Z
      M -26 18 L 26 18 L 26 23 L -26 23 Z` + ' ' + G.circlePath(5, 0, 28)
  });
  add('tools', 'mic', 'Microphone', {
    fill: () => `M -10 -40 C -10 -47 10 -47 10 -40 L 10 -12 C 10 -5 -10 -5 -10 -12 Z M -7 -33 L 7 -33 L 7 -30 L -7 -30 Z M -7 -26 L 7 -26 L 7 -23 L -7 -23 Z M -2 3 L 2 3 L 2 26 L -2 26 Z M -13 26 L 13 26 L 13 31 L -13 31 Z`,
    stroke: () => `M -16 -14 C -16 -2 16 -2 16 -14`, strokeW: 4.5
  });
  add('tools', 'headphones', 'Headphones', {
    fill: () => `M -37 2 L -24 2 L -24 28 L -37 28 Z M 24 2 L 37 2 L 37 28 L 24 28 Z`,
    stroke: () => `M -30 8 C -30 -34 30 -34 30 8`, strokeW: 6
  });

  /* ============ Science & Tech ============ */
  const ellipsePath = (rx, ry, rot) => {
    const k = 0.5523;
    return T(`M ${-rx} 0 C ${-rx} ${-ry * k} ${-rx * k} ${-ry} 0 ${-ry} C ${rx * k} ${-ry} ${rx} ${-ry * k} ${rx} 0 C ${rx} ${ry * k} ${rx * k} ${ry} 0 ${ry} C ${-rx * k} ${ry} ${-rx} ${ry * k} ${-rx} 0 Z`, { rot });
  };
  add('scitech', 'atom', 'Atom', {
    fill: () => G.circlePath(5.5),
    stroke: () => ellipsePath(44, 16, 0) + ' ' + ellipsePath(44, 16, 60) + ' ' + ellipsePath(44, 16, 120),
    strokeW: 3.6
  });
  add('scitech', 'dna', 'DNA Helix', {
    stroke: () => {
      let d1 = 'M', d2 = 'M', rungs = '';
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, y = -42 + 84 * t;
        const x1 = Math.sin(t * Math.PI * 3) * 16, x2 = Math.sin(t * Math.PI * 3 + Math.PI) * 16;
        d1 += ` ${CF.util.num(x1)} ${CF.util.num(y)}` + (i < 24 ? ' L' : '');
        d2 += ` ${CF.util.num(x2)} ${CF.util.num(y)}` + (i < 24 ? ' L' : '');
        if (i % 4 === 2) rungs += `M ${CF.util.num(x1)} ${CF.util.num(y)} L ${CF.util.num(x2)} ${CF.util.num(y)} `;
      }
      return d1 + ' ' + d2 + ' ' + rungs;
    }, strokeW: 4
  });
  add('scitech', 'globe', 'Globe', {
    stroke: () => G.circlePath(40) + ' ' + ellipsePath(15, 40, 0) + ' ' + ellipsePath(29, 40, 0) +
      ' ' + ellipsePath(40, 10, 0) + ' M -35 -19 C -18 -26 18 -26 35 -19 M -35 19 C -18 26 18 26 35 19',
    strokeW: 3.4
  });
  add('scitech', 'planet', 'Planet', {
    fill: () => G.circlePath(24),
    stroke: () => ellipsePath(44, 13, -22), strokeW: 4
  });
  add('scitech', 'radiation', 'Radiation', {
    fill: () => [0, 120, 240].map(a => G.arcBand(26, 32, a - 30, a + 30)).join(' ') + ' ' + G.circlePath(7),
  });
  add('scitech', 'biohazard', 'Biohazard', {
    stroke: () => [0, 120, 240].map(a => {
      const c = G.polar(a, 13);
      return G.circlePath(16, c.x, c.y);
    }).join(' ') + ' ' + G.circlePath(7),
    strokeW: 5.5
  });
  add('scitech', 'pill', 'Pill', {
    fill: () => T(`M -21 -10 L 21 -10 C 27 -10 27 10 21 10 L -21 10 C -27 10 -27 -10 -21 -10 Z M -1.4 -11 L 1.4 -11 L 1.4 11 L -1.4 11 Z`, { rot: -35, sx: 1.35, sy: 1.35 })
  });
  add('scitech', 'gamepad', 'Gamepad', {
    fill: () => `M -28 -12 C -42 -12 -47 4 -44 14 C -42 22 -34 23 -28 17 L -21 9 L 21 9 L 28 17 C 34 23 42 22 44 14 C 47 4 42 -12 28 -12 Z
      M -25 -6 L -19 -6 L -19 -2 L -15 -2 L -15 4 L -19 4 L -19 8 L -25 8 L -25 4 L -29 4 L -29 -2 L -25 -2 Z` +
      ' ' + G.circlePath(3.6, 20, -4) + ' ' + G.circlePath(3.6, 28, 2)
  });
  add('scitech', 'lightbulb', 'Light Bulb', {
    fill: () => `M -13 14 L 13 14 L 13 18 L -13 18 Z M -11 21 L 11 21 L 11 25 L -11 25 Z M -9 28 L 9 28 L 9 32 L -9 32 Z M -6 35 L 6 35 L 0 40 Z`,
    stroke: () => `M -13 12 C -20 4 -24 -4 -24 -14 C -24 -28 -13 -38 0 -38 C 13 -38 24 -28 24 -14 C 24 -4 20 4 13 12`,
    strokeW: 5
  });

  /* ============ Sports & Games ============ */
  add('sports', 'target', 'Target', { fill: () => G.circlePath(44) + ' ' + G.circlePath(35) + ' ' + G.circlePath(26) + ' ' + G.circlePath(17) + ' ' + G.circlePath(8) });
  add('sports', 'crosshair', 'Crosshair', {
    fill: () => G.ringPath(34, 28) + ' ' + [0, 90, 180, 270].map(a =>
      T('M -3 -48 L 3 -48 L 3 -38 L -3 -38 Z M -3 -24 L 3 -24 L 3 -14 L -3 -14 Z', { rot: a })).join(' ') + ' ' + G.circlePath(4)
  });
  add('sports', 'arrow', 'Arrow', {
    fill: () => `M -36 -5 L 8 -5 L 8 -16 L 36 0 L 8 16 L 8 5 L -36 5 Z`
  });
  add('sports', 'bowarrow', 'Bow & Arrow', {
    fill: () => `M -34 -1.6 L 16 -1.6 L 16 -6 L 31 0 L 16 6 L 16 1.6 L -34 1.6 Z M -34 -1.6 L -42 -8 L -31 -1.6 Z M -34 1.6 L -42 8 L -31 1.6 Z`,
    stroke: () => `M 6 -37 C 25 -20 25 20 6 37 M 6 -37 L -7 0 L 6 37`, strokeW: 3.6
  });
  add('sports', 'dumbbell', 'Dumbbell', {
    fill: () => `M -20 -3.4 L 20 -3.4 L 20 3.4 L -20 3.4 Z M -27 -15 L -20.8 -15 L -20.8 15 L -27 15 Z M -32 -10 L -27.8 -10 L -27.8 10 L -32 10 Z M 20.8 -15 L 27 -15 L 27 15 L 20.8 15 Z M 27.8 -10 L 32 -10 L 32 10 L 27.8 10 Z`
  });
  add('sports', 'basketball', 'Basketball', {
    stroke: () => G.circlePath(38) + ' M 0 -38 L 0 38 M -38 0 L 38 0 M -14 -35.3 C -3 -20 -3 20 -14 35.3 M 14 -35.3 C 3 -20 3 20 14 35.3',
    strokeW: 3.8
  });
  add('sports', 'football', 'Football', {
    fill: () => `M -36 0 C -22 -22 22 -22 36 0 C 22 22 -22 22 -36 0 Z
      M -12 -1.4 L 12 -1.4 L 12 1.4 L -12 1.4 Z M -9 -6 L -6.6 -6 L -6.6 6 L -9 6 Z M -2.4 -6 L 0 -6 L 0 6 L -2.4 6 Z M 4.2 -6 L 6.6 -6 L 6.6 6 L 4.2 6 Z`
  });
  add('sports', 'baseball', 'Baseball', {
    stroke: () => {
      let ticks = '';
      for (let i = 0; i < 5; i++) {
        const y = -16 + i * 8;
        ticks += `M ${-26 + Math.abs(y) * 0.12} ${y} L ${-19 + Math.abs(y) * 0.12} ${y + 3} `;
        ticks += `M ${26 - Math.abs(y) * 0.12} ${y} L ${19 - Math.abs(y) * 0.12} ${y + 3} `;
      }
      return G.circlePath(37) + ' M -29 -23 C -15 -9 -15 9 -29 23 M 29 -23 C 15 -9 15 9 29 23 ' + ticks;
    }, strokeW: 3.4
  });
  add('sports', 'soccer', 'Soccer Ball', {
    fill: () => G.polygonPath(5, 13, 0),
    stroke: () => {
      let d = G.circlePath(38) + ' ';
      for (let i = 0; i < 5; i++) {
        const a = i * 72;
        const p1 = G.polar(a, 13), p2 = G.polar(a, 30);
        d += `M ${CF.util.num(p1.x)} ${CF.util.num(p1.y)} L ${CF.util.num(p2.x)} ${CF.util.num(p2.y)} `;
        const q1 = G.polar(a + 22, 34), q2 = G.polar(a - 22, 34);
        d += `M ${CF.util.num(p2.x)} ${CF.util.num(p2.y)} L ${CF.util.num(q1.x)} ${CF.util.num(q1.y)} M ${CF.util.num(p2.x)} ${CF.util.num(p2.y)} L ${CF.util.num(q2.x)} ${CF.util.num(q2.y)} `;
      }
      return d;
    }, strokeW: 3.4
  });
  add('sports', 'checkered', 'Checkered Flags', {
    fill: () => {
      const flag = (rot) => {
        let d = T('M -1.5 -40 L 1.5 -40 L 1.5 40 L -1.5 40 Z', { rot }) + ' ' + T(G.circlePath(3, 0, -43), { rot });
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
          if ((r + c) % 2 === 0) {
            const x0 = 2 + c * 8, y0 = -38 + r * 8;
            d += T(`M ${x0} ${y0} L ${x0 + 8} ${y0} L ${x0 + 8} ${y0 + 8} L ${x0} ${y0 + 8} Z`, { rot }) + ' ';
          }
        }
        return d;
      };
      return flag(38) + ' ' + flag(-38);
    }
  });
  add('sports', 'spade', 'Spade', {
    fill: () => `M 0 -35 C 14 -19 27 -11 27 2 C 27 12 16 17 8 10 C 10 18 14 23 18 27 L -18 27 C -14 23 -10 18 -8 10 C -16 17 -27 12 -27 2 C -27 -11 -14 -19 0 -35 Z`
  });
  add('sports', 'heartsuit', 'Heart', { fill: () => G.heartPath(80) });
  add('sports', 'diamondsuit', 'Diamond', {
    fill: () => `M 0 -32 C 8 -20 16 -9 25 0 C 16 9 8 20 0 32 C -8 20 -16 9 -25 0 C -16 -9 -8 -20 0 -32 Z`
  });
  add('sports', 'clubsuit', 'Club', {
    fill: () => G.circlePath(12.5, 0, -17) + ' ' + G.circlePath(12.5, -12, 2) + ' ' + G.circlePath(12.5, 12, 2) +
      ' M 2.8 15.5 C 2.8 21 6 26 10 30 L -10 30 C -6 26 -2.8 21 -2.8 15.5 C -2.8 14 -1 12.5 0 12.5 C 1 12.5 2.8 14 2.8 15.5 Z'
  });
  add('sports', 'dice', 'Dice', {
    fill: () => `M -30 -22 C -30 -27 -27 -30 -22 -30 L 22 -30 C 27 -30 30 -27 30 -22 L 30 22 C 30 27 27 30 22 30 L -22 30 C -27 30 -30 27 -30 22 Z` +
      ' ' + G.circlePath(4.6) + ' ' + G.circlePath(4.6, -15, -15) + ' ' + G.circlePath(4.6, 15, -15) + ' ' + G.circlePath(4.6, -15, 15) + ' ' + G.circlePath(4.6, 15, 15)
  });
  add('sports', 'pokerchip', 'Poker Chip', {
    fill: () => G.ringPath(44, 40) + ' ' + G.dashRing(42, 8, 8, 45) + ' ' + G.ringPath(28, 24)
  });

  /* ============ Skulls & Edge ============ */
  const skullPath = `M 0 -42 C 21 -42 33 -29 33 -12 C 33 -3 29 3 23 7 L 23 18 C 23 22 20 24 16 24 L -16 24 C -20 24 -23 22 -23 18 L -23 7 C -29 3 -33 -3 -33 -12 C -33 -29 -21 -42 0 -42 Z
    M -21 -12 a 8.4 8.4 0 1 0 16.8 0 a 8.4 8.4 0 1 0 -16.8 0 Z
    M 4.2 -12 a 8.4 8.4 0 1 0 16.8 0 a 8.4 8.4 0 1 0 -16.8 0 Z
    M 0 -4 L 4.6 5 L -4.6 5 Z
    M -10.5 13 L -7.5 13 L -7.5 23 L -10.5 23 Z M -4 13 L -1 13 L -1 23 L -4 23 Z M 2.5 13 L 5.5 13 L 5.5 23 L 2.5 23 Z M 9 13 L 12 13 L 12 23 L 9 23 Z`;
  add('edge', 'skull', 'Skull', { fill: () => skullPath });
  add('edge', 'skullbones', 'Skull & Crossbones', {
    fill: () => {
      const bone = (rot) => T(`M -19 -2.6 L 19 -2.6 L 19 2.6 L -19 2.6 Z`, { rot, dy: 30 }) + ' ' +
        [[-23, -5], [-23, 5], [23, -5], [23, 5]].map(([x, y]) => {
          const a = CF.util.deg2rad(rot);
          const rx = x * Math.cos(a) - y * Math.sin(a), ry = x * Math.sin(a) + y * Math.cos(a);
          return G.circlePath(4.6, rx, ry + 30);
        }).join(' ');
      return T(skullPath, { sx: 0.78, sy: 0.78, dy: -14 }) + ' ' + bone(28) + ' ' + bone(-28);
    }
  });
  add('edge', 'flame', 'Flame', {
    fill: () => `M 0 -46 C 10 -28 22 -22 20 -4 C 19 6 14 13 8 17 C 12 6 10 0 2 -6 C -2 2 -8 6 -6 17 C -14 13 -20 2 -18 -10 C -16 -24 -6 -30 0 -46 Z`
  });
  add('edge', 'lightning', 'Lightning Bolt', {
    fill: () => `M 9 -48 L -19 5 L -4 5 L -12 48 L 23 -11 L 6 -11 Z`
  });
  add('edge', 'bomb', 'Bomb', {
    fill: () => G.circlePath(22, -3, 12) + ' ' + T('M -8 -12 L 8 -12 L 8 -4 L -8 -4 Z', { rot: 36, dx: 5, dy: -8 }) +
      ' ' + T(G.starPath(4, 9, 3), { dx: 26, dy: -34 }),
    stroke: () => 'M 12 -18 C 18 -26 18 -30 24 -32', strokeW: 4
  });
  add('edge', 'sworddown', 'Sword', {
    fill: () => `M 0 48 C -2.6 43 -4 38 -4 33 L -4 -22 L 4 -22 L 4 33 C 4 38 2.6 43 0 48 Z
      M -13 -22 L 13 -22 L 13 -27 L 4.2 -27 L 4.2 -38 C 4.2 -41 2.6 -43.6 0 -45.6 C -2.6 -43.6 -4.2 -41 -4.2 -38 L -4.2 -27 L -13 -27 Z` +
      ' ' + G.circlePath(3.4, 0, -47)
  });
  add('edge', 'spartan', 'Spartan Helmet', {
    fill: () => `M -3 -40 C 15 -40 28 -28 29 -10 C 30 8 26 26 16 38 L 6 38 L 6 20 L 13 18 C 15 8 15 -2 12 -8 L 6 -10 L 6 -16 L -10 -16 L -10 38 L -19 38 C -27 24 -30 6 -28 -12 C -26 -30 -15 -40 -3 -40 Z
      M -14 -42 C -1 -52 17 -52 29 -43 L 26 -38 C 15 -46 1 -46 -10 -38 Z`
  });
  add('edge', 'grimscythe', 'Scythe', {
    fill: () => `M -4 -44 C 14 -46 30 -38 36 -24 C 26 -30 12 -32 -2 -30 L -4 -30 Z M -4 -30 L 1 -30 L 5 44 L -1 44 Z`,
    fillRule: 'nonzero'
  });
  add('edge', 'brassknuckles', 'Iron Fist', {
    fill: () => {
      let d = '';
      for (const x of [-27, -9, 9, 27]) d += G.ringPath(8.4, 4.6, x, -8) + ' ';
      d += 'M -33 2 L 33 2 L 30 22 C 18 28 -18 28 -30 22 Z';
      return d;
    }
  });

  /* ============ Ornaments & Dividers ============ */
  add('ornament', 'diamonddivider', 'Diamond Divider', {
    fill: () => `M -32 0 L 0 -5.5 L 32 0 L 0 5.5 Z` + ' ' + G.circlePath(2.6, -40, 0) + ' ' + G.circlePath(2.6, 40, 0)
  });
  add('ornament', 'dottrio', 'Three Dots', { fill: () => G.circlePath(4.5, -16, 0) + ' ' + G.circlePath(4.5) + ' ' + G.circlePath(4.5, 16, 0) });
  add('ornament', 'bardivider', 'Tapered Bar', { fill: () => `M -36 0 L 0 -3.4 L 36 0 L 0 3.4 Z` });
  add('ornament', 'flourish', 'Flourish', {
    stroke: () => `M -34 8 C -38 -8 -22 -14 -12 -6 C 0 4 12 4 20 -4 C 28 -12 24 -24 14 -22 C 8 -20.6 6 -14 10 -10`,
    strokeW: 4.5
  });
  add('ornament', 'quatrefoil', 'Quatrefoil', {
    fill: () => G.circlePath(17, -13, 0) + ' ' + G.circlePath(17, 13, 0) + ' ' + G.circlePath(17, 0, -13) + ' ' + G.circlePath(17, 0, 13),
    fillRule: 'nonzero'
  });
  add('ornament', 'rosette6', 'Rosette', {
    fill: () => {
      let d = '';
      for (let i = 0; i < 6; i++) {
        d += T(`M 0 0 A 19.6 19.6 0 0 1 0 -34 A 19.6 19.6 0 0 1 0 0 Z`, { rot: i * 60 }) + ' ';
      }
      return d + G.ringPath(42, 38);
    }
  });
  add('ornament', 'fleurdivider', 'Fleuron', {
    fill: () => G.dropPath(26) + ' ' + T(G.dropPath(18), { rot: 90, dx: 16, dy: 8 }) + ' ' + T(G.dropPath(18), { rot: -90, dx: -16, dy: 8 })
  });
  add('ornament', 'swirlpair', 'Twin Scrolls', {
    stroke: () => `M 0 10 C -6 2 -16 -2 -26 0 C -36 2 -38 12 -30 14 C -25 15 -22 10 -26 7 M 0 10 C 6 2 16 -2 26 0 C 36 2 38 12 30 14 C 25 15 22 10 26 7`,
    strokeW: 4
  });

  /* ============ Basic Shapes ============ */
  add('shapes', 'circle', 'Circle', { fill: () => G.circlePath(46) });
  add('shapes', 'ringshape', 'Ring', { fill: () => G.ringPath(46, 34) });
  add('shapes', 'triangle', 'Triangle', { fill: () => G.polygonPath(3, 48) });
  add('shapes', 'square', 'Square', { fill: () => `M -40 -40 L 40 -40 L 40 40 L -40 40 Z` });
  add('shapes', 'diamondshape', 'Diamond', { fill: () => G.polygonPath(4, 46) });
  add('shapes', 'pentagon', 'Pentagon', { fill: () => G.polygonPath(5, 46) });
  add('shapes', 'hexagon', 'Hexagon', { fill: () => G.polygonPath(6, 46) });
  add('shapes', 'octagon', 'Octagon', { fill: () => G.polygonPath(8, 46, 22.5) });
  add('shapes', 'heartshape', 'Heart', { fill: () => G.heartPath(88) });
  add('shapes', 'dropshape', 'Drop', { fill: () => G.dropPath(88) });
  add('shapes', 'crescentshape', 'Crescent', { fill: () => G.crescent(44, 0.4, 0.85) });
  add('shapes', 'infinity', 'Infinity', {
    stroke: () => `M 0 0 C -8 -13 -34 -13 -34 0 C -34 13 -8 13 0 0 C 8 -13 34 -13 34 0 C 34 13 8 13 0 0`,
    strokeW: 6.5
  });
  add('shapes', 'eye', 'All-Seeing Eye', {
    fill: () => `M -32 0 C -17 -17 17 -17 32 0 C 17 17 -17 17 -32 0 Z` + ' ' + G.circlePath(10) + ' ' + G.circlePath(4.4)
  });
  add('shapes', 'pyramideye', 'Eye of Providence', {
    fill: () => `M 0 -40 L 41 32 L -41 32 Z M 0 -30.5 L 33.5 28 L -33.5 28 Z` +
      ' M -17 8 C -8 -1 8 -1 17 8 C 8 17 -8 17 -17 8 Z' + ' ' + G.circlePath(5.2, 0, 8) +
      ' ' + (() => {
        let d = '';
        for (let a = -55; a <= 55; a += 18.4) {
          const p1 = G.polar(a, 47, 0, -40), p2 = G.polar(a, 56, 0, -40);
          d += `M ${CF.util.num(p1.x)} ${CF.util.num(p1.y)} L ${CF.util.num(p2.x)} ${CF.util.num(p2.y)} `;
        }
        return d;
      })().split('M ').filter(Boolean).map(s => 'M ' + s).join('')
  });

  /* ---------- registry API ---------- */
  const byId = {};
  defs.forEach(d => { byId[d.id] = d; });
  const cache = {};

  CF.Symbols = {
    categories() {
      return CATS.map(([id, label]) => ({ id, label, items: defs.filter(d => d.cat === id) }));
    },
    all() { return defs; },
    get(id) {
      const d = byId[id];
      if (!d) return null;
      if (!cache[id]) {
        cache[id] = {
          id: d.id, label: d.label, cat: d.cat,
          fill: typeof d.fill === 'function' ? d.fill() : d.fill || null,
          stroke: typeof d.stroke === 'function' ? d.stroke() : d.stroke || null,
          strokeW: d.strokeW, fillRule: d.fillRule
        };
      }
      return cache[id];
    },
    register(cat, id, label, spec) { add(cat, id, label, spec); byId[id] = defs[defs.length - 1]; }
  };
})();