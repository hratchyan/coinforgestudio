/* ============================================================
   CoinForge Studio — templates.js
   Curated full-coin layouts. Every text is a placeholder meant
   to be edited. Sizes scale with the coin diameter.
   Add your own — see docs/CUSTOMIZING.md.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const E = () => CF.Elements;
  const year = String(new Date().getFullYear());

  function doc(name, diameterMM, elements) {
    return {
      version: 1, id: CF.util.uid(), name, author: CF.AUTHOR,
      coin: { diameterMM, marginMM: 2 }, dpi: 1016, elements
    };
  }

  /* card/tag templates carry their own substrate (fixed real-world sizes) */
  function cardDoc(name, wMM, hMM, cornerRMM, elements) {
    return {
      version: 3, id: CF.util.uid(), name, author: CF.AUTHOR,
      substrate: { kind: cornerRMM > 0 ? 'rounded' : 'rect', wMM, hMM, cornerRMM, marginMM: 4 },
      dpi: 1016, elements
    };
  }

  function tokenDoc(name, shape, wMM, hMM, elements) {
    return {
      version: 3, id: CF.util.uid(), name, author: CF.AUTHOR,
      substrate: { kind: 'shape', shape, wMM, hMM, marginMM: 3 },
      dpi: 1016, elements
    };
  }

  function stampDoc(name, sub, elements) {
    return {
      version: 3, id: CF.util.uid(), name, author: CF.AUTHOR,
      substrate: sub, material: 'rubber', dpi: 1016, elements
    };
  }

  const ring = (id, R) => CF.RingPresets.get(id).build(R);

  const TEMPLATES = [
    {
      id: 'veteran-eagle', label: 'Veteran Eagle', cat: 'Military',
      desc: 'Eagle head in a ring of 30 stars — the classic.',
      build(D) {
        const R = D / 2;
        return doc('Veteran Eagle', D, [
          ...ring('stars-border', R),
          E().create('symbol', { name: 'Eagle', symbolId: 'eaglehead', sizeMM: R * 1.06 }),
        ]);
      }
    },
    {
      id: 'eagle-honor', label: 'Eagle & Honor Text', cat: 'Military',
      desc: 'Eagle center with top/bottom arc text and star separators.',
      build(D) {
        const R = D / 2;
        return doc('Eagle & Honor', D, [
          ...ring('classic-text', R).map(e => {
            if (e.name === 'Top text') e.text = 'UNITED STATES VETERAN';
            if (e.name === 'Bottom text') e.text = 'HONOR · COURAGE · SACRIFICE';
            if (e.type === 'arctext') { e.sizeMM = R * 0.105; e.letterSpacing = R * 0.012; }
            return e;
          }),
          E().create('symbol', { name: 'Eagle', symbolId: 'eaglespread', sizeMM: R * 0.92, y: R * 0.02 }),
        ]);
      }
    },
    {
      id: 'police', label: 'Police Department', cat: 'Service',
      desc: 'Sheriff star with department text band.',
      build(D) {
        const R = D / 2;
        return doc('Police Department', D, [
          ...ring('text-band', R).map(e => {
            if (e.name === 'Top knockout text') e.text = 'CITY POLICE DEPARTMENT';
            if (e.name === 'Bottom knockout text') e.text = 'TO PROTECT AND SERVE';
            return e;
          }),
          E().create('symbol', { name: 'Badge', symbolId: 'badge7', sizeMM: R * 0.94 }),
        ]);
      }
    },
    {
      id: 'fire', label: 'Fire Department', cat: 'Service',
      desc: 'Fire maltese cross with station number.',
      build(D) {
        const R = D / 2;
        return doc('Fire Department', D, [
          ...ring('classic-text', R).map(e => {
            if (e.name === 'Top text') e.text = 'CITY FIRE DEPARTMENT';
            if (e.name === 'Bottom text') e.text = 'STATION 1 · EST. ' + year;
            return e;
          }),
          E().create('symbol', { name: 'Maltese', symbolId: 'maltesedisc', sizeMM: R * 0.9 }),
        ]);
      }
    },
    {
      id: 'ems', label: 'EMS / Medical', cat: 'Service',
      desc: 'Star of Life with service motto.',
      build(D) {
        const R = D / 2;
        return doc('EMS', D, [
          ...ring('classic-text', R).map(e => {
            if (e.name === 'Top text') e.text = 'EMERGENCY MEDICAL SERVICES';
            if (e.name === 'Bottom text') e.text = 'SO OTHERS MAY LIVE';
            if (e.type === 'arctext') { e.sizeMM = R * 0.105; e.letterSpacing = R * 0.012; }
            return e;
          }),
          E().create('symbol', { name: 'Star of Life', symbolId: 'starlife', sizeMM: R * 0.84 }),
        ]);
      }
    },
    {
      id: 'army-band', label: 'Military Band', cat: 'Military',
      desc: 'Bold knockout-star band with a center star.',
      build(D) {
        const R = D / 2;
        return doc('Military Band', D, [
          ...ring('military-stars', R),
          E().create('symbol', { name: 'Center star', symbolId: 'star5', sizeMM: R * 0.62 }),
          E().create('arctext', { name: 'Unit', text: 'FIRST BATTALION', radiusMM: R * 0.5, sizeMM: R * 0.085, side: 'bottom', centerDeg: 180, lockCenter: false, y: 0 }),
        ]);
      }
    },
    {
      id: 'family-crest', label: 'Family Crest', cat: 'Heraldry',
      desc: 'Shield, laurel wreath, crown, and a motto banner.',
      build(D) {
        const R = D / 2;
        return doc('Family Crest', D, [
          E().create('ringband', { name: 'Outer ring', style: 'double', radiusMM: R - 1.7, thicknessMM: 1.3 }),
          E().create('ringband', { name: 'Laurel', style: 'laurel', radiusMM: R - 4.6, thicknessMM: R * 0.075 }),
          E().create('symbol', { name: 'Shield', symbolId: 'shieldheater', sizeMM: R * 0.78, y: R * 0.02 }),
          E().create('symbol', { name: 'Crown', symbolId: 'crownpoints', sizeMM: R * 0.3, y: -R * 0.52 }),
          E().create('banner', { name: 'Motto', text: 'FAMILY NAME', wMM: R * 1.16, hMM: R * 0.15, sizeMM: R * 0.1, curveDeg: 46, y: R * 0.62 }),
        ]);
      }
    },
    {
      id: 'anniversary', label: 'Anniversary', cat: 'Occasions',
      desc: 'Hearts and script names with a date banner.',
      build(D) {
        const R = D / 2;
        return doc('Anniversary', D, [
          ...ring('beaded', R),
          E().create('symbol', { name: 'Heart', symbolId: 'heartsuit', sizeMM: R * 0.7, shade: 25, y: -R * 0.1 }),
          E().create('text', { name: 'Names', text: 'Ana & Aram', font: CF.Fonts.defaultScript(), weight: 400, sizeMM: R * 0.21, y: -R * 0.08 }),
          E().create('arctext', { name: 'Occasion', text: '25TH WEDDING ANNIVERSARY', radiusMM: R - 4.2, sizeMM: R * 0.115, side: 'top' }),
          E().create('banner', { name: 'Date', text: 'JUNE 14 · ' + year, wMM: R * 1.05, hMM: R * 0.15, sizeMM: R * 0.09, curveDeg: 42, y: R * 0.52 }),
        ]);
      }
    },
    {
      id: 'wedding', label: 'Wedding Rings', cat: 'Occasions',
      desc: 'Interlocked rings with script and date.',
      build(D) {
        const R = D / 2;
        return doc('Wedding', D, [
          ...ring('minimal', R),
          E().create('shape', { name: 'Ring A', kind: 'ring', params: { thickPct: 14 }, sizeMM: R * 0.5, x: -R * 0.13, y: -R * 0.12 }),
          E().create('shape', { name: 'Ring B', kind: 'ring', params: { thickPct: 14 }, sizeMM: R * 0.5, x: R * 0.13, y: -R * 0.12, shade: 30 }),
          E().create('text', { name: 'Names', text: 'Forever & Always', font: CF.Fonts.defaultScript(), weight: 400, sizeMM: R * 0.17, y: R * 0.28 }),
          E().create('arctext', { name: 'Date', text: 'SAVE THE DATE · ' + year, radiusMM: R - 4, sizeMM: R * 0.1, side: 'bottom', centerDeg: 180 }),
        ]);
      }
    },
    {
      id: 'graduation', label: 'Graduation', cat: 'Occasions',
      desc: 'Cap, laurel and class year.',
      build(D) {
        const R = D / 2;
        return doc('Graduation', D, [
          ...ring('laurel', R),
          E().create('symbol', { name: 'Cap', symbolId: 'gradcap', sizeMM: R * 0.66, y: -R * 0.18 }),
          E().create('text', { name: 'Class of', text: 'CLASS OF', font: CF.Fonts.default(), weight: 700, sizeMM: R * 0.13, y: R * 0.22 }),
          E().create('text', { name: 'Year', text: year, font: CF.Fonts.default(), weight: 900, sizeMM: R * 0.3, y: R * 0.46 }),
        ]);
      }
    },
    {
      id: 'memorial', label: 'Memorial', cat: 'Occasions',
      desc: 'Dove with remembrance text.',
      build(D) {
        const R = D / 2;
        return doc('Memorial', D, [
          ...ring('beaded', R),
          E().create('arctext', { name: 'Top', text: 'IN LOVING MEMORY', radiusMM: R - 4, sizeMM: R * 0.12, side: 'top', letterSpacing: R * 0.02 }),
          E().create('symbol', { name: 'Dove', symbolId: 'dove', sizeMM: R * 0.62, y: -R * 0.06 }),
          E().create('text', { name: 'Name', text: 'FULL NAME', font: CF.Fonts.default(), weight: 700, sizeMM: R * 0.13, y: R * 0.32 }),
          E().create('text', { name: 'Dates', text: '1950 – ' + year, sizeMM: R * 0.1, y: R * 0.52, weight: 400 }),
        ]);
      }
    },
    {
      id: 'biker', label: 'Biker Skull', cat: 'Clubs',
      desc: 'Skull & crossbones in a rope frame with a club banner.',
      build(D) {
        const R = D / 2;
        return doc('Biker Club', D, [
          ...ring('rope-frame', R),
          E().create('symbol', { name: 'Skull', symbolId: 'skullbones', sizeMM: R * 0.88, y: -R * 0.08 }),
          E().create('banner', { name: 'Club', text: 'RIDE OR DIE', wMM: R * 1.2, hMM: R * 0.16, sizeMM: R * 0.1, curveDeg: 48, y: R * 0.58 }),
        ]);
      }
    },
    {
      id: 'sports', label: 'Sports Club', cat: 'Clubs',
      desc: 'Trophy with champions text and star accents.',
      build(D) {
        const R = D / 2;
        return doc('Sports Club', D, [
          ...ring('classic-text', R).map(e => {
            if (e.name === 'Top text') e.text = 'CITY LEAGUE CHAMPIONS';
            if (e.name === 'Bottom text') e.text = 'SEASON ' + year;
            return e;
          }),
          E().create('symbol', { name: 'Trophy', symbolId: 'trophy', sizeMM: R * 0.78, y: R * 0.02 }),
        ]);
      }
    },
    {
      id: 'corporate', label: 'Corporate / Maker', cat: 'Business',
      desc: 'Gear emblem with company band and established year.',
      build(D) {
        const R = D / 2;
        return doc('Corporate', D, [
          ...ring('text-band', R).map(e => {
            if (e.name === 'Top knockout text') e.text = 'YOUR COMPANY NAME';
            if (e.name === 'Bottom knockout text') e.text = 'QUALITY · CRAFT · PRIDE';
            return e;
          }),
          E().create('symbol', { name: 'Gear', symbolId: 'gear', sizeMM: R * 0.8 }),
          E().create('text', { name: 'Est.', text: 'EST. ' + year, sizeMM: R * 0.09, weight: 700, y: R * 0.5, shade: 0 }),
        ]);
      }
    },
    {
      id: 'liberty', label: 'Liberty Classic', cat: 'Classic',
      desc: 'Torch over glory rays with LIBERTY arc and year.',
      build(D) {
        const R = D / 2;
        return doc('Liberty', D, [
          E().create('ringband', { name: 'Outer ring', style: 'reeded', radiusMM: R - 1.7, thicknessMM: 2.2 }),
          E().create('shape', { name: 'Rays', kind: 'burst', params: { rays: 40, innerPct: 52, duty: 40 }, sizeMM: (R - 4.5) * 2, shade: 62 }),
          E().create('symbol', { name: 'Torch', symbolId: 'torch', sizeMM: R * 0.86, y: R * 0.02 }),
          E().create('arctext', { name: 'Liberty', text: 'LIBERTY', radiusMM: R - 3.6, sizeMM: R * 0.17, side: 'top', letterSpacing: R * 0.08 }),
          E().create('arctext', { name: 'Year', text: '★ ' + year + ' ★', radiusMM: R - 3.6, sizeMM: R * 0.14, side: 'bottom', centerDeg: 180, letterSpacing: R * 0.05 }),
        ]);
      }
    },
    {
      id: 'photo-portrait', label: 'Photo Portrait', cat: 'Classic',
      desc: 'Drop your photo in the middle of a stars ring (use Smart Import).',
      build(D) {
        const R = D / 2;
        return doc('Photo Portrait', D, [
          ...ring('stars-border', R),
          E().create('text', { name: 'Hint (delete me)', text: 'ADD PHOTO\nvia Add → Image', sizeMM: R * 0.12, shade: 55, weight: 400 }),
        ]);
      }
    },
    {
      id: 'minimal-modern', label: 'Minimal Modern', cat: 'Classic',
      desc: 'Bold condensed type, thin rings, lots of air.',
      build(D) {
        const R = D / 2;
        const bebas = CF.Fonts.families().some(f => f.family === 'Bebas Neue') ? 'Bebas Neue' : 'Impact';
        return doc('Minimal Modern', D, [
          ...ring('minimal', R),
          E().create('text', { name: 'Main', text: 'MAKE\nTHINGS', font: bebas, weight: 400, sizeMM: R * 0.34, lineHeight: 0.95 }),
          E().create('text', { name: 'Year', text: '· ' + year + ' ·', sizeMM: R * 0.09, weight: 400, y: R * 0.62, letterSpacing: 1 }),
        ]);
      }
    },
    {
      id: 'card-contact', label: 'Contact Card', cat: 'Cards',
      desc: 'Clean centered business card — name, title, contact lines.',
      build() {
        const W = 85.6, H = 54;
        return cardDoc('Contact Card', W, H, 3.18, [
          E().create('text', { name: 'Name', text: 'ALEX MORGAN', weight: 700, sizeMM: 7, y: -H * 0.22 }),
          E().create('text', { name: 'Title', text: 'Product Designer', sizeMM: 3.6, y: -H * 0.08 }),
          E().create('shape', { name: 'Rule', kind: 'line', params: { thickPct: 4 }, sizeMM: W * 0.55, y: H * 0.02 }),
          E().create('text', { name: 'Phone', text: '+1 (555) 123-4567', sizeMM: 3.2, y: H * 0.15 }),
          E().create('text', { name: 'Email', text: 'alex@example.com', sizeMM: 3.2, y: H * 0.26 }),
          E().create('text', { name: 'Web', text: 'example.com', sizeMM: 3.2, y: H * 0.37 }),
        ]);
      }
    },
    {
      id: 'card-qr', label: 'QR Business Card', cat: 'Cards',
      desc: 'Contact details on the left, scannable QR code on the right.',
      build() {
        const W = 85.6, H = 54;
        return cardDoc('QR Business Card', W, H, 3.18, [
          E().create('text', { name: 'Name', text: 'ALEX MORGAN', weight: 700, sizeMM: 5.6, x: -W * 0.15, y: -H * 0.24 }),
          E().create('text', { name: 'Title', text: 'Product Designer', sizeMM: 3.2, x: -W * 0.15, y: -H * 0.10 }),
          E().create('text', { name: 'Phone', text: '+1 (555) 123-4567', sizeMM: 3, x: -W * 0.15, y: H * 0.10 }),
          E().create('text', { name: 'Email', text: 'alex@example.com', sizeMM: 3, x: -W * 0.15, y: H * 0.22 }),
          E().create('qr', { name: 'QR', text: 'https://example.com', sizeMM: H * 0.52, x: W * 0.29 }),
        ]);
      }
    },
    {
      id: 'card-pettag', label: 'Pet / ID Tag', cat: 'Cards',
      desc: 'Dog-tag blank with a bold name and return info.',
      build() {
        const W = 50.8, H = 28.6;
        return cardDoc('Pet Tag', W, H, 6, [
          E().create('text', { name: 'Name', text: 'LUNA', weight: 700, sizeMM: 8, y: -H * 0.13 }),
          E().create('text', { name: 'Phone', text: 'IF FOUND: +1 (555) 123-4567', sizeMM: 1.9, y: H * 0.24 }),
        ]);
      }
    },
    {
      id: 'token-hex', label: 'Hex Maker Token', cat: 'Tokens',
      desc: 'Workshop hex token — gear center, bold wordmark.',
      build() {
        const W = 38.1, H = 33;
        return tokenDoc('Hex Token', 'hexagon', W, H, [
          E().create('text', { name: 'Top', text: 'MAKER', weight: 700, sizeMM: 4.4, y: -H * 0.3 }),
          E().create('shape', { name: 'Gear', kind: 'gear', params: { teeth: 12, depthPct: 18, holePct: 34 }, sizeMM: H * 0.42, y: 0 }),
          E().create('text', { name: 'Bottom', text: String(new Date().getFullYear()), weight: 700, sizeMM: 4, y: H * 0.32 }),
        ]);
      }
    },
    {
      id: 'token-shield', label: 'Shield Crest', cat: 'Tokens',
      desc: 'Crest blank — initials up top, motto banner below.',
      build() {
        const W = 45, H = 55;
        return tokenDoc('Shield Crest', 'shield', W, H, [
          E().create('text', { name: 'Initials', text: 'HS', weight: 700, sizeMM: 15, y: -H * 0.16 }),
          E().create('shape', { name: 'Divider', kind: 'line', params: { thickPct: 6 }, sizeMM: W * 0.5, y: H * 0.05 }),
          E().create('banner', { name: 'Motto', text: 'FORTITUDO', wMM: W * 0.55, hMM: H * 0.09, sizeMM: H * 0.05, curveDeg: 30, y: H * 0.18 }),
        ]);
      }
    },
    {
      id: 'token-heart', label: 'Heart Keepsake', cat: 'Tokens',
      desc: 'Heart blank — two names and a date.',
      build() {
        const W = 45, H = 40;
        return tokenDoc('Heart Keepsake', 'heart', W, H, [
          E().create('text', { name: 'Names', text: 'A + H', weight: 700, sizeMM: 7, y: -H * 0.12 }),
          E().create('text', { name: 'Date', text: '06 · 12 · ' + String(new Date().getFullYear()), sizeMM: 3, y: H * 0.05 }),
        ]);
      }
    },
    {
      id: 'token-bone', label: 'Bone Pet Tag', cat: 'Tokens',
      desc: 'Classic dog-bone tag — name and phone number.',
      build() {
        const W = 70, H = 22;
        return tokenDoc('Bone Tag', 'bone', W, H, [
          E().create('text', { name: 'Name', text: 'LUNA', weight: 700, sizeMM: 5.5, y: -H * 0.09 }),
          E().create('text', { name: 'Phone', text: '+1 (555) 123-4567', sizeMM: 2.1, y: H * 0.14 }),
        ]);
      }
    },
    {
      id: 'stamp-address', label: 'Address Stamp', cat: 'Stamps',
      desc: 'Three-line return address with a double border — 58 × 22 mm die.',
      build() {
        const W = 58, H = 22;
        return stampDoc('Address Stamp', { kind: 'rect', wMM: W, hMM: H, marginMM: 3 }, [
          E().create('frame', { name: 'Border', wMM: W - 5, hMM: H - 5, thicknessMM: 0.6, cornerRMM: 1.5, style: 'double' }),
          E().create('text', { name: 'Name', text: 'YOUR NAME', weight: 700, sizeMM: 3.6, y: -H * 0.21 }),
          E().create('text', { name: 'Street', text: '123 Main Street', sizeMM: 2.9, y: 0 }),
          E().create('text', { name: 'City', text: 'City, ST 00000', sizeMM: 2.9, y: H * 0.21 }),
        ]);
      }
    },
    {
      id: 'stamp-round', label: 'Round Company Stamp', cat: 'Stamps',
      desc: 'Classic round seal — arc text, star separators, centered line.',
      build() {
        const D = 40, R = D / 2;
        return stampDoc('Round Stamp', { kind: 'circle', diameterMM: D, marginMM: 2 }, [
          E().create('ringband', { name: 'Outer ring', style: 'double', radiusMM: R - 1.6, thicknessMM: 1.1 }),
          E().create('arctext', { name: 'Top text', text: 'YOUR COMPANY NAME', radiusMM: R - 4.6, sizeMM: 2.7, side: 'top', letterSpacing: 0.35 }),
          E().create('arctext', { name: 'Bottom text', text: 'CITY · COUNTRY', radiusMM: R - 4.6, sizeMM: 2.7, side: 'bottom', centerDeg: 180, letterSpacing: 0.35 }),
          E().create('symbolring', { name: 'Separators', symbolId: 'star5', count: 2, radiusMM: R - 5.4, itemSizeMM: 2.2, startDeg: 90, sweepDeg: 360, rotateItems: false }),
          E().create('text', { name: 'Center', text: 'OFFICIAL', weight: 700, sizeMM: 3.4 }),
        ]);
      }
    },
    {
      id: 'stamp-received', label: 'RECEIVED Stamp', cat: 'Stamps',
      desc: 'Office stamp with a date line — 47 × 18 mm die.',
      build() {
        const W = 47, H = 18;
        return stampDoc('Received Stamp', { kind: 'rect', wMM: W, hMM: H, marginMM: 2.5 }, [
          E().create('frame', { name: 'Border', wMM: W - 4, hMM: H - 4, thicknessMM: 0.7, cornerRMM: 1 }),
          E().create('text', { name: 'Label', text: 'RECEIVED', weight: 700, sizeMM: 4.4, y: -H * 0.14 }),
          E().create('text', { name: 'Date line', text: 'DATE: ____________', sizeMM: 2.5, y: H * 0.2 }),
        ]);
      }
    },
  ];

  CF.Templates = {
    all: () => TEMPLATES,
    get: (id) => TEMPLATES.find(t => t.id === id),
    categories() {
      const cats = [];
      for (const t of TEMPLATES) {
        let c = cats.find(x => x.label === t.cat);
        if (!c) { c = { label: t.cat, items: [] }; cats.push(c); }
        c.items.push(t);
      }
      return cats;
    }
  };
})();