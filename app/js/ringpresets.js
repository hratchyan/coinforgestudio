/* ============================================================
   CoinForge Studio — ringpresets.js
   Curated ring designs. Each preset builds a set of elements
   sized relative to the current coin. Add your own — see
   docs/CUSTOMIZING.md.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const E = () => CF.Elements;

  /* R = coin radius in mm */
  const PRESETS = [
    {
      id: 'stars-border', label: 'Stars & Border',
      desc: 'Double ring with a full circle of stars — the classic challenge-coin frame.',
      build(R) {
        return [
          E().create('ringband', { name: 'Outer ring', style: 'double', radiusMM: R - 1.8, thicknessMM: 1.5 }),
          E().create('symbolring', { name: 'Star ring', symbolId: 'star5', count: 30, radiusMM: R - 4.6, itemSizeMM: R * 0.115, rotateItems: true }),
          E().create('ringband', { name: 'Inner ring', style: 'solid', radiusMM: R - 7.4, thicknessMM: 0.55 }),
        ];
      }
    },
    {
      id: 'classic-text', label: 'Classic Text Ring',
      desc: 'Top and bottom arc text with star separators and an inner frame.',
      build(R) {
        return [
          E().create('ringband', { name: 'Outer ring', style: 'double', radiusMM: R - 1.6, thicknessMM: 1.3 }),
          E().create('arctext', { name: 'Top text', text: 'YOUR TEXT ON TOP', radiusMM: R - 3.4, sizeMM: R * 0.125, side: 'top', letterSpacing: R * 0.016 }),
          E().create('arctext', { name: 'Bottom text', text: 'BOTTOM TEXT', radiusMM: R - 3.4, sizeMM: R * 0.125, side: 'bottom', centerDeg: 180, letterSpacing: R * 0.016 }),
          E().create('symbolring', { name: 'Separators', symbolId: 'star5', count: 2, radiusMM: R - 5.2, itemSizeMM: R * 0.11, startDeg: 90, sweepDeg: 360, rotateItems: false }),
          E().create('ringband', { name: 'Inner ring', style: 'solid', radiusMM: R - 8.2, thicknessMM: 0.5 }),
        ];
      }
    },
    {
      id: 'rope-frame', label: 'Rope Frame',
      desc: 'Nautical rope border with a clean pinstripe inside.',
      build(R) {
        return [
          E().create('ringband', { name: 'Rope', style: 'rope', radiusMM: R - 2.4, thicknessMM: R * 0.1 }),
          E().create('ringband', { name: 'Pinstripe', style: 'solid', radiusMM: R - 5.4, thicknessMM: 0.5 }),
        ];
      }
    },
    {
      id: 'beaded', label: 'Beaded Elegance',
      desc: 'Beaded border like a classic medallion.',
      build(R) {
        return [
          E().create('ringband', { name: 'Beads', style: 'beaded', radiusMM: R - 1.9, thicknessMM: R * 0.075 }),
          E().create('ringband', { name: 'Inner line', style: 'solid', radiusMM: R - 4.6, thicknessMM: 0.45 }),
        ];
      }
    },
    {
      id: 'reeded', label: 'Reeded Coin Edge',
      desc: 'Fine radial reeding, straight off a mint press.',
      build(R) {
        return [
          E().create('ringband', { name: 'Reeding', style: 'reeded', radiusMM: R - 1.9, thicknessMM: 2.6 }),
          E().create('ringband', { name: 'Inner line', style: 'solid', radiusMM: R - 3.9, thicknessMM: 0.5 }),
        ];
      }
    },
    {
      id: 'laurel', label: 'Laurel Honor',
      desc: 'Laurel wreath ring — victory and honor.',
      build(R) {
        return [
          E().create('ringband', { name: 'Outer line', style: 'solid', radiusMM: R - 1.5, thicknessMM: 0.7 }),
          E().create('ringband', { name: 'Laurel wreath', style: 'laurel', radiusMM: R - 5, thicknessMM: R * 0.085 }),
        ];
      }
    },
    {
      id: 'military-stars', label: 'Military Band',
      desc: 'Bold solid band with 13 bare-metal knockout stars.',
      build(R) {
        return [
          E().create('ringband', { name: 'Bold band', style: 'solid', radiusMM: R - 3.2, thicknessMM: R * 0.17 }),
          E().create('symbolring', { name: 'Knockout stars', symbolId: 'star5', count: 13, radiusMM: R - 3.2, itemSizeMM: R * 0.1, shade: 100, rotateItems: true }),
          E().create('ringband', { name: 'Inner pinstripe', style: 'solid', radiusMM: R - 6.6, thicknessMM: 0.4 }),
        ];
      }
    },
    {
      id: 'text-band', label: 'Text on Band',
      desc: 'Marked band with bare-metal text knocked out of it.',
      build(R) {
        return [
          E().create('ringband', { name: 'Band', style: 'solid', radiusMM: R - 3.4, thicknessMM: R * 0.21 }),
          E().create('arctext', { name: 'Top knockout text', text: 'YOUR TEXT HERE', radiusMM: R - 1.9, sizeMM: R * 0.115, side: 'top', shade: 100, letterSpacing: R * 0.02 }),
          E().create('arctext', { name: 'Bottom knockout text', text: 'AND DOWN HERE', radiusMM: R - 1.9, sizeMM: R * 0.115, side: 'bottom', centerDeg: 180, shade: 100, letterSpacing: R * 0.02 }),
          E().create('symbolring', { name: 'Separators', symbolId: 'star5', count: 2, radiusMM: R - 3.4, itemSizeMM: R * 0.08, startDeg: 90, shade: 100, rotateItems: false }),
        ];
      }
    },
    {
      id: 'sunburst', label: 'Sunburst Backdrop',
      desc: 'Radiating burst behind your center art plus a thin frame.',
      build(R) {
        return [
          E().create('shape', { name: 'Sunburst', kind: 'burst', params: { rays: 36, innerPct: 42, duty: 46 }, sizeMM: (R - 4) * 2, shade: 55 }),
          E().create('ringband', { name: 'Frame', style: 'double', radiusMM: R - 2, thicknessMM: 1.4 }),
        ];
      }
    },
    {
      id: 'chain', label: 'Chain Link',
      desc: 'Interlocked chain border — brotherhood and strength.',
      build(R) {
        return [
          E().create('ringband', { name: 'Chain', style: 'chain', radiusMM: R - 2.6, thicknessMM: R * 0.09 }),
          E().create('ringband', { name: 'Inner line', style: 'solid', radiusMM: R - 5.6, thicknessMM: 0.5 }),
        ];
      }
    },
    {
      id: 'scallop', label: 'Scalloped Antique',
      desc: 'Wavy scalloped edge with beaded inner accent.',
      build(R) {
        return [
          E().create('ringband', { name: 'Scallop', style: 'scallop', radiusMM: R - 2.2, thicknessMM: R * 0.08 }),
          E().create('ringband', { name: 'Beads', style: 'beaded', radiusMM: R - 5.8, thicknessMM: R * 0.045 }),
        ];
      }
    },
    {
      id: 'minimal', label: 'Minimal Pinstripes',
      desc: 'Two clean pinstripe rings. Modern and quiet.',
      build(R) {
        return [
          E().create('ringband', { name: 'Outer pinstripe', style: 'double', radiusMM: R - 1.6, thicknessMM: 1.1 }),
          E().create('ringband', { name: 'Inner pinstripe', style: 'solid', radiusMM: R - 6.5, thicknessMM: 0.4 }),
        ];
      }
    },
    {
      id: 'dotted', label: 'Dotted Orbit',
      desc: 'Dashed ring segments with dot accents.',
      build(R) {
        return [
          E().create('ringband', { name: 'Dashes', style: 'dashed', radiusMM: R - 2.2, thicknessMM: R * 0.05 }),
          E().create('symbolring', { name: 'Dots', symbolId: 'circle', count: 16, radiusMM: R - 5, itemSizeMM: R * 0.035 }),
        ];
      }
    },
  ];

  CF.RingPresets = {
    all: () => PRESETS,
    get: (id) => PRESETS.find(p => p.id === id),
    /* applies to current doc, sized to coin */
    apply(id) {
      const p = this.get(id);
      if (!p) return;
      const R = CF.store.doc.coin.diameterMM / 2;
      const els = p.build(R);
      CF.store.addElements(els);
      CF.ui.toast(`Added ring preset: ${p.label}`);
    }
  };
})();