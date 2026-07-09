/* ============================================================
   CoinForge Studio — fonts.js
   Bundled OFL fonts (from fonts-data.js, base64) + curated
   Windows system fonts. Bundled faces are registered through
   the FontFace API so canvas can use them offline.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const bundledData = window.CF_FONTS_DATA || [];

  /* label + suggested role for the UI */
  const BUNDLED_META = {
    'Cinzel': 'Classic coin capitals (Trajan style)',
    'Cinzel Decorative': 'Ornate display capitals',
    'EB Garamond': 'Refined serif',
    'Bebas Neue': 'Tall condensed sans',
    'Oswald': 'Sturdy condensed sans',
    'Black Ops One': 'Military stencil',
    'Great Vibes': 'Signature script',
    'Pirata One': 'Blackletter',
    'Rye': 'Western / vintage',
    'Special Elite': 'Typewriter',
  };

  const SYSTEM = [
    'Segoe UI', 'Arial', 'Georgia', 'Times New Roman', 'Palatino Linotype', 'Book Antiqua',
    'Garamond', 'Trebuchet MS', 'Verdana', 'Impact', 'Bahnschrift', 'Gabriola', 'Segoe Script',
    'Segoe Print', 'Courier New', 'Consolas', 'Copperplate Gothic Bold', 'Segoe UI Symbol'
  ];

  const families = [];
  const seen = new Set();
  for (const f of bundledData) {
    if (!seen.has(f.family)) {
      seen.add(f.family);
      families.push({ family: f.family, kind: 'bundled', note: BUNDLED_META[f.family] || '', weights: [] });
    }
    const fam = families.find(x => x.family === f.family);
    if (!fam.weights.includes(f.weight)) fam.weights.push(f.weight);
  }
  families.forEach(f => f.weights.sort((a, b) => a - b));
  for (const s of SYSTEM) {
    if (!seen.has(s)) families.push({ family: s, kind: 'system', note: '', weights: [400, 700] });
  }

  let readyPromise = null;

  CF.Fonts = {
    families() { return families; },

    default() { return seen.has('Cinzel') ? 'Cinzel' : 'Georgia'; },
    defaultScript() { return seen.has('Great Vibes') ? 'Great Vibes' : 'Segoe Script'; },

    weightsFor(family) {
      const f = families.find(x => x.family === family);
      return f ? f.weights : [400, 700];
    },

    css(el, px) {
      const it = el.italic ? 'italic ' : '';
      const w = el.weight || 400;
      return `${it}${w} ${px}px "${el.font || this.default()}", serif`;
    },

    load() {
      if (readyPromise) return readyPromise;
      const jobs = [];
      for (const f of bundledData) {
        try {
          const face = new FontFace(f.family,
            `url(data:font/woff2;base64,${f.b64})`,
            { weight: String(f.weight), style: f.style || 'normal' });
          document.fonts.add(face);
          jobs.push(face.load().catch(e => console.warn('font load failed', f.family, e)));
        } catch (e) { console.warn('FontFace error', f.family, e); }
      }
      readyPromise = Promise.race([
        Promise.allSettled(jobs),
        new Promise(res => setTimeout(res, 4000))
      ]).then(() => { CF.bus.emit('fonts-ready'); });
      return readyPromise;
    }
  };
})();